import "server-only";
import { GoogleGenAI, Type } from "@google/genai";
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

// ── Gemini 스팟 추출 ────────────────────────────────────────
const EXTRACT_SYSTEM = `너는 제주 여행 유튜브를 분석해서 핵심 스팟을 뽑아주는 큐레이터야.

[규칙]
- 제주가 아닌 장소는 제외
- 실제 존재하는 정확한 장소명만 (확실치 않으면 빼)
- 일반명사(바다, 카페 등)가 아니라 고유 장소명만
- timestamp는 자막의 [MM:SS] 표기 기준, 없으면 "00:00"
- 카테고리: 해변/오름/카페/맛집/관광지/액티비티/숙소 중 하나
- summary는 3-4문장, 친근한 반말`;

const EXTRACT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING, description: "영상 요약 3-4문장 반말" },
    spots: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          category: { type: Type.STRING, description: "해변/오름/카페/맛집/관광지/액티비티/숙소" },
          description: { type: Type.STRING, description: "영상 속 맥락 1문장 반말" },
          timestamp: { type: Type.STRING, description: "MM:SS" },
          emoji: { type: Type.STRING },
        },
        required: ["name", "category", "description", "timestamp", "emoji"],
      },
    },
    tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "키워드 3-5개" },
  },
  required: ["summary", "spots", "tags"],
};

type Extracted = { summary: string; spots: JejutubeSpot[]; tags: string[] };

/** 과부하(503/429) 시 flash → flash-lite 폴백 */
async function genWithFallback(
  ai: GoogleGenAI,
  parts: Array<{ text: string } | { fileData: { fileUri: string; mimeType: string } }>
) {
  const call = (model: string) =>
    ai.models.generateContent({
      model,
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction: EXTRACT_SYSTEM,
        responseMimeType: "application/json",
        responseSchema: EXTRACT_SCHEMA,
        temperature: 0.3,
        maxOutputTokens: 4096,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
  try {
    return await call("gemini-2.5-flash");
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status !== 503 && status !== 429) throw e;
    await new Promise((r) => setTimeout(r, 1200));
    return await call("gemini-2.5-flash-lite");
  }
}

// ── 카카오 지오코딩 ─────────────────────────────────────────
function inJeju(lat: number, lng: number): boolean {
  return lat >= 33.1 && lat <= 33.65 && lng >= 126.1 && lng <= 127.0;
}

async function geocodeSpots(spots: JejutubeSpot[]): Promise<JejutubeSpot[]> {
  if (!KAKAO_REST_KEY) return spots;
  const out: JejutubeSpot[] = [];
  for (const spot of spots) {
    const enriched = { ...spot };
    try {
      const res = await fetch(
        `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(`제주 ${spot.name}`)}&size=3`,
        { headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` }, signal: AbortSignal.timeout(5000) }
      );
      if (res.ok) {
        const data = (await res.json()) as {
          documents?: Array<{ road_address_name?: string; address_name?: string; x: string; y: string }>;
        };
        const hit = (data.documents ?? []).find((d) => inJeju(Number(d.y), Number(d.x)));
        if (hit) {
          enriched.lat = Number(hit.y);
          enriched.lng = Number(hit.x);
          enriched.address = hit.road_address_name || hit.address_name;
        }
      }
    } catch { /* 좌표 없이 저장 */ }
    out.push(enriched);
  }
  return out;
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
  addedBy?: { uid: string; name?: string }
): Promise<AnalyzeResult> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return { ok: false, error: "GOOGLE_AI_API_KEY 미설정", status: 500 };

  const videoId = extractVideoId(url);
  if (!videoId) return { ok: false, error: "올바른 유튜브 URL을 입력해주세요", status: 400 };

  const db = getAdminDb();

  // 이미 분석된 영상이면 그대로 반환 (공유 풀 — 재분석 비용 절약)
  const existing = await db.collection("jejutube_videos").doc(videoId).get();
  if (existing.exists) {
    return { ok: true, video: existing.data() as JejutubeVideo, alreadyExists: true };
  }

  const ai = new GoogleGenAI({ apiKey });
  const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    const meta = await getVideoMeta(videoId);

    let extracted: Extracted;
    let source: JejutubeVideo["transcriptSource"] = "socialkit";
    try {
      const transcript = await getTranscriptViaSocialKit(videoId);
      const res = await genWithFallback(ai, [
        { text: `영상 제목: ${meta.title}\n\n자막:\n${transcript.slice(0, 24000)}\n\n위 제주 여행 영상에서 스팟을 추출해줘.` },
      ]);
      if (!res.text) throw new Error("EXTRACT_EMPTY");
      extracted = JSON.parse(res.text) as Extracted;
    } catch (e) {
      console.warn("[jejutube] SocialKit 실패 → Gemini 영상 분석 폴백:", e instanceof Error ? e.message : e);
      source = "gemini-video";
      const res = await genWithFallback(ai, [
        { fileData: { fileUri: cleanUrl, mimeType: "video/*" } },
        { text: "이 제주 여행 유튜브 영상을 분석해서 스팟을 추출해줘." },
      ]);
      if (!res.text) throw new Error("VIDEO_EXTRACT_EMPTY");
      extracted = JSON.parse(res.text) as Extracted;
    }

    if (!extracted.spots || extracted.spots.length === 0) {
      return { ok: false, error: "영상에서 제주 스팟을 찾지 못했어요", status: 422 };
    }

    const spots = await geocodeSpots(extracted.spots.slice(0, 12));

    const video: JejutubeVideo = {
      videoId,
      url: cleanUrl,
      title: meta.title || extracted.tags[0] || "제주 여행 영상",
      author: meta.author,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      summary: extracted.summary,
      tags: extracted.tags ?? [],
      spots,
      transcriptSource: source,
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
