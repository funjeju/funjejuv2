import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { loadAllRestaurants } from "@/lib/restaurants";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { consumeUsage, resolveUser } from "@/lib/usage";
import { JEJU_LOCATIONS } from "@/constants/jeju-locations";
import { mockCctvs } from "@/constants/mock-cctvs";
import type { Restaurant } from "@/types/restaurant";
import type { TripPlan, TripPlanRequest } from "@/types/trip";

export const runtime = "nodejs";
export const maxDuration = 120;

// ── 1차: 구글 검색 그라운딩으로 일정 초안 생성 ──────────────
const DRAFT_SYSTEM = `너는 제주 여행 전문 플래너 '돌맹이'야. 사용자 프로필에 맞춰 최적 동선의 제주 여행 일정 초안을 짜줘.

[절대 규칙]
1. 점심·저녁 식사 자리는 반드시 아래 제공되는 [도민맛집 리스트]에서만 골라. 선택한 맛집은 반드시 "이름 [ID:식별자]" 형식으로 표기해. (예: 명진전복 [ID:r123])
2. 관광지·카페·액티비티·숙소는 구글 검색을 활용해서 실제 존재하는 인기 장소로 채워. 폐업했거나 존재가 불확실한 곳은 넣지 마.
3. 동선 규칙 (가장 중요): 하루 일정은 그날의 시작점에서 그날의 종착점(그날 묵을 숙소, 마지막 날은 공항)을 향해 한 방향으로만 진행해. 스팟은 시작점과 종착점을 잇는 경로 주변(회랑 반경 약 10km) 안에서만 골라. 종착점 반대 방향으로 갔다가 되돌아오는 왕복·지그재그 동선은 절대 금지. [일자별 동선 앵커]가 주어지면 반드시 그대로 따라.
   ▸ 스팟 간 역행 금지: 연속된 스팟에서 직전 스팟보다 시작점 쪽(역방향)으로 7km 이상 되돌아가는 스팟은 절대 삽입 금지. 식사·카페 찾으러 잠깐 뒤돌아가는 것도 7km 초과는 안 됨.
   ▸ AI 추천 숙소 배치 규칙: 숙소가 미정인 날은 "마지막 관광 스팟 위치"를 먼저 확정한 뒤 → 저녁 식사는 그 스팟에서 8km 이내 → 숙소는 저녁 식사 장소에서 5km 이내. 마지막 관광 스팟에서 15km 이상 떨어진 곳에 숙소를 두는 것은 절대 금지. 숙소를 정하기 위해 마지막 스팟에서 뒤로(시작점 방향으로) 이동하는 것도 금지.
4. 도착/출발 시간을 반영해 첫날과 마지막 날 일정량을 조절해. 첫날은 공항에서 시작, 마지막 날은 공항 도착으로 끝나야 해.
5. 시간대 흐름: 오전 가벼운 일정 → 점심 → 오후 활동 → 저녁 식사 → 노을/야경.
6. 각 스팟마다 시간(HH:MM), 체류 시간, 친근한 반말 한 줄 코멘트를 붙여.
7. 모든 스팟 이름 뒤에 그 장소의 실제 위경도를 (위도, 경도) 형식으로 표기해. 예: 성산일출봉 (33.4587, 126.9426). 구글 검색과 네 지식을 총동원해서 최대한 정확하게. 정말 모르는 곳만 생략.
8. 형식: "### N일차: [테마]" 헤더 아래 시간순 리스트.`;

// ── 2차: 초안 → 구조화 JSON ────────────────────────────────
const STRUCTURE_SYSTEM = `너는 여행 일정 텍스트를 JSON으로 변환하는 변환기야. 주어진 일정 초안을 스키마에 맞춰 정확히 구조화해.

[규칙]
- 초안의 "[ID:xxx]" 표기가 있는 스팟은 restaurantId에 xxx를 넣고, 표기가 없으면 restaurantId는 빈 문자열.
- name에는 [ID:...] 표기를 제거한 순수 장소 이름만.
- searchKeyword는 카카오맵에서 그 장소를 찾을 검색어 (예: "제주 성산일출봉", "서귀포 카페 허니문하우스").
- type은 맛집/카페/관광지/자연/액티비티/쇼핑/문화/숙소 중 하나.
- lat/lng는 초안에 (위도, 경도)로 표기된 좌표를 그대로 옮겨. 초안에 없으면 네가 아는 실제 좌표를, 그것도 모르면 둘 다 0.
- name에서 좌표 표기 (위도, 경도)도 제거해.
- 초안 내용을 빠짐없이 옮기되 새로운 장소를 추가하지 마.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "일정 제목" },
    overview: { type: Type.STRING, description: "전체 컨셉 1-2문장" },
    days: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.INTEGER },
          theme: { type: Type.STRING, description: "그 날의 컨셉" },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                time: { type: Type.STRING, description: "HH:MM" },
                name: { type: Type.STRING, description: "장소 이름 ([ID:..] 제거)" },
                type: { type: Type.STRING, description: "맛집/카페/관광지/자연/액티비티/쇼핑/문화/숙소" },
                emoji: { type: Type.STRING },
                comment: { type: Type.STRING, description: "돌맹이의 친근한 한 줄 멘트" },
                duration: { type: Type.STRING, description: "체류 시간 예: 1시간" },
                searchKeyword: { type: Type.STRING, description: "카카오맵 검색용 키워드" },
                restaurantId: { type: Type.STRING, description: "[ID:xxx]의 xxx, 없으면 빈 문자열" },
                lat: { type: Type.NUMBER, description: "장소의 위도, 모르면 0" },
                lng: { type: Type.NUMBER, description: "장소의 경도, 모르면 0" },
              },
              required: ["time", "name", "type", "emoji", "comment", "duration", "searchKeyword", "restaurantId", "lat", "lng"],
            },
          },
        },
        required: ["day", "theme", "items"],
      },
    },
    tips: { type: Type.ARRAY, items: { type: Type.STRING }, description: "여행 팁 2-3개" },
    closing: { type: Type.STRING, description: "돌맹이의 마무리 한마디" },
  },
  required: ["title", "overview", "days", "tips", "closing"],
};

/** 도민맛집 → 프롬프트용 압축 라인 (좌표 포함 — AI가 동선 적합성 판단에 사용) */
function restaurantLines(all: Restaurant[]): string {
  return all
    .filter((r) => r.lat && r.lng)
    .map((r) => `${r.id}|${r.title}|${r.region}|${r.menu}|(${Number(r.lat).toFixed(4)},${Number(r.lng).toFixed(4)})`)
    .join("\n");
}

/** 사용자 프로필 → 프롬프트 텍스트 */
function profileText(req: TripPlanRequest): string {
  const lines: string[] = [
    `- 기간: ${req.nights === 0 ? "당일치기" : `${req.nights}박 ${req.days}일`} (도착 ${req.arrivalTime}, 출발 ${req.departureTime})`,
    `- 동반자: ${req.companions.length > 0 ? req.companions.join(", ") : "정보 없음"}`,
    `- 이동수단: ${req.transportation}`,
  ];

  if (req.mode === "detailed") {
    if (req.accommodationStatus === "booked") {
      const booked = (req.bookedAccommodations ?? []).filter((a) => a.name);
      const desc = booked
        .map((a) => `${a.name} ${a.nights}박${a.address ? ` (${a.address})` : ""}`)
        .join(", ");
      lines.push(`- 숙소: 예약 완료 — ${desc}`);
      if (req.remainingNightsPlan === "recommend_rest") {
        lines.push(`- 남은 숙박: AI 추천 필요 (동선 방향에 맞는 위치로)`);
      }
    } else if (req.accommodationStatus === "not_booked") {
      lines.push(`- 숙소: 미정 — 추천 필요`);
      if (req.accommodationRecommendationStyle) {
        lines.push(`- 숙소 추천 방식: ${req.accommodationRecommendationStyle === "base_camp" ? "한 곳 거점" : "동선 따라 매일 이동"}`);
      }
      if (req.preferredAccommodationRegion) lines.push(`- 선호 숙소 지역: ${req.preferredAccommodationRegion}`);
      if (req.accommodationType?.length) lines.push(`- 선호 숙소 유형: ${req.accommodationType.join(", ")}`);
      if (req.accommodationBudget) lines.push(`- 1박 예산: ${req.accommodationBudget}`);
    }
    if (req.tripStyle) lines.push(`- 전반적 스타일: ${req.tripStyle}`);
    if (req.pace) lines.push(`- 여행 템포: ${req.pace}`);
    if (req.interestWeights && Object.keys(req.interestWeights).length > 0) {
      lines.push(`- 관심사 가중치: ${Object.entries(req.interestWeights).map(([k, v]) => `${k} ${v}%`).join(", ")}`);
    }
    if (req.restaurantStyle) lines.push(`- 식사 스타일: ${req.restaurantStyle}`);
    const mustRest = (req.mustVisitRestaurants ?? []).filter(Boolean);
    const mustSpot = (req.mustVisitSpots ?? []).filter(Boolean);
    if (mustRest.length) lines.push(`- 꼭 가고 싶은 맛집/카페: ${mustRest.join(", ")}`);
    if (mustSpot.length) lines.push(`- 꼭 가고 싶은 관광지: ${mustSpot.join(", ")}`);
    if (req.mySpots?.length) {
      const spotList = req.mySpots
        .map((s) => `${s.name}(${s.category}, ${s.lat.toFixed(4)}, ${s.lng.toFixed(4)})`)
        .join(", ");
      lines.push(`- 사용자 마이스팟 (반드시 전부 일정에 포함, 좌표를 보고 그 방향 일자에 배치): ${spotList}`);
      if (req.mySpots.some((s) => s.category === "숙소")) {
        lines.push(`- 마이스팟 중 숙소가 있으면 그 숙소를 숙박지로 사용해.`);
      }
    }
  }

  return lines.join("\n");
}

/** 이름 정규화 (공백 제거) — 제목 퍼지 매칭용 */
function norm(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}

const AIRPORT = { name: "제주국제공항", lat: 33.5066, lng: 126.4927 };

function anchorLabel(a: { name: string; lat?: number; lng?: number }): string {
  return typeof a.lat === "number" && typeof a.lng === "number"
    ? `${a.name}(${a.lat.toFixed(4)}, ${a.lng.toFixed(4)})`
    : a.name;
}

/** 좌표 기준 가까운 도민맛집 (저녁 후보용) */
function nearestRestaurants(
  restaurants: Restaurant[], lat: number, lng: number, n = 8
): Array<{ r: Restaurant; km: number }> {
  return restaurants
    .map((r) => {
      const rLat = Number(r.lat);
      const rLng = Number(r.lng);
      if (isNaN(rLat) || isNaN(rLng) || rLat === 0) return null;
      const dLat = (rLat - lat) * 111;
      const dLng = (rLng - lng) * 111 * Math.cos(((rLat + lat) / 2) * Math.PI / 180);
      return { r, km: Math.sqrt(dLat * dLat + dLng * dLng) };
    })
    .filter((x): x is { r: Restaurant; km: number } => x !== null)
    .sort((a, b) => a.km - b.km)
    .slice(0, n);
}

/**
 * 일자별 동선 앵커: 각 날의 시작점·종착점을 좌표와 함께 명시.
 * 1일차 공항→첫 숙소, 중간일 숙소→다음 숙소, 마지막 날 숙소→공항.
 * 숙소 좌표가 있으면 그 인근 도민맛집을 저녁 후보로 함께 제시.
 */
function buildAnchors(req: TripPlanRequest, restaurants: Restaurant[]): string {
  const days = req.days;
  if (days < 1) return "";

  // 박별 숙소 배열 만들기 (1박째 숙소, 2박째 숙소, ...)
  const booked = (req.bookedAccommodations ?? []).filter((a) => a.name);
  const lodgingByNight: Array<{ name: string; lat?: number; lng?: number } | null> = [];
  for (const acc of booked) {
    for (let n = 0; n < acc.nights; n++) lodgingByNight.push(acc);
  }
  // 남은 박 처리
  while (lodgingByNight.length < req.nights) {
    if (req.remainingNightsPlan === "stay_at_first" && booked.length > 0) {
      lodgingByNight.push(booked[booked.length - 1]); // 마지막 입력 숙소에서 연장
    } else {
      lodgingByNight.push(null); // AI 추천
    }
  }

  const lines: string[] = [];
  for (let d = 1; d <= days; d++) {
    const start = d === 1 ? AIRPORT : lodgingByNight[d - 2];
    const end = d === days ? AIRPORT : lodgingByNight[d - 1];
    const startLabel = start
      ? anchorLabel(start) + (d === 1 ? ` ${req.arrivalTime} 도착` : " 체크아웃")
      : "전날 AI 추천 숙소";
    const endLabel = end
      ? anchorLabel(end) + (d === days ? ` ${req.departureTime} 출발` : " 체크인·숙박")
      : "AI 추천 숙소 (이날 동선의 끝 지점 근처로 선택)";
    lines.push(`- ${d}일차: 시작=${startLabel} → 종착=${endLabel}`);

    // 그날 숙박 숙소 좌표를 알면 → 인근 도민맛집을 저녁 후보로 명시
    if (d < days && end && typeof end.lat === "number" && typeof end.lng === "number") {
      const candidates = nearestRestaurants(restaurants, end.lat, end.lng);
      if (candidates.length > 0) {
        const list = candidates
          .map((c) => `${c.r.title}[ID:${c.r.id}](${c.r.menu}, ${c.km.toFixed(1)}km)`)
          .join(", ");
        lines.push(`  · ${d}일차 저녁 식사 후보 (숙소에서 가까운 도민맛집 순): ${list}`);
      }
    }
  }

  return `
# 일자별 동선 앵커 (반드시 준수)
${lines.join("\n")}
- 각 날의 모든 스팟은 위 시작점→종착점 방향으로 진행하면서 그 경로 회랑(반경 약 10km) 안에서 선택해.
- 시작점에서 종착점 반대 방향으로 가는 스팟은 넣지 마. 이미 지나온 권역으로 되돌아가는 것도 금지.
- 연속된 두 스팟 사이에서 직전 스팟보다 시작점 방향으로 7km 이상 역행하는 스팟은 절대 삽입 금지. (예: A→B→A 방향 근처로 되돌아가는 C는 안 됨)
- 시작점과 종착점이 같은 날(당일치기 등)은 한 방향으로 도는 원형(루프) 동선으로 짜고, 같은 길을 왕복하지 마.
- 숙소 체크인은 그날 일정의 마지막에, 체크아웃은 다음 날 일정의 처음에 배치해.
- [숙소 확정 날 저녁 식사 규칙] 저녁 식사는 그날 묵는 숙소에서 차로 15분(약 8km) 이내에서 해결해. 위 "저녁 식사 후보" 목록이 있으면 거기서 우선 골라. 체크인 후 멀리 있는 식당으로 되돌아가는 동선은 절대 금지.
- [AI 추천 숙소 날 — 매우 중요] 숙소를 AI가 추천하는 날은 다음 순서를 반드시 지켜라: ①그날 마지막 관광 스팟 위치 확정 → ②저녁 식사는 그 스팟 8km 이내 → ③숙소는 저녁 식사 장소 5km 이내. 마지막 관광 스팟에서 15km 이상 떨어진 숙소는 절대 금지. 숙소를 선택하기 위해 마지막 활동 권역에서 벗어나는 것도 금지.`;
}

/** 제주 BBOX — AI가 출력한 좌표 검증용 */
function inJeju(lat: number, lng: number): boolean {
  return lat >= 33.1 && lat <= 33.65 && lng >= 126.1 && lng <= 127.0;
}

/** 로컬 좌표 폴백 — CCTV 스팟(정밀) + 명소 상수(region 없는 정밀 좌표만) */
function localGeocode(name: string): { lat: number; lng: number } | null {
  const n = norm(name);
  for (const c of mockCctvs) {
    if (n.includes(norm(c.name))) return { lat: c.latitude, lng: c.longitude };
  }
  for (const loc of JEJU_LOCATIONS) {
    if (loc.region) continue; // 읍면 중심 좌표는 너무 거칠어서 제외
    if (loc.keywords.some((k) => norm(k).length >= 2 && n.includes(norm(k)))) {
      return { lat: loc.lat, lng: loc.lng };
    }
  }
  return null;
}

function isTransient(e: unknown): boolean {
  const status = (e as { status?: number }).status;
  return status === 503 || status === 429;
}

/** 과부하(503/429) 시 다음 시도로 넘어가는 폴백 체인 */
async function tryAttempts<T>(attempts: Array<() => Promise<T>>): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts.length; i++) {
    try {
      return await attempts[i]();
    } catch (e) {
      lastErr = e;
      if (!isTransient(e)) throw e;
      if (i < attempts.length - 1) await new Promise((r) => setTimeout(r, 1200));
    }
  }
  throw lastErr;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API 키 미설정" }, { status: 500 });

  let body: TripPlanRequest;
  try {
    body = (await req.json()) as TripPlanRequest;
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  if (!body.days || body.days < 1) {
    return NextResponse.json({ error: "여행 기간을 확인해주세요" }, { status: 400 });
  }

  // ── 횟수 게이팅: 여행일정 (복잡/단순 모드별 월 한도) ──
  const auth = await verifyFirebaseToken(req.headers.get("authorization"));
  const user = await resolveUser(auth, req.headers.get("x-anon-id"));
  const feature = body.mode === "detailed" ? "tripComplex" : "tripSimple";
  const gate = await consumeUsage({ ...user, feature });
  if (!gate.allowed) {
    const label = feature === "tripComplex" ? "맞춤(복잡) 일정" : "빠른(단순) 일정";
    return NextResponse.json(
      {
        error: `이번 달 ${label} 생성 횟수를 모두 사용했어요. 다음 달에 충전되거나 요금제를 올리면 더 만들 수 있어요.`,
        gated: true, used: gate.used, limit: gate.limit,
      },
      { status: 429 }
    );
  }

  const ai = new GoogleGenAI({ apiKey });
  const restaurants = await loadAllRestaurants();

  const draftPrompt = `# 사용자 여행 프로필
${profileText(body)}
${buildAnchors(body, restaurants)}

# 도민맛집 리스트 (ID|이름|지역|메뉴) — 식사는 반드시 여기서 선택
${restaurantLines(restaurants)}

# 요청
위 프로필과 일자별 동선 앵커에 맞춰 ${body.days}일짜리 제주 여행 일정 초안을 짜줘. 관광지·카페는 구글 검색으로 실존 여부와 인기를 확인해서 골라.`;

  try {
    // 1차: 검색 그라운딩 초안 (responseSchema와 googleSearch는 동시 사용 불가 → 2단계 분리)
    // 과부하 대비 폴백 체인: flash+검색 → flash → flash-lite+검색 → flash-lite
    const draftConfig = {
      systemInstruction: DRAFT_SYSTEM,
      temperature: 0.7,
      maxOutputTokens: 8192,
      thinkingConfig: { thinkingBudget: 1024 },
    };
    const draftCall = (model: string, withSearch: boolean) => () =>
      ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: draftPrompt }] }],
        config: withSearch ? { ...draftConfig, tools: [{ googleSearch: {} }] } : draftConfig,
      });
    const draftRes = await tryAttempts([
      draftCall("gemini-2.5-flash", true),
      draftCall("gemini-2.5-flash", false),
      draftCall("gemini-2.5-flash-lite", true),
      draftCall("gemini-2.5-flash-lite", false),
    ]);
    const draft = draftRes.text;
    if (!draft) return NextResponse.json({ error: "일정 초안 생성 실패" }, { status: 500 });

    // 2차: 구조화 (flash → flash-lite 폴백)
    const structCall = (model: string) => () =>
      ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: `다음 일정 초안을 JSON으로 변환해줘:\n\n${draft}` }] }],
        config: {
          systemInstruction: STRUCTURE_SYSTEM,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.1,
          maxOutputTokens: 8192,
          thinkingConfig: { thinkingBudget: 0 },
        },
      });
    const structRes = await tryAttempts([
      structCall("gemini-2.5-flash"),
      structCall("gemini-2.5-flash"),
      structCall("gemini-2.5-flash-lite"),
    ]);
    const text = structRes.text;
    if (!text) return NextResponse.json({ error: "일정 구조화 실패" }, { status: 500 });

    const plan = JSON.parse(text) as TripPlan;

    // 도민맛집 데이터로 보강 (좌표·주소·썸네일)
    const byId = new Map(restaurants.map((r) => [r.id, r]));
    const byTitle = new Map(restaurants.map((r) => [norm(r.title), r]));
    // 예약 숙소는 카카오 검색으로 확정된 좌표가 있음 → 이름 매칭으로 정확 좌표 주입
    const bookedWithCoords = (body.bookedAccommodations ?? []).filter(
      (a) => a.name && typeof a.lat === "number" && typeof a.lng === "number"
    );

    for (const day of plan.days) {
      for (const item of day.items) {
        const lodging = bookedWithCoords.find(
          (a) => norm(item.name).includes(norm(a.name)) || norm(a.name).includes(norm(item.name))
        );
        if (lodging) {
          item.isDominFood = false;
          item.restaurantId = undefined;
          item.lat = lodging.lat;
          item.lng = lodging.lng;
          item.address = lodging.address;
          continue;
        }

        const matched =
          (item.restaurantId && byId.get(item.restaurantId)) ||
          byTitle.get(norm(item.name));
        // domin_food.json의 lat/lng는 문자열이므로 숫자로 강제 변환
        const mLat = matched ? Number(matched.lat) : NaN;
        const mLng = matched ? Number(matched.lng) : NaN;
        if (matched && !isNaN(mLat) && !isNaN(mLng) && mLat !== 0 && mLng !== 0) {
          item.isDominFood = true;
          item.restaurantId = matched.id;
          item.lat = mLat;
          item.lng = mLng;
          item.address = matched.address;
          item.thumbnail = matched.images?.[0] ? `/restaurant-images/${matched.images[0]}` : null;
        } else {
          item.isDominFood = false;
          item.restaurantId = undefined;
          // AI 좌표(제주 BBOX 검증) > 로컬 상수 > 클라이언트 지오코딩 순
          const aLat = Number(item.lat);
          const aLng = Number(item.lng);
          if (inJeju(aLat, aLng)) {
            item.lat = aLat;
            item.lng = aLng;
          } else {
            const local = localGeocode(item.name);
            item.lat = local?.lat;
            item.lng = local?.lng;
          }
        }
      }
    }

    return NextResponse.json(plan);
  } catch (e) {
    console.error("Trip plan error:", e);
    return NextResponse.json({ error: "일정 생성 중 오류가 발생했어요. 다시 시도해주세요." }, { status: 500 });
  }
}
