import "server-only";
import sharp from "sharp";
import { getAdminDb } from "@/lib/firebase-admin";
import { generatePoster, pickPosterStyle } from "@/lib/spot-poster";
import { generateVariant } from "@/lib/spot-ai";
import { createGame, saveSpotImageBuffer, listUsedFeedIds } from "@/lib/spot";
import type { SpotGame } from "@/types/spot";

/**
 * 라이브 피드(맛집·카페) → 틀린그림 draft 자동 생성 (완전 무인 크론).
 *  ① 피드 실사진 + placeName + aiCopy 로 "포스터 1장" 생성 (원본 음식 유지 + 보정 + 스타일 8종 로테이션)
 *  ② 그 포스터를 generateVariant에 넘겨 gpt-image-2가 변형 5곳 생성 (마커는 어드민이 직접 체크)
 *     → 원본 쪽은 100% 포스터(실사진), 변형 쪽도 5곳 빼면 동일 (음식 재생성 안 함)
 *  ③ 마커까지 채운 채 draft 적재. 관리자는 검수 큐에서 자동 마커를 검수하고 발행. (자동발행 아님)
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

/** 후보 1건 → 포스터 생성(원본 유지) → generateVariant 변형 → draft 적재 (마커는 어드민 검수). */
export async function ingestOneSpotDiff(c: Candidate): Promise<string> {
  const { base64, mime } = await fetchImageBase64(c.imageUrl);

  // 포스터 스타일 로테이션 — feedId 해시로 결정(같은 피드=같은 스타일, 피드별 골고루 분산)
  const style = pickPosterStyle(c.feedId);

  // ① 실사진 → 포스터 1장 (음식 그대로, 보정 + 스타일 디자인)
  const { posterBase64, styleName } = await generatePoster({
    foodBase64: base64,
    mimeType: mime,
    shop: { shopName: c.placeName, copy: c.aiCopy },
    style,
  });

  // ② 포스터 → 변형 5곳 (gpt-image-2 통째로 생성, 마커 없음 → 어드민 체크)
  const v = await generateVariant({ origBase64: posterBase64, mimeType: "image/png", count: 5, level: "medium" });

  // 원본(정규화된 포스터) 비율로 배치 결정 — 세로=좌우(side), 가로=상하(stack)
  const meta = await sharp(Buffer.from(v.origBase64, "base64")).metadata();
  const layout = (meta.width ?? 0) >= (meta.height ?? 1) ? "stack" : "side";

  const [origUrl, varUrl] = await Promise.all([
    saveSpotImageBuffer(Buffer.from(v.origBase64, "base64"), "orig", v.mimeType),
    saveSpotImageBuffer(Buffer.from(v.variantBase64, "base64"), "var", v.mimeType),
  ]);

  const game: SpotGame = {
    id: crypto.randomUUID(),
    title: `${c.placeName} 틀린그림찾기`,
    origImage: origUrl,
    variantImage: varUrl,
    layout,
    markers: [],                  // 어드민이 직접 마킹
    diffCount: v.markers.length,
    status: "draft",
    createdAt: Date.now(),
    sourceFeedId: c.feedId,
    sourceImageUrl: c.imageUrl,
    autoStatus: "pending_review",
    posterStyle: styleName,
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
