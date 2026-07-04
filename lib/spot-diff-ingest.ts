import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import { generatePoster } from "@/lib/spot-poster";
import { sliceCombined } from "@/lib/spot-slice";
import { createGame, saveSpotImageBuffer, listUsedFeedIds } from "@/lib/spot";
import type { SpotGame } from "@/types/spot";

/**
 * 라이브 피드(맛집·카페) → 틀린그림 draft 자동 생성 (완전 무인 크론).
 *  피드 사진 + placeName + aiCopy 로 포스터+틀린그림 합본을 만들고 → 좌·우/상·하로 슬라이스 →
 *  마커는 비운 채(markers=[]) draft 로 적재. 관리자는 검수 큐에서 잘린 결과물만 열어
 *  틀린 곳 5개를 클릭하고 발행한다. (자동발행 아님)
 */

const FOOD_CATEGORIES = new Set(["맛집", "카페"]);

type Candidate = {
  feedId: string;
  imageUrl: string;
  placeName: string;
  aiCopy?: string;
  homepageUrl?: string;
  homepageName?: string;
};

/** 아직 틀린그림으로 안 만든 맛집·카페 피드 후보 (최신순) */
export async function listSpotDiffCandidates(max = 20): Promise<Candidate[]> {
  const used = await listUsedFeedIds();
  const snap = await getAdminDb().collection("feeds").orderBy("createdAt", "desc").limit(120).get();
  const out: Candidate[] = [];
  for (const d of snap.docs) {
    if (used.has(d.id)) continue;
    const v = d.data() as {
      imageUrl?: string; images?: string[]; category?: string; placeName?: string;
      aiCopy?: string; homepageUrl?: string; homepageName?: string;
    };
    if (!v.category || !FOOD_CATEGORIES.has(v.category)) continue;
    const imageUrl = (Array.isArray(v.images) && v.images[0]) || v.imageUrl;
    if (!imageUrl || !v.placeName?.trim()) continue; // 업소명 없으면 포스터 못 만듦 → 스킵
    out.push({
      feedId: d.id,
      imageUrl,
      placeName: v.placeName.trim(),
      aiCopy: v.aiCopy,
      homepageUrl: v.homepageUrl,
      homepageName: v.homepageName,
    });
    if (out.length >= max) break;
  }
  return out;
}

async function fetchImageBase64(url: string): Promise<{ base64: string; mime: string }> {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`이미지 다운로드 실패 (${res.status})`);
  const mime = res.headers.get("content-type") || "image/jpeg";
  const buf = Buffer.from(await res.arrayBuffer());
  return { base64: buf.toString("base64"), mime };
}

/** 후보 1건 → 포스터 생성 → 슬라이스 → draft 적재. 생성된 게임 id 반환. */
export async function ingestOneSpotDiff(c: Candidate): Promise<string> {
  const { base64, mime } = await fetchImageBase64(c.imageUrl);

  const { combinedBase64 } = await generatePoster({
    foodBase64: base64,
    mimeType: mime,
    shop: { shopName: c.placeName, copy: c.aiCopy },
  });

  const sliced = await sliceCombined({ combinedBase64, mimeType: "image/png" });

  const [origUrl, varUrl] = await Promise.all([
    saveSpotImageBuffer(Buffer.from(sliced.origBase64, "base64"), "orig", sliced.mimeType),
    saveSpotImageBuffer(Buffer.from(sliced.variantBase64, "base64"), "var", sliced.mimeType),
  ]);

  const game: SpotGame = {
    id: crypto.randomUUID(),
    title: `${c.placeName} 틀린그림찾기`,
    origImage: origUrl,
    variantImage: varUrl,
    layout: sliced.layout,
    markers: [],            // 관리자가 검수 단계에서 클릭
    diffCount: 0,
    status: "draft",
    createdAt: Date.now(),
    sourceFeedId: c.feedId,
    sourceImageUrl: c.imageUrl,
    autoStatus: "pending_review",
    ...(c.homepageUrl ? { homepageUrl: c.homepageUrl } : {}),
    ...(c.homepageName ? { homepageName: c.homepageName } : {}),
  };
  await createGame(game);
  return game.id;
}

export type IngestSummary = { created: string[]; skipped: number; errors: string[] };

/** 후보 최대 n건을 순차 생성 (크론 진입점) */
export async function ingestDailySpotDiffs(n = 2): Promise<IngestSummary> {
  const candidates = await listSpotDiffCandidates(n * 2);
  const summary: IngestSummary = { created: [], skipped: 0, errors: [] };
  for (const c of candidates) {
    if (summary.created.length >= n) break;
    try {
      const id = await ingestOneSpotDiff(c);
      summary.created.push(id);
    } catch (e) {
      summary.errors.push(`${c.placeName}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  summary.skipped = Math.max(0, candidates.length - summary.created.length - summary.errors.length);
  return summary;
}
