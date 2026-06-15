import "server-only";
import OpenAI from "openai";
import { getAdminDb } from "@/lib/firebase-admin";
import type { JejutubeSpot, JejutubeVideo } from "@/types/jejutube";

const KAKAO_REST_KEY = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY;

export function extractVideoId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

function fmtTs(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ── SocialKit 자막 추출 ─────────────────────────────────────
async function getTranscriptViaSocialKit(videoId: string): Promise<string> {
  const apiKey = process.env.SOCIALKIT_API_KEY;
  if (!apiKey) throw new Error("SOCIALKIT_NOT_CONFIGURED");

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const res = await fetch(
    `https://api.socialkit.dev/youtube/transcript?url=${encodeURIComponent(videoUrl)}`,
    { headers: { "x-access-key": apiKey }, signal: AbortSignal.timeout(20000) }
  );
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`SOCIALKIT_${res.status}: ${errText.slice(0, 100)}`);
  }

  const data = (await res.json()) as {
    success?: boolean;
    data?: {
      transcript?: string;
      transcriptSegments?: Array<{ text: string; start: number }>;
    };
    error?: string;
    message?: string;
  };
  if (!data.success || !data.data) {
    throw new Error(`SOCIALKIT_FAILED: ${data.error || data.message || "unknown"}`);
  }

  const segs = data.data.transcriptSegments;
  if (segs && segs.length > 0) {
    return segs
      .map((s) => `[${fmtTs(s.start)}] ${s.text.replace(/\n/g, " ").trim()}`)
      .filter((line) => line.length > 10)
      .join("\n");
  }
  if (data.data.transcript && data.data.transcript.trim().length > 50) {
    return data.data.transcript.trim();
  }
  throw new Error("SOCIALKIT_EMPTY_RESPONSE");
}

// ── 유튜브 메타 (oEmbed) ────────────────────────────────────
async function getVideoMeta(videoId: string): Promise<{ title: string; author: string }> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return { title: "", author: "" };
    const data = (await res.json()) as { title?: string; author_name?: string };
    return { title: data.title ?? "", author: data.author_name ?? "" };
  } catch {
    return { title: "", author: "" };
  }
}

// ── GPT-5 mini 스팟 추출 (자막 텍스트 기반) ──────────────────
const EXTRACT_SYSTEM = `너는 제주 여행 유튜브를 분석해서 핵심 스팟을 뽑아주는 큐레이터야.

[규칙]
- 제주가 아닌 장소는 제외
- 실제 존재하는 정확한 장소명만 (확실치 않으면 빼)
- 일반명사(바다, 카페 등)가 아니라 고유 장소명만
- timestamp는 자막의 [MM:SS] 표기 기준, 없으면 "00:00"
- 카테고리: 해변/오름/카페/맛집/관광지/액티비티/숙소 중 하나
- summary는 3-4문장, 친근한 반말
- 반드시 JSON 스키마에 맞춰 반환`;

// OpenAI structured output (json_schema, strict) — 모든 필드 required + additionalProperties:false
const EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string", description: "영상 요약 3-4문장 반말" },
    spots: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          category: { type: "string", description: "해변/오름/카페/맛집/관광지/액티비티/숙소" },
          description: { type: "string", description: "영상 속 맥락 1문장 반말" },
          timestamp: { type: "string", description: "MM:SS" },
          emoji: { type: "string" },
        },
        required: ["name", "category", "description", "timestamp", "emoji"],
        additionalProperties: false,
      },
    },
    tags: { type: "array", items: { type: "string" }, description: "키워드 3-5개" },
  },
  required: ["summary", "spots", "tags"],
  additionalProperties: false,
} as const;

type Extracted = { summary: string; spots: JejutubeSpot[]; tags: string[] };

let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openaiClient;
}

/** 자막 텍스트 → 스팟 추출 (GPT-5 mini, structured output) */
async function extractSpotsViaGPT(transcript: string, title: string): Promise<Extracted> {
  const res = await getOpenAI().chat.completions.create({
    model: "gpt-5-mini",
    messages: [
      { role: "system", content: EXTRACT_SYSTEM },
      {
        role: "user",
        content: `영상 제목: ${title}\n\n자막:\n${transcript.slice(0, 24000)}\n\n위 제주 여행 영상에서 스팟을 추출해줘.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "jeju_spots", strict: true, schema: EXTRACT_SCHEMA },
    },
    reasoning_effort: "minimal", // 스팟 추출은 잘 정의된 작업 — 내부 추론 생략으로 응답 속도 대폭 단축
    max_completion_tokens: 8192,
  });
  const text = res.choices[0]?.message?.content;
  if (!text) throw new Error("EXTRACT_EMPTY");
  return JSON.parse(text) as Extracted;
}

// ── 카카오 지오코딩 ─────────────────────────────────────────
function inJeju(lat: number, lng: number): boolean {
  return lat >= 33.1 && lat <= 33.65 && lng >= 126.1 && lng <= 127.0;
}

type KakaoDoc = {
  place_name?: string;
  road_address_name?: string;
  address_name?: string;
  category_group_code?: string;
  x: string;
  y: string;
};

async function kakaoSearch(query: string): Promise<KakaoDoc | null> {
  if (!KAKAO_REST_KEY) return null;
  try {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=5`,
      { headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` }, signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { documents?: KakaoDoc[] };
    return (data.documents ?? []).find((d) => inJeju(Number(d.y), Number(d.x))) ?? null;
  } catch { return null; }
}

/** 표기 차이를 흡수하기 위해 여러 쿼리 변형으로 카카오 검색 */
async function kakaoSearchBest(name: string): Promise<KakaoDoc | null> {
  const clean = name.replace(/\(.*?\)/g, "").trim();
  const queries = [`제주 ${clean}`, clean, `제주도 ${clean}`];
  for (const q of queries) {
    const hit = await kakaoSearch(q);
    if (hit) return hit;
  }
  return null;
}

// ── AI 좌표 보정 (카카오가 못 찾은 스팟을 실제 제주 장소로 특정) ──
const RESOLVE_SYSTEM = `너는 제주 지리 전문가야. 주어진 스팟 이름이 가리키는 "제주도 안의 실제 장소"를 특정해줘.

[규칙]
- officialName: 카카오맵/네이버지도에서 그대로 검색되는 정확한 공식 상호명·지명 (영상 표기가 줄임말·별칭이면 정식 명칭으로 교정)
- lat/lng: 그 장소의 실제 WGS84 좌표. 위치를 확실히 아는 유명 장소면 정확한 값을, 모르면 null
- 제주도(위도 33.1~33.65, 경도 126.1~127.0) 밖이거나 실재 여부가 불확실하면 lat/lng를 null로
- 추측으로 아무 좌표나 만들어내지 마. 확신 없으면 null이 맞아`;

const RESOLVE_SCHEMA = {
  type: "object",
  properties: {
    places: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "입력으로 받은 원래 스팟 이름 그대로" },
          officialName: { type: "string", description: "카카오맵에서 검색되는 정확한 공식 명칭" },
          lat: { type: ["number", "null"] },
          lng: { type: ["number", "null"] },
        },
        required: ["name", "officialName", "lat", "lng"],
        additionalProperties: false,
      },
    },
  },
  required: ["places"],
  additionalProperties: false,
} as const;

type ResolvedPlace = { name: string; officialName: string; lat: number | null; lng: number | null };

/** 카카오가 못 찾은 스팟들을 GPT로 한 번에 보정 (공식명 교정 + 좌표 추정) */
async function resolveSpotsViaAI(spots: JejutubeSpot[], title: string): Promise<Map<string, ResolvedPlace>> {
  const map = new Map<string, ResolvedPlace>();
  if (spots.length === 0) return map;
  try {
    const res = await getOpenAI().chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        { role: "system", content: RESOLVE_SYSTEM },
        {
          role: "user",
          content: `영상 제목: ${title}\n\n아래 스팟들의 제주도 내 실제 위치를 특정해줘:\n${spots
            .map((s) => `- ${s.name} (${s.category}): ${s.description}`)
            .join("\n")}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "resolve_places", strict: true, schema: RESOLVE_SCHEMA },
      },
      reasoning_effort: "low",
      max_completion_tokens: 4096,
    });
    const text = res.choices[0]?.message?.content;
    if (text) {
      const parsed = JSON.parse(text) as { places: ResolvedPlace[] };
      for (const p of parsed.places ?? []) map.set(p.name, p);
    }
  } catch (e) {
    console.warn("[jejutube] AI 좌표 보정 실패:", e instanceof Error ? e.message : e);
  }
  return map;
}

async function geocodeSpots(spots: JejutubeSpot[], title: string): Promise<JejutubeSpot[]> {
  // 1차: 카카오 다중 쿼리 검색을 병렬 실행
  const pass1 = await Promise.all(
    spots.map(async (spot) => {
      const enriched = { ...spot };
      const hit = await kakaoSearchBest(spot.name);
      if (hit) {
        enriched.lat = Number(hit.y);
        enriched.lng = Number(hit.x);
        enriched.address = hit.road_address_name || hit.address_name;
      }
      return enriched;
    })
  );

  // 2차: 1차에서 좌표를 못 찾은 스팟을 AI로 보정
  const unresolved = pass1.filter((s) => typeof s.lat !== "number");
  if (unresolved.length === 0) return pass1;

  const resolved = await resolveSpotsViaAI(unresolved, title);

  return Promise.all(
    pass1.map(async (spot) => {
      if (typeof spot.lat === "number") return spot;
      const r = resolved.get(spot.name);
      if (!r) return spot;

      // 2-a) AI가 교정한 공식명으로 카카오 재검색 (가장 정확)
      if (r.officialName && r.officialName !== spot.name) {
        const hit = await kakaoSearchBest(r.officialName);
        if (hit) {
          return {
            ...spot,
            name: hit.place_name || r.officialName,
            lat: Number(hit.y),
            lng: Number(hit.x),
            address: hit.road_address_name || hit.address_name,
          };
        }
      }
      // 2-b) 카카오에 없으면 AI 좌표 사용 (제주 범위 안일 때만)
      if (typeof r.lat === "number" && typeof r.lng === "number" && inJeju(r.lat, r.lng)) {
        return {
          ...spot,
          name: r.officialName || spot.name,
          lat: r.lat,
          lng: r.lng,
        };
      }
      return spot;
    })
  );
}

/** 영상 제목의 ·구분 스팟을 카카오로 검증해 GPT가 놓친 것을 보완 */
async function enrichSpotsFromTitle(
  title: string,
  existing: JejutubeSpot[]
): Promise<JejutubeSpot[]> {
  // "A·B·C" 패턴 섹션 파싱 (최소 2개 이상 ·로 연결된 부분)
  const sections = title.match(/[가-힣\w]+(?:·[가-힣\w]+){1,}/g) ?? [];
  const candidates: string[] = [];
  for (const sec of sections) {
    candidates.push(...sec.split("·").map((s) => s.trim()).filter((s) => s.length >= 2));
  }
  if (candidates.length === 0) return [];

  const existingNorm = new Set(existing.map((s) => s.name.replace(/\s/g, "")));

  const CODE_CATEGORY: Record<string, string> = {
    FD6: "맛집", CE7: "카페", AD5: "숙소", AT4: "관광지", PO3: "공공기관",
  };

  // 기존 스팟과 겹치지 않고 후보끼리도 중복되지 않는 이름만 추려서 병렬 검색
  const toSearch: string[] = [];
  for (const name of candidates) {
    const norm = name.replace(/\s/g, "");
    if ([...existingNorm].some((n) => n.includes(norm) || norm.includes(n))) continue;
    existingNorm.add(norm);
    toSearch.push(name);
  }

  const hits = await Promise.all(toSearch.map((name) => kakaoSearch(`제주 ${name}`)));

  const EMOJI: Record<string, string> = {
    맛집: "🍽️", 카페: "☕", 숙소: "🏠", 관광지: "📍",
  };
  const added: JejutubeSpot[] = [];
  for (let i = 0; i < toSearch.length; i++) {
    const hit = hits[i];
    if (!hit) continue; // 카카오에 없으면 존재 불확실 → 제외

    const cat = CODE_CATEGORY[hit.category_group_code ?? ""] ?? "관광지";
    added.push({
      name: hit.place_name || toSearch[i],
      category: cat,
      description: `영상 제목에 소개된 제주 스팟`,
      timestamp: "00:00",
      emoji: EMOJI[cat] ?? "📍",
      lat: Number(hit.y),
      lng: Number(hit.x),
      address: hit.road_address_name || hit.address_name,
    });
  }
  return added;
}

// ── 메인: 분석 + 저장 ───────────────────────────────────────
export type AnalyzeResult =
  | { ok: true; video: JejutubeVideo; alreadyExists: boolean }
  | { ok: false; error: string; status: number };

/** 같은 사용자의 오늘 등록 수 (일일 한도용) */
export async function countTodayByUser(uid: string): Promise<number> {
  const db = getAdminDb();
  const snap = await db.collection("jejutube_videos").where("addedBy", "==", uid).limit(50).get();
  const todayStart = new Date().setHours(0, 0, 0, 0);
  return snap.docs.filter((d) => (d.data().createdAt ?? 0) >= todayStart).length;
}

export async function analyzeAndSaveVideo(
  url: string,
  addedBy?: { uid: string; name?: string },
  opts?: { force?: boolean }
): Promise<AnalyzeResult> {
  if (!process.env.OPENAI_API_KEY) return { ok: false, error: "OPENAI_API_KEY 미설정", status: 500 };

  const videoId = extractVideoId(url);
  if (!videoId) return { ok: false, error: "올바른 유튜브 URL을 입력해주세요", status: 400 };

  const db = getAdminDb();

  // 이미 분석된 영상이면 그대로 반환 (공유 풀 — 재분석 비용 절약)
  // force=true면 좌표 보정 등 파이프라인 개선 반영을 위해 다시 분석
  const existing = await db.collection("jejutube_videos").doc(videoId).get();
  if (existing.exists && !opts?.force) {
    return { ok: true, video: existing.data() as JejutubeVideo, alreadyExists: true };
  }

  const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    // 1) 메타 + 자막을 병렬 추출 (서로 의존성 없음) — 자막이 없으면 바로 실패 안내
    const [meta, transcript] = await Promise.all([
      getVideoMeta(videoId),
      getTranscriptViaSocialKit(videoId).catch((e) => {
        console.warn("[jejutube] SocialKit 자막 실패:", e instanceof Error ? e.message : e);
        return null;
      }),
    ]);
    if (!transcript) {
      return {
        ok: false,
        error: "이 영상은 자막이 없어 분석할 수 없어요. 자막이 있는 영상으로 시도해주세요.",
        status: 422,
      };
    }

    // 2) 자막 → GPT-5 mini 스팟 추출 (잘림/일시오류 대비 1회 재시도)
    let extracted: Extracted | null = null;
    for (let attempt = 0; attempt < 2 && !extracted; attempt++) {
      try {
        extracted = await extractSpotsViaGPT(transcript, meta.title);
      } catch (e) {
        console.warn(`[jejutube] GPT 추출 시도 ${attempt + 1} 실패:`, e instanceof Error ? e.message : e);
      }
    }
    if (!extracted) {
      return { ok: false, error: "영상 분석에 실패했어요. 잠시 후 다시 시도해주세요.", status: 503 };
    }

    if (!extracted.spots || extracted.spots.length === 0) {
      return { ok: false, error: "영상에서 제주 스팟을 찾지 못했어요", status: 422 };
    }

    // 3) 지오코딩 + 제목 스팟 보완을 병렬 실행 (제목 보완은 스팟 이름만 필요 — 좌표 불필요)
    const gptSpots = extracted.spots.slice(0, 12);
    const [geocoded, titleExtra] = await Promise.all([
      geocodeSpots(gptSpots, meta.title),
      enrichSpotsFromTitle(meta.title, gptSpots),
    ]);
    const spots = [...geocoded, ...titleExtra].slice(0, 15);

    const video: JejutubeVideo = {
      videoId,
      url: cleanUrl,
      title: meta.title || extracted.tags[0] || "제주 여행 영상",
      author: meta.author,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      summary: extracted.summary,
      tags: extracted.tags ?? [],
      spots,
      transcriptSource: "socialkit",
      createdAt: Date.now(),
      ...(addedBy ? { addedBy: addedBy.uid, addedByName: addedBy.name ?? "" } : {}),
    };

    await db.collection("jejutube_videos").doc(videoId).set(video);
    return { ok: true, video, alreadyExists: false };
  } catch (e) {
    console.error("[jejutube] 분석 실패:", e);
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `분석 실패: ${msg.slice(0, 200)}`, status: 500 };
  }
}
