import "server-only";
import { GoogleGenAI, Type } from "@google/genai";
import { loadAllRestaurants, restaurantImageUrl } from "@/lib/restaurants";
import { JEJU_LOCATIONS } from "@/constants/jeju-locations";
import { mockCctvs } from "@/constants/mock-cctvs";
import type { Restaurant } from "@/types/restaurant";
import type { TripPlan, TripPlanRequest } from "@/types/trip";

/**
 * 여행일정 생성 코어 — /api/trip-plan(유저용)과 일정 시뮬 포스팅 크론이 공유.
 * 인증·횟수제한·HTTP 응답은 호출측에서 처리하고, 여기선 순수 생성 로직만.
 */

const DRAFT_SYSTEM = `너는 제주 여행 전문 플래너 '돌AI'야. 사용자 프로필에 맞춰 최적 동선의 제주 여행 일정 초안을 짜줘.

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
                comment: { type: Type.STRING, description: "돌AI의 친근한 한 줄 멘트" },
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
    closing: { type: Type.STRING, description: "돌AI의 마무리 한마디" },
  },
  required: ["title", "overview", "days", "tips", "closing"],
};

function restaurantLines(all: Restaurant[]): string {
  return all
    .filter((r) => r.lat && r.lng)
    .map((r) => `${r.id}|${r.title}|${r.region}|${r.menu}|(${Number(r.lat).toFixed(4)},${Number(r.lng).toFixed(4)})`)
    .join("\n");
}

function profileText(req: TripPlanRequest): string {
  const lines: string[] = [
    `- 기간: ${req.nights === 0 ? "당일치기" : `${req.nights}박 ${req.days}일`} (도착 ${req.arrivalTime}, 출발 ${req.departureTime})`,
    `- 동반자: ${req.companions.length > 0 ? req.companions.join(", ") : "정보 없음"}`,
    `- 이동수단: ${req.transportation}`,
  ];
  if (req.mode === "detailed") {
    if (req.accommodationStatus === "not_booked") {
      lines.push(`- 숙소: 미정 — 추천 필요`);
      if (req.accommodationRecommendationStyle) lines.push(`- 숙소 추천 방식: ${req.accommodationRecommendationStyle === "base_camp" ? "한 곳 거점" : "동선 따라 매일 이동"}`);
      if (req.preferredAccommodationRegion) lines.push(`- 선호 숙소 지역: ${req.preferredAccommodationRegion}`);
      if (req.accommodationType?.length) lines.push(`- 선호 숙소 유형: ${req.accommodationType.join(", ")}`);
    }
    if (req.tripStyle) lines.push(`- 전반적 스타일: ${req.tripStyle}`);
    if (req.pace) lines.push(`- 여행 템포: ${req.pace}`);
    if (req.interestWeights && Object.keys(req.interestWeights).length > 0) {
      lines.push(`- 관심사 가중치: ${Object.entries(req.interestWeights).map(([k, v]) => `${k} ${v}%`).join(", ")}`);
    }
  }
  return lines.join("\n");
}

function norm(s: string): string { return s.replace(/\s+/g, "").toLowerCase(); }

const AIRPORT = { name: "제주국제공항", lat: 33.5066, lng: 126.4927 };

function nearestRestaurants(restaurants: Restaurant[], lat: number, lng: number, n = 8): Array<{ r: Restaurant; km: number }> {
  return restaurants
    .map((r) => {
      const rLat = Number(r.lat), rLng = Number(r.lng);
      if (isNaN(rLat) || isNaN(rLng) || rLat === 0) return null;
      const dLat = (rLat - lat) * 111;
      const dLng = (rLng - lng) * 111 * Math.cos(((rLat + lat) / 2) * Math.PI / 180);
      return { r, km: Math.sqrt(dLat * dLat + dLng * dLng) };
    })
    .filter((x): x is { r: Restaurant; km: number } => x !== null)
    .sort((a, b) => a.km - b.km)
    .slice(0, n);
}

function buildAnchors(req: TripPlanRequest, restaurants: Restaurant[]): string {
  const days = req.days;
  if (days < 1) return "";
  const lines: string[] = [];
  for (let d = 1; d <= days; d++) {
    const start = d === 1 ? `${AIRPORT.name}(${AIRPORT.lat},${AIRPORT.lng}) ${req.arrivalTime} 도착` : "전날 AI 추천 숙소 체크아웃";
    const end = d === days ? `${AIRPORT.name}(${AIRPORT.lat},${AIRPORT.lng}) ${req.departureTime} 출발` : "AI 추천 숙소 (이날 동선 끝 지점 근처)";
    lines.push(`- ${d}일차: 시작=${start} → 종착=${end}`);
  }
  return `\n# 일자별 동선 앵커 (반드시 준수)\n${lines.join("\n")}\n- 각 날 스팟은 시작점→종착점 방향 회랑(반경 약 10km) 안에서만. 역행·지그재그 금지.\n- AI 추천 숙소 날: 마지막 관광 스팟 8km 이내 저녁 → 5km 이내 숙소. 마지막 스팟 15km 초과 숙소 금지.`;
}

function inJeju(lat: number, lng: number): boolean {
  return lat >= 33.1 && lat <= 33.65 && lng >= 126.1 && lng <= 127.0;
}

function localGeocode(name: string): { lat: number; lng: number } | null {
  const n = norm(name);
  for (const c of mockCctvs) if (n.includes(norm(c.name))) return { lat: c.latitude, lng: c.longitude };
  for (const loc of JEJU_LOCATIONS) {
    if (loc.region) continue;
    if (loc.keywords.some((k) => norm(k).length >= 2 && n.includes(norm(k)))) return { lat: loc.lat, lng: loc.lng };
  }
  return null;
}

function isTransient(e: unknown): boolean {
  const status = (e as { status?: number }).status;
  return status === 503 || status === 429;
}
async function tryAttempts<T>(attempts: Array<() => Promise<T>>): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts.length; i++) {
    try { return await attempts[i](); }
    catch (e) { lastErr = e; if (!isTransient(e)) throw e; if (i < attempts.length - 1) await new Promise((r) => setTimeout(r, 1200)); }
  }
  throw lastErr;
}

/** 프로필 → 일정 생성 (검색 그라운딩 초안 → 구조화 → 도민맛집 좌표 보강). 실패 시 throw. */
export async function generateTripPlanCore(body: TripPlanRequest): Promise<TripPlan> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY 미설정");
  const ai = new GoogleGenAI({ apiKey });
  const restaurants = await loadAllRestaurants();

  const draftPrompt = `# 사용자 여행 프로필
${profileText(body)}
${buildAnchors(body, restaurants)}

# 도민맛집 리스트 (ID|이름|지역|메뉴) — 식사는 반드시 여기서 선택
${restaurantLines(restaurants)}

# 요청
위 프로필과 일자별 동선 앵커에 맞춰 ${body.days}일짜리 제주 여행 일정 초안을 짜줘. 관광지·카페는 구글 검색으로 실존 여부와 인기를 확인해서 골라.`;

  const draftConfig = { systemInstruction: DRAFT_SYSTEM, temperature: 0.7, maxOutputTokens: 8192, thinkingConfig: { thinkingBudget: 1024 } };
  const draftCall = (model: string, withSearch: boolean) => () =>
    ai.models.generateContent({ model, contents: [{ role: "user", parts: [{ text: draftPrompt }] }], config: withSearch ? { ...draftConfig, tools: [{ googleSearch: {} }] } : draftConfig });
  const draftRes = await tryAttempts([
    draftCall("gemini-2.5-flash", true), draftCall("gemini-2.5-flash", false),
    draftCall("gemini-2.5-flash-lite", true), draftCall("gemini-2.5-flash-lite", false),
  ]);
  const draft = draftRes.text;
  if (!draft) throw new Error("일정 초안 생성 실패");

  const structCall = (model: string) => () =>
    ai.models.generateContent({
      model, contents: [{ role: "user", parts: [{ text: `다음 일정 초안을 JSON으로 변환해줘:\n\n${draft}` }] }],
      config: { systemInstruction: STRUCTURE_SYSTEM, responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA, temperature: 0.1, maxOutputTokens: 8192, thinkingConfig: { thinkingBudget: 0 } },
    });
  const structRes = await tryAttempts([structCall("gemini-2.5-flash"), structCall("gemini-2.5-flash"), structCall("gemini-2.5-flash-lite")]);
  const text = structRes.text;
  if (!text) throw new Error("일정 구조화 실패");

  const plan = JSON.parse(text) as TripPlan;

  const byId = new Map(restaurants.map((r) => [r.id, r]));
  const byTitle = new Map(restaurants.map((r) => [norm(r.title), r]));
  for (const day of plan.days) {
    for (const item of day.items) {
      const matched = (item.restaurantId && byId.get(item.restaurantId)) || byTitle.get(norm(item.name));
      const mLat = matched ? Number(matched.lat) : NaN;
      const mLng = matched ? Number(matched.lng) : NaN;
      if (matched && !isNaN(mLat) && !isNaN(mLng) && mLat !== 0 && mLng !== 0) {
        item.isDominFood = true; item.restaurantId = matched.id; item.lat = mLat; item.lng = mLng;
        item.address = matched.address; item.thumbnail = restaurantImageUrl(matched.images?.[0]) ?? null;
      } else {
        item.isDominFood = false; item.restaurantId = undefined;
        const aLat = Number(item.lat), aLng = Number(item.lng);
        if (inJeju(aLat, aLng)) { item.lat = aLat; item.lng = aLng; }
        else { const local = localGeocode(item.name); item.lat = local?.lat; item.lng = local?.lng; }
      }
    }
  }
  return plan;
}
