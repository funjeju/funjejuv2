import { NextRequest } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { matchLocation, JEJU_LOCATIONS } from "@/constants/jeju-locations";
import { findRelevantRestaurants, type ChatRestaurant } from "@/lib/restaurants-for-chat";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { consumeUsage, resolveUser } from "@/lib/usage";
import { buildDialectGrounding } from "@/lib/jeju-dialect";
import type { DominCard, AiSpotCard } from "@/types/chat";

/** 횟수 한도 초과 응답 */
function gatedResponse(message: string, used: number, limit: number): Response {
  return new Response(
    JSON.stringify({ error: message, gated: true, used, limit }),
    { status: 429, headers: { "Content-Type": "application/json" } }
  );
}

const KAKAO_REST_KEY = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY;

// 좌표 → 가장 가까운 region 매핑
function nearestRegion(lat: number, lng: number): { region?: string; label: string; distanceKm: number } {
  let best: { region?: string; label: string; distance: number } | null = null;
  for (const loc of JEJU_LOCATIONS) {
    if (!loc.region) continue; // region 없는 명소 제외
    const dLat = lat - loc.lat;
    const dLng = lng - loc.lng;
    const distance = Math.sqrt(dLat * dLat + dLng * dLng) * 111; // 대략 km
    if (!best || distance < best.distance) {
      best = { region: loc.region, label: loc.keywords[0], distance };
    }
  }
  return best
    ? { region: best.region, label: best.label, distanceKm: best.distance }
    : { label: "제주", distanceKm: 0 };
}

// 제주 바운딩 박스
const JEJU_BBOX = { latMin: 33.10, latMax: 33.65, lngMin: 126.10, lngMax: 127.00 };
function isInJeju(lat: number, lng: number): boolean {
  return (
    lat >= JEJU_BBOX.latMin && lat <= JEJU_BBOX.latMax &&
    lng >= JEJU_BBOX.lngMin && lng <= JEJU_BBOX.lngMax
  );
}

export const runtime = "nodejs";
export const maxDuration = 60;

type Message = { role: "user" | "model"; text: string };

// ── 의도 분석 ────────────────────────────────────────────────
type Intent = {
  region?: string;          // "성산읍", "애월읍" 등
  locationLabel?: string;   // 사용자에게 보여줄 라벨
  menuKeywords: string[];   // 음식 키워드
  nameKeywords: string[];   // 가게 이름 키워드
  wantsFood: boolean;       // 음식점 관련 질문인가
  wantsSpot: boolean;       // 명소·관광지 관련 질문인가
  radiusKm?: number;
  isNearby: boolean;
};

function extractMenuKeywords(text: string): string[] {
  const t = text.toLowerCase();
  const hits: string[] = [];
  const map: Record<string, string[]> = {
    "흑돼지":     ["흑돼지", "돼지고기", "삼겹", "오겹"],
    "갈치":       ["갈치"],
    "고기국수":   ["고기국수", "국수"],
    "해물":       ["해물", "해산물", "회", "조개", "전복"],
    "성게":       ["성게"],
    "한식":       ["한식", "백반", "정식"],
    "카페":       ["카페", "커피", "디저트", "베이커리", "브런치", "빵"],
    "분식":       ["분식", "떡볶이", "김밥"],
    "일식":       ["일식", "초밥", "라멘"],
    "중식":       ["중식", "짜장", "탕수육"],
    "양식":       ["양식", "파스타", "피자", "스테이크"],
    "맛집":       ["맛집", "음식", "식당", "밥", "먹을", "먹을거"],
  };
  for (const [key, kws] of Object.entries(map)) {
    if (kws.some((k) => t.includes(k))) hits.push(key);
  }
  return hits;
}

function extractRadius(text: string): number | null {
  const m = text.match(/(\d{1,3})\s*(km|키로|킬로)/i);
  return m ? Math.min(Number(m[1]), 50) : null;
}

function isNearbyKeyword(text: string): boolean {
  return /내\s*주변|내\s*근처|근처|주변|근방|이근방|여기\s*근방|지금\s*근처/.test(text);
}

function isSpotQuery(text: string): boolean {
  return /관광|명소|볼곳|볼\s*만한|놀곳|놀\s*만한|가볼|일출|일몰|노을|해변|바다|오름|박물관|폭포|섬|올레/.test(text);
}

// ── AI 지명 판별 (등록 키워드로 못 잡은 지명을 Gemini가 region으로 해석) ──
const JEJU_REGIONS = [
  "애월읍", "한림읍", "한경면", "대정읍", "안덕면", "남원읍", "표선면",
  "성산읍", "구좌읍", "조천읍", "우도면", "제주시 동(洞) 지역", "서귀포시 동(洞) 지역",
];

const REGION_SYS = `너는 제주 지명 분석기야. 사용자 메시지에서 제주도 지명(장소·해변·마을·명소·카페·맛집 이름 등)을 찾아 그게 어느 행정구역인지 판단해.

[행정구역 목록 — region은 반드시 이 중 하나]
${JEJU_REGIONS.join(", ")}

[예시]
- 곽지·한담·금성·고내·하귀 → 애월읍
- 금능·협재·옹포 → 한림읍
- 위미·태흥 → 남원읍
- 색달·중문·천제연 → 서귀포시 동(洞) 지역
- 광치기·섭지코지 → 성산읍
- 이호테우·용두암·동문시장 → 제주시 동(洞) 지역

[규칙]
- 지명이 메시지에 전혀 없으면(예: "맛집 추천해줘", "근처 카페") hasPlace=false, region=""
- 지명은 있는데 어느 지역인지 확실하지 않으면 confident=false (그러면 사용자에게 되물을 거야)
- 확실하면 confident=true 로 region을 위 목록에서 정확히 골라`;

const REGION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    hasPlace: { type: Type.BOOLEAN, description: "메시지에 제주 지명이 있는지" },
    placeName: { type: Type.STRING, description: "찾은 지명 (없으면 빈 문자열)" },
    region: { type: Type.STRING, description: "행정구역 (확실할 때만, 아니면 빈 문자열)" },
    confident: { type: Type.BOOLEAN, description: "지역 판단이 확실한지" },
  },
  required: ["hasPlace", "placeName", "region", "confident"],
};

type RegionGuess = { hasPlace: boolean; placeName: string; region?: string; confident: boolean };

async function resolveRegionViaAI(text: string, ai: GoogleGenAI): Promise<RegionGuess> {
  try {
    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: [{ role: "user", parts: [{ text: `메시지: "${text}"` }] }],
      config: {
        systemInstruction: REGION_SYS,
        responseMimeType: "application/json",
        responseSchema: REGION_SCHEMA,
        temperature: 0,
        maxOutputTokens: 200,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    const d = JSON.parse(res.text ?? "{}") as RegionGuess;
    const region = d.region && JEJU_REGIONS.includes(d.region) ? d.region : undefined;
    return { hasPlace: !!d.hasPlace, placeName: d.placeName ?? "", region, confident: !!d.confident };
  } catch {
    return { hasPlace: false, placeName: "", confident: false };
  }
}

/** 지역을 못 정했을 때 사용자에게 되묻는 SSE 응답 */
function askRegionStream(placeName: string): Response {
  const encoder = new TextEncoder();
  const where = placeName ? `'${placeName}'` : "말씀하신 곳";
  const msg = `${where}이(가) 제주 어느 지역인지 잘 모르겠어요 😅 혹시 어느 읍·면(예: 애월, 성산, 중문)인지 알려주시면 거기 맞춰서 딱 찾아드릴게요!`;
  const readable = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: msg })}\n\n`));
      controller.close();
    },
  });
  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

function extractIntent(text: string): Intent {
  let menuKeywords = extractMenuKeywords(text);
  // 구체적 메뉴 키워드가 있으면 제네릭 '맛집'은 제외 (필터 오염 방지 — 흑돼지 질문에 카페가 나오는 문제)
  if (menuKeywords.length > 1 && menuKeywords.includes("맛집")) {
    menuKeywords = menuKeywords.filter((k) => k !== "맛집");
  }
  const matched      = matchLocation(text);
  const radiusKm     = extractRadius(text) ?? undefined;
  const isNearby     = isNearbyKeyword(text);
  const wantsFood    = menuKeywords.length > 0 || /맛집|먹을|음식|식당|카페/.test(text);
  const wantsSpot    = isSpotQuery(text);

  return {
    region:        matched?.region,
    locationLabel: matched?.keywords[0],
    menuKeywords,
    nameKeywords:  [],
    wantsFood,
    wantsSpot:     wantsSpot || !wantsFood, // 음식 키워드 없으면 기본적으로 명소도 포함
    radiusKm,
    isNearby,
  };
}

// ── 거리 계산 (하버사인 근사) ────────────────────────────
function distKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = (lat1 - lat2) * 111;
  const dLng = (lng1 - lng2) * 111 * Math.cos(((lat1 + lat2) / 2) * Math.PI / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

/** 도민맛집 상위 3곳 → 카드. 3개가 안 되면 지역·반경 제한을 풀어서 채움 */
async function buildDominCards(
  intent: Intent,
  primary: ChatRestaurant[],
  gps: { lat: number; lng: number } | null
): Promise<{ cards: DominCard[]; picked: ChatRestaurant[] }> {
  const picked: ChatRestaurant[] = [...primary];

  // 부족하면 지역 제한 없이 메뉴 기준으로 전 제주에서 보충
  if (picked.length < 3) {
    try {
      const wider = await findRelevantRestaurants({
        menuKeywords: intent.menuKeywords,
        userLat: gps?.lat,
        userLng: gps?.lng,
        radiusKm: 100, // 사실상 무제한 — 거리순 정렬만 활용
      });
      for (const r of wider) {
        if (picked.length >= 3) break;
        if (!picked.some((p) => p.id === r.id)) picked.push(r);
      }
    } catch { /* 보충 실패 시 있는 만큼만 */ }
  }

  const top = picked.slice(0, 3);
  const cards = top.map((r) => {
    const lat = typeof r.lat === "number" ? r.lat : undefined;
    const lng = typeof r.lng === "number" ? r.lng : undefined;
    return {
      id: r.id,
      name: r.name,
      region: r.region,
      menu: r.menu,
      thumbnail: r.thumbnail ?? null,
      address: r.address,
      lat,
      lng,
      distanceKm:
        typeof r.distanceKm === "number"
          ? r.distanceKm
          : gps && lat !== undefined && lng !== undefined
            ? distKm(gps.lat, gps.lng, lat, lng)
            : undefined,
    };
  });
  return { cards, picked: top };
}

// ── AI 검색 추천 (구글 검색 그라운딩 + 카카오 좌표 확인) ──
async function searchAiSpots(opts: {
  ai: GoogleGenAI;
  locationLabel?: string;
  menuKeywords: string[];
  gps: { lat: number; lng: number } | null;
  excludeNames: string[];
}): Promise<AiSpotCard[]> {
  const { ai, locationLabel, menuKeywords, gps, excludeNames } = opts;

  const where = locationLabel ? `제주 ${locationLabel} 근처` : "제주";
  const specific = menuKeywords.filter((k) => k !== "맛집");
  // 구체적 메뉴가 있으면 그 메뉴만, 없으면 맛집·카페 전반
  const what = specific.length > 0 ? `${specific.join(", ")} 전문 맛집` : "현지인들에게 인기 있는 맛집·카페";
  const prompt = `${where}에서 ${what} 3곳을 구글 검색으로 찾아줘.
조건: 실제로 영업 중이고 평이 좋은 곳만. 다음 가게는 제외: ${excludeNames.join(", ") || "없음"}.
응답은 다른 말 없이 JSON 배열만:
[{"name":"가게이름","reason":"추천 이유 한 줄 (반말)"}]`;

  const call = (model: string) =>
    ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.5,
        maxOutputTokens: 2048,
      },
    });
  let res;
  try {
    res = await call("gemini-2.5-flash");
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status !== 503 && status !== 429) throw e;
    res = await call("gemini-2.5-flash-lite");
  }

  const text = res.text ?? "";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  let parsed: Array<{ name?: string; reason?: string }>;
  try { parsed = JSON.parse(jsonMatch[0]); } catch { return []; }

  const candidates = parsed
    .filter((p) => p.name)
    .filter((p) => !excludeNames.some((ex) => ex.replace(/\s/g, "") === p.name!.replace(/\s/g, "")))
    .slice(0, 3);

  // 카카오 키워드 검색으로 실존 확인 + 좌표·주소 확보
  const cards: AiSpotCard[] = [];
  for (const c of candidates) {
    const card: AiSpotCard = { name: c.name!, reason: (c.reason ?? "").slice(0, 60) };
    if (KAKAO_REST_KEY) {
      try {
        const r = await fetch(
          `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(`제주 ${c.name}`)}&size=3`,
          { headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` } }
        );
        if (r.ok) {
          const data = (await r.json()) as {
            documents?: Array<{ place_name: string; road_address_name?: string; address_name?: string; x: string; y: string }>;
          };
          const hit = (data.documents ?? []).find((d) => isInJeju(Number(d.y), Number(d.x)));
          if (hit) {
            card.lat = Number(hit.y);
            card.lng = Number(hit.x);
            card.address = hit.road_address_name || hit.address_name;
            if (gps) card.distanceKm = distKm(gps.lat, gps.lng, card.lat, card.lng);
          }
        }
      } catch { /* 좌표 없이 표시 */ }
    }
    cards.push(card);
  }
  return cards;
}

// ── 도민맛집 컨텍스트 빌더 ────────────────────────────────
function buildRestaurantContext(restaurants: ChatRestaurant[]): string {
  if (restaurants.length === 0) return "";
  const lines = restaurants.slice(0, 8).map((r, i) => {
    const meta  = [r.region, r.menu].filter(Boolean).join(" · ");
    const dist  = typeof r.distanceKm === "number" ? ` 📍${r.distanceKm.toFixed(1)}km` : "";
    const addr  = r.address ? ` @${r.address}` : "";
    const tags  = r.options ? ` [${r.options.split(",").slice(0, 3).join(", ")}]` : "";
    const desc  = r.shortDesc ? ` — ${r.shortDesc.replace(/\s+/g, " ").trim()}` : "";
    const phone = r.phone ? ` ☎${r.phone}` : "";
    return `${i + 1}. ${r.name} (${meta})${dist}${addr}${tags}${desc}${phone}`;
  });
  return `[펀제주 인증 도민맛집 — 아래 목록에 있는 음식점만 추천. 거리(📍) 가까운 순 정렬됨]\n${lines.join("\n")}`;
}

// ── 시스템 프롬프트 ─────────────────────────────────────
function buildSystemPrompt(opts: {
  restaurantCtx: string;
  intent: Intent;
  hasGps: boolean;
  gpsInfo: { region?: string; label: string; distanceKm: number } | null;
  gpsOutsideJeju: boolean;
  hasDominCards: boolean;
}): string {
  const { restaurantCtx, intent, hasGps, gpsInfo, gpsOutsideJeju, hasDominCards } = opts;

  // 음식 의도 + 표시되는 맛집 카드가 있으면: 맛집을 무조건 먼저, "없다"고 말하지 말 것
  const foodFirstNote = intent.wantsFood && hasDominCards
    ? `\n[★최우선 규칙] 유저는 "맛집"을 물었고, 화면에는 도민맛집 카드가 이미 표시돼 있어. 그러니:
- 절대 "도민맛집이 없다/없네"라고 말하지 마. (카드가 떠 있는데 없다고 하면 모순이야)
- 답변의 맨 처음을 반드시 도민맛집 안내로 시작해. 관광지·명소는 그 다음(아래)에만.
- 카드의 맛집이 현재 위치에서 멀면 "가까운 곳엔 인증 맛집이 없어서 제주에서 평이 좋은 곳으로 골랐어" 식으로 자연스럽게 안내해.\n`
    : "";

  const locationNote = gpsOutsideJeju
    ? `유저는 현재 제주가 아닌 곳에 있어. "지금 제주 밖에 계시네요!" 한 줄 언급하고 제주 전 지역 대표 명소/맛집 추천해.`
    : gpsInfo
      ? `유저의 현재 GPS 위치는 '${gpsInfo.label}' 부근 (${gpsInfo.region ?? "제주"}). 이 지역 기준으로 추천해.`
      : intent.region
        ? `유저가 '${intent.locationLabel}' 지역을 물어봤어.`
        : hasGps
          ? `유저 위치 좌표는 받았지만 매핑 실패. 제주 전 지역으로 답해.`
          : `위치 정보 없음 — 제주 전 지역 대표 명소·맛집 위주로 답해.`;

  return `너는 제주 여행 AI 도슨트 '돌맹이'야. 제주 돌하르방을 의인화한 친근한 로컬 친구.

[페르소나]
- 친근하지만 너무 가볍지 않은 반말 (예: "~해줄게", "~좋아!", "~추천해!")
- 이모지는 항상 핵심 항목 앞에 1개씩만 (🍽️ 🏞️ 📷 🌅 ☕)
- 짧고 명확한 정보 전달이 우선. 잡담 최소화

[답변 구조 — 반드시 이 형식으로]
1줄 인삿말 (옵션, 가벼운 톤)
↓
🍽️ 음식 질문일 때: 도민맛집 상위 1~3곳은 화면에 사진·거리·지도 버튼이 있는 카드로 자동 표시돼. 그러니 가게 정보를 다시 나열하지 말고, 추천 포인트를 1~2줄로만 짚어줘 (예: "가까운 순으로 도민맛집 3곳 골라봤어! 특히 OO은 웨이팅 있으니 일찍 가").
↓
🏞️ 가볼 만한 곳 (명소·관광지, 2~3곳)
  - {장소이름} · {간단 설명}
  - ...
↓
1줄 마무리 코멘트 (옵션, 짧게)

[데이터 규칙]
1. 음식점·카페를 텍스트에서 언급할 땐: 반드시 아래 [펀제주 인증 도민맛집] 목록에 있는 곳만. 다른 음식점 지어내기 금지.
2. 음식점이 목록에 없으면: "이 지역엔 인증된 도민맛집이 아직 없네!" 하고 명소 추천으로 넘어가.
3. 명소·관광지 추천 시: 너의 일반 지식에서 **제주의 실제 유명한 곳만** 골라서 추천 (한라산, 성산일출봉, 협재해변, 우도, 만장굴, 정방폭포 등). 폐업했거나 모호한 장소는 절대 추천 금지.
4. ${locationNote}
5. 마크다운(#, **, *, -) 쓰지 말고 일반 텍스트. 항목은 "•" 사용.
6. 답변 총 길이는 8줄 이내. 정보 밀도가 핵심.

[금기]
- 의료/법률/투자 조언 금지
- 제주 이외 지역 추천 금지
- 폐업·미인증 가게 추천 금지

${restaurantCtx ? `\n${restaurantCtx}\n` : "\n[펀제주 인증 도민맛집: 해당 지역 등록 없음]\n"}${foodFirstNote}`;
}

// ── 메인 ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: "API 키 미설정" }), { status: 500 });

  // ── 횟수 게이팅: AI 도슨트 챗봇 (하루 한도) ──
  const auth = await verifyFirebaseToken(req.headers.get("authorization"));
  const user = await resolveUser(auth, req.headers.get("x-anon-id"));
  const gate = await consumeUsage({ ...user, feature: "chat" });
  if (!gate.allowed) {
    return gatedResponse(
      "오늘 도슨트 대화 횟수를 모두 사용했어요. 내일 다시 충전돼요.",
      gate.used,
      gate.limit
    );
  }

  const { messages, lat, lng, jejuMode } = (await req.json()) as {
    messages: Message[];
    lat?: number;
    lng?: number;
    jejuMode?: boolean;
  };

  const hasGps = typeof lat === "number" && typeof lng === "number";
  const lastUserText = [...messages].reverse().find((m) => m.role === "user")?.text ?? "";
  const intent = extractIntent(lastUserText);
  const ai = new GoogleGenAI({ apiKey });

  // ── 등록 키워드로 region 못 잡았으면 AI가 지명 판별 (곽지→애월읍 등) ──
  //    "근처/주변" 류가 아니고, 음식·장소 의도가 있을 때만.
  if (!intent.region && !isNearbyKeyword(lastUserText) && (intent.wantsFood || intent.wantsSpot)) {
    const guess = await resolveRegionViaAI(lastUserText, ai);
    if (guess.region) {
      intent.region = guess.region;
      if (guess.placeName) intent.locationLabel = guess.placeName;
    } else if (guess.hasPlace && !guess.confident && !hasGps) {
      // 지명은 있는데 어딘지 모르고 GPS도 없음 → 추측 말고 사용자에게 되묻기
      return askRegionStream(guess.placeName);
    }
  }

  // ★ GPS 좌표 → region 매핑 (제주 안에 있을 때만)
  let gpsInfo: { region?: string; label: string; distanceKm: number } | null = null;
  let gpsOutsideJeju = false;
  if (hasGps) {
    if (isInJeju(lat!, lng!)) {
      if (!intent.region) {
        gpsInfo = nearestRegion(lat!, lng!);
        intent.region = gpsInfo.region;
        intent.locationLabel = gpsInfo.label;
      }
    } else {
      // 제주 밖 → region 매핑 안 함, 모델에게 안내만
      gpsOutsideJeju = true;
    }
  }

  // 도민맛집 조회 — GPS 있으면 거리순 정렬 우선
  let restaurants: ChatRestaurant[] = [];
  if (intent.wantsFood || intent.region) {
    try {
      restaurants = await findRelevantRestaurants({
        region:       intent.region,
        menuKeywords: intent.menuKeywords,
        userLat:      hasGps && !gpsOutsideJeju ? lat : undefined,
        userLng:      hasGps && !gpsOutsideJeju ? lng : undefined,
        radiusKm:     intent.radiusKm,
      });
    } catch (e) {
      console.error("[chat] restaurant query failed:", e);
    }
  }

  const gpsPoint = hasGps && !gpsOutsideJeju ? { lat: lat!, lng: lng! } : null;

  // 도민맛집 카드 (최대 3개, 부족하면 반경 확장해서 채움)
  let dominCards: DominCard[] = [];
  let cardRestaurants: ChatRestaurant[] = []; // 실제 카드로 표시되는 맛집(확장 포함) — 프롬프트 컨텍스트 동기화용
  if (intent.wantsFood) {
    const built = await buildDominCards(intent, restaurants, gpsPoint);
    dominCards = built.cards;
    cardRestaurants = built.picked;
  }

  // AI 검색 추천은 텍스트 스트림과 병렬로 진행 (음식 질문일 때만)
  const aiSpotsPromise: Promise<AiSpotCard[]> = intent.wantsFood
    ? searchAiSpots({
        ai,
        locationLabel: intent.locationLabel,
        menuKeywords: intent.menuKeywords,
        gps: gpsPoint,
        excludeNames: dominCards.map((c) => c.name),
      }).catch((e) => {
        console.error("[chat] AI spot search failed:", e);
        return [];
      })
    : Promise.resolve([]);

  // 프롬프트 컨텍스트는 "실제 카드로 표시되는 맛집"과 일치시킨다.
  // (지역엔 없어 전 제주로 확장한 경우에도 카드가 뜨므로, AI가 "없다"고 모순되게 답하지 않도록)
  const ctxRestaurants = intent.wantsFood && cardRestaurants.length > 0 ? cardRestaurants : restaurants;
  const restaurantCtx = buildRestaurantContext(ctxRestaurants);
  let systemPrompt    = buildSystemPrompt({ restaurantCtx, intent, hasGps, gpsInfo, gpsOutsideJeju, hasDominCards: dominCards.length > 0 });

  // 돌AI 제주어 모드 — 검증된 제주어 사전·예문을 프롬프트에 주입 (가짜 제주어 방지)
  if (jejuMode) {
    try {
      const grounding = await buildDialectGrounding(lastUserText, restaurantCtx);
      systemPrompt = `${grounding}\n\n${systemPrompt}`;
    } catch (e) {
      console.error("[chat] dialect grounding failed:", e);
    }
  }

  console.log("[chat]",
    `gps=${hasGps ? `${lat?.toFixed(4)},${lng?.toFixed(4)}` : "none"}`,
    `inJeju=${hasGps ? isInJeju(lat!, lng!) : "-"}`,
    `region=${intent.region ?? "-"}`,
    `label=${intent.locationLabel ?? "-"}`,
    `menu=${intent.menuKeywords.join(",") || "-"}`,
    `restaurants=${restaurants.length}`,
    `cards=${dominCards.length}`,
    `| ${lastUserText.slice(0, 40)}`
  );

  try {
    const makeStream = (model: string) =>
      ai.models.generateContentStream({
        model,
        contents: messages.map((m) => ({
          role: m.role,
          parts: [{ text: m.text }],
        })),
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
          maxOutputTokens: 1024,
          thinkingConfig: { thinkingBudget: 0 },
        },
      });

    // 과부하(503/429) 시 flash-lite로 폴백
    let stream;
    try {
      stream = await makeStream("gemini-2.5-flash");
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (status !== 503 && status !== 429) throw e;
      stream = await makeStream("gemini-2.5-flash-lite");
    }

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          // 1) 도민맛집 카드 먼저 전송 (즉시 표시)
          if (dominCards.length > 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ domin: dominCards })}\n\n`));
          }
          // 2) 텍스트 스트림
          for await (const chunk of stream) {
            const text = chunk.text;
            if (text) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
          }
          // 3) AI 검색 추천 카드 (병렬 진행분 회수, 최대 15초 대기)
          if (intent.wantsFood) {
            const aiSpots = await Promise.race([
              aiSpotsPromise,
              new Promise<AiSpotCard[]>((r) => setTimeout(() => r([]), 15000)),
            ]);
            if (aiSpots.length > 0) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ aiSpots })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (e) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(e) })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("API key") || msg.includes("403")) {
      return new Response(JSON.stringify({ error: "AI 키 인증 실패" }), { status: 500 });
    }
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
}
