import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { matchLocation, JEJU_LOCATIONS } from "@/constants/jeju-locations";
import { findRelevantRestaurants, type ChatRestaurant } from "@/lib/restaurants-for-chat";

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
export const maxDuration = 30;

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

function extractIntent(text: string): Intent {
  const menuKeywords = extractMenuKeywords(text);
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
}): string {
  const { restaurantCtx, intent, hasGps, gpsInfo, gpsOutsideJeju } = opts;

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
🍽️ 도민맛집 추천 (해당 카테고리 질문일 때만, 1~3곳)
  - {가게이름} · {지역} · {특징 1줄}
  - ...
↓
🏞️ 가볼 만한 곳 (명소·관광지, 2~3곳)
  - {장소이름} · {간단 설명}
  - ...
↓
1줄 마무리 코멘트 (옵션, 짧게)

[데이터 규칙]
1. 음식점·카페 추천 시: 반드시 아래 [펀제주 인증 도민맛집] 목록에 있는 곳만 추천. 다른 음식점 지어내기 금지.
2. 음식점이 목록에 없으면: "이 지역엔 인증된 도민맛집이 아직 없네! 다음에 다시 물어봐줘 😅"
3. 명소·관광지 추천 시: 너의 일반 지식에서 **제주의 실제 유명한 곳만** 골라서 추천 (한라산, 성산일출봉, 협재해변, 우도, 만장굴, 정방폭포 등). 폐업했거나 모호한 장소는 절대 추천 금지.
4. ${locationNote}
5. 마크다운(#, **, *, -) 쓰지 말고 일반 텍스트. 항목은 "•" 사용.
6. 답변 총 길이는 8줄 이내. 정보 밀도가 핵심.

[금기]
- 의료/법률/투자 조언 금지
- 제주 이외 지역 추천 금지
- 폐업·미인증 가게 추천 금지

${restaurantCtx ? `\n${restaurantCtx}\n` : "\n[펀제주 인증 도민맛집: 해당 지역 등록 없음]\n"}`;
}

// ── 메인 ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: "API 키 미설정" }), { status: 500 });

  const { messages, lat, lng } = (await req.json()) as {
    messages: Message[];
    lat?: number;
    lng?: number;
  };

  const hasGps = typeof lat === "number" && typeof lng === "number";
  const lastUserText = [...messages].reverse().find((m) => m.role === "user")?.text ?? "";
  const intent = extractIntent(lastUserText);

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

  const restaurantCtx = buildRestaurantContext(restaurants);
  const systemPrompt  = buildSystemPrompt({ restaurantCtx, intent, hasGps, gpsInfo, gpsOutsideJeju });

  console.log("[chat]",
    `gps=${hasGps ? `${lat?.toFixed(4)},${lng?.toFixed(4)}` : "none"}`,
    `inJeju=${hasGps ? isInJeju(lat!, lng!) : "-"}`,
    `region=${intent.region ?? "-"}`,
    `label=${intent.locationLabel ?? "-"}`,
    `menu=${intent.menuKeywords.join(",") || "-"}`,
    `restaurants=${restaurants.length}`,
    `| ${lastUserText.slice(0, 40)}`
  );

  const ai = new GoogleGenAI({ apiKey });

  try {
    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
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

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.text;
            if (text) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
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
