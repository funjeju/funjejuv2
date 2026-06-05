import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";
export const maxDuration = 30;

// ── 타입 ──────────────────────────────────────────────────────
type Message = { role: "user" | "model"; text: string };

type Place = {
  place_name: string;
  categories: string[];
  categories_kr: string[];
  description: string;
  expert_tip: string;
  region: string;
  address: string;
  tags: string[];
  withPets: boolean;
  withKids: boolean;
  admissionFee: string;
  recommendedSeasons: string[];
  targetAudience: string[];
  lat: number;
  lng: number;
  distKm?: number;
};

// ── 위치 기반 캐시 (서버 인스턴스 내 5분 유효) ──────────────
// 같은 지역 반복 쿼리 시 Firestore 재호출 없이 캐시 사용
const geoCache = new Map<string, { places: Place[]; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5분

function geoCacheKey(lat: number, lng: number): string {
  // 소수점 2자리로 반올림 → 약 1km 격자
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

// ── Firestore REST 헬퍼 ───────────────────────────────────────
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!;
const API_KEY    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY!;
const FS_BASE    = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// Firestore typed value → JS value
function fv(v: Record<string, unknown>): unknown {
  if (!v) return null;
  if ("stringValue"  in v) return v.stringValue;
  if ("doubleValue"  in v) return v.doubleValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("booleanValue" in v) return v.booleanValue;
  if ("arrayValue"   in v) {
    const arr = v.arrayValue as { values?: Record<string, unknown>[] };
    return (arr.values ?? []).map(fv);
  }
  if ("mapValue" in v) {
    const map = v.mapValue as { fields?: Record<string, Record<string, unknown>> };
    return Object.fromEntries(Object.entries(map.fields ?? {}).map(([k, val]) => [k, fv(val)]));
  }
  return null;
}

function docToPlace(doc: { fields?: Record<string, Record<string, unknown>> }): Place | null {
  if (!doc.fields) return null;
  const f = doc.fields;
  const lat = fv(f.lat) as number;
  const lng = fv(f.lng) as number;
  if (!lat || !lng) return null;
  return {
    place_name:         fv(f.place_name) as string ?? "",
    categories:         (fv(f.categories) as string[]) ?? [],
    categories_kr:      (fv(f.categories_kr) as string[]) ?? [],
    description:        fv(f.description) as string ?? "",
    expert_tip:         fv(f.expert_tip) as string ?? "",
    region:             fv(f.region) as string ?? "",
    address:            fv(f.address) as string ?? "",
    tags:               (fv(f.tags) as string[]) ?? [],
    withPets:           fv(f.withPets) as boolean ?? false,
    withKids:           fv(f.withKids) as boolean ?? false,
    admissionFee:       fv(f.admissionFee) as string ?? "",
    recommendedSeasons: (fv(f.recommendedSeasons) as string[]) ?? [],
    targetAudience:     (fv(f.targetAudience) as string[]) ?? [],
    lat, lng,
  };
}

// Haversine 거리 (km)
function distKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// 유저 메시지에서 카테고리 힌트 추출
function extractCategoryHint(text: string): string[] {
  const t = text.toLowerCase();
  const hints: string[] = [];
  if (/카페|커피|cafe/.test(t))                                hints.push("Cafe");
  if (/맛집|음식|식당|밥|restaurant/.test(t))                  hints.push("Restaurant");
  if (/해변|바다|수영|비치|beach/.test(t))                      hints.push("Beach");
  if (/오름|등산|mountain/.test(t))                             hints.push("Mountain", "Oroom");
  if (/숙소|호텔|펜션|게스트/.test(t))                          hints.push("Accommodation");
  if (/박물관|museum/.test(t))                                  hints.push("Museum");
  if (/공연|performance/.test(t))                               hints.push("Performance");
  if (/전시|갤러리|gallery/.test(t))                            hints.push("Exhibition", "Gallery");
  if (/노을|일몰|sunset/.test(t))                               hints.push("Sunset");
  if (/폭포|waterfall/.test(t))                                 hints.push("Waterfall");
  if (/드라이브|drive/.test(t))                                 hints.push("Drive");
  if (/반려동물|강아지|pet|dog/.test(t))                        hints.push("_withPets");
  if (/아이|어린이|kid|child|가족|family/.test(t))              hints.push("_withKids");
  if (/사진|포토|photo|인스타/.test(t))                         hints.push("PhotoSpot");
  if (/문화|역사|culture|history/.test(t))                      hints.push("Culture", "History");
  if (/숲|forest|정원|garden/.test(t))                          hints.push("Forest", "Garden");
  return hints;
}

// Firestore 반경 쿼리 (lat bounding box → lng 필터 → 거리 정렬) + 캐시
async function queryNearbyPlaces(lat: number, lng: number, radiusKm: number, hints: string[]): Promise<Place[]> {
  // 캐시 확인 (5분 이내 같은 위치 → 재사용)
  const cacheKey = `${geoCacheKey(lat, lng)}_${radiusKm}`;
  const cached = geoCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return filterAndSort(cached.places, lat, lng, hints);
  }
  const R = radiusKm / 111; // degrees per km (roughly)
  const minLat = lat - R;
  const maxLat = lat + R;

  const query = {
    structuredQuery: {
      from: [{ collectionId: "places" }],
      where: {
        compositeFilter: {
          op: "AND",
          filters: [
            { fieldFilter: { field: { fieldPath: "lat" }, op: "GREATER_THAN_OR_EQUAL", value: { doubleValue: minLat } } },
            { fieldFilter: { field: { fieldPath: "lat" }, op: "LESS_THAN_OR_EQUAL",    value: { doubleValue: maxLat } } },
          ],
        },
      },
      limit: 150,
    },
  };

  const url = `${FS_BASE}:runQuery?key=${API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(query),
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) return [];

  const rows = (await res.json()) as { document?: { fields?: Record<string, Record<string, unknown>> } }[];

  const places: Place[] = [];
  for (const row of rows) {
    if (!row.document) continue;
    const p = docToPlace(row.document);
    if (!p) continue;

    // lng 범위 필터
    if (Math.abs(p.lng - lng) > R * 1.5) continue;

    const d = distKm(lat, lng, p.lat, p.lng);
    if (d > radiusKm) continue;

    p.distKm = d;
    places.push(p);
  }

  // 캐시 저장
  geoCache.set(cacheKey, { places, ts: Date.now() });

  return filterAndSort(places, lat, lng, hints);
}

// 캐시 히트 시에도 사용하는 정렬/필터 함수
function filterAndSort(places: Place[], lat: number, lng: number, hints: string[]): Place[] {
  const withPetsHint = hints.includes("_withPets");
  const withKidsHint = hints.includes("_withKids");
  const catHints     = hints.filter((h) => !h.startsWith("_"));

  return [...places]
    .sort((a, b) => {
      let scoreA = 0, scoreB = 0;
      if (withPetsHint && a.withPets) scoreA += 5;
      if (withPetsHint && b.withPets) scoreB += 5;
      if (withKidsHint && a.withKids) scoreA += 5;
      if (withKidsHint && b.withKids) scoreB += 5;
      if (catHints.length > 0) {
        if (a.categories.some((c) => catHints.includes(c))) scoreA += 10;
        if (b.categories.some((c) => catHints.includes(c))) scoreB += 10;
      }
      scoreA += Math.max(0, 5 - (a.distKm ?? 99));
      scoreB += Math.max(0, 5 - (b.distKm ?? 99));
      return scoreB - scoreA;
    })
    .slice(0, 20);
}

// 장소 목록 → 프롬프트 컨텍스트 문자열
function buildContext(places: Place[], lat: number, lng: number): string {
  if (places.length === 0) return "";

  const lines = places.map((p, i) => {
    const dist  = p.distKm != null ? `${p.distKm.toFixed(1)}km` : "?km";
    const cats  = p.categories_kr.length > 0 ? p.categories_kr.join(", ") : p.categories.join(", ");
    const pets  = p.withPets ? "반려동물 가능" : "";
    const kids  = p.withKids ? "아이 동반 가능" : "";
    const flags = [pets, kids].filter(Boolean).join(" · ");
    const tip   = p.expert_tip ? `팁: ${p.expert_tip}` : "";
    const seasons = p.recommendedSeasons.length > 0 ? `추천계절: ${p.recommendedSeasons.join("·")}` : "";

    return [
      `${i + 1}. ${p.place_name} (${dist}) — ${cats}`,
      `   ${p.description || ""}`,
      tip ? `   ${tip}` : "",
      [flags, seasons].filter(Boolean).join(" | "),
    ].filter(Boolean).join("\n");
  });

  return `[현재 위치(${lat.toFixed(4)},${lng.toFixed(4)}) 기준 근처 스팟 — 아래 목록에 있는 장소만 추천할 것]\n\n${lines.join("\n\n")}`;
}

// ── 시스템 프롬프트 빌더 ──────────────────────────────────────
function buildSystemPrompt(context: string, hasGps: boolean): string {
  const locationNote = hasGps
    ? "유저의 현재 GPS 위치를 기반으로 근처 스팟을 우선 추천해."
    : "유저의 위치 정보가 없어. 제주 대표 명소 중심으로 답변해.";

  return `너는 제주 여행 AI 도슨트 '돌맹이'야. 제주 돌하르방을 의인화한 로컬 친구.

[페르소나]
- 친근한 반말, 가끔 "~해!", "~야~" 어미
- 이모지 자연스럽게 (🗿🌊🏝️☀️) — 과하지 않게
- 제주 현지 정보에 진심, 유머 있음

[핵심 규칙]
1. 반드시 아래 [스팟 DB]에 있는 장소만 추천할 것 — 없는 장소 지어내기 금지
2. ${locationNote}
3. 답변은 3~6줄. 장소명·거리·한 줄 설명 포함
4. 반려동물/아이 동반 여부를 물어보면 DB 속성으로만 답할 것
5. 마크다운(#, **, *) 쓰지 말고 일반 텍스트로
6. DB에 없는 맛집·카페 추천 질문엔 "지금 내 DB에 없어! 현지 검색 추천해 😅"라고 솔직히 말할 것

[금기]
- 의료/법률/투자 조언 금지
- 제주 이외 지역 추천 금지

${context ? `\n${context}` : "[스팟 DB 없음 — 위치 정보 없거나 DB 비어있음]"}`;
}

// ── 메인 핸들러 ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: "API 키 미설정" }), { status: 500 });

  const { messages, lat, lng } = (await req.json()) as {
    messages: Message[];
    lat?: number;
    lng?: number;
  };

  const hasGps = typeof lat === "number" && typeof lng === "number";

  // 마지막 유저 메시지에서 카테고리 힌트 추출
  const lastUserText = [...messages].reverse().find((m) => m.role === "user")?.text ?? "";
  const hints        = extractCategoryHint(lastUserText);

  // 근처 장소 조회 (GPS 있을 때만)
  let context = "";
  if (hasGps) {
    try {
      // 1차: 3km 이내
      let places = await queryNearbyPlaces(lat!, lng!, 3, hints);
      // 3km 이내 결과 5개 미만이면 10km로 확대
      if (places.length < 5) {
        places = await queryNearbyPlaces(lat!, lng!, 10, hints);
      }
      context = buildContext(places, lat!, lng!);
    } catch (e) {
      console.error("[chat] place query failed:", e);
      // 쿼리 실패해도 챗봇은 계속 동작
    }
  }

  const systemPrompt = buildSystemPrompt(context, hasGps);

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
        temperature: 0.85,
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
