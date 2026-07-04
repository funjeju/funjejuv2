import "server-only";
import { getAdminDb, getAdminApp } from "@/lib/firebase-admin";
import { getStorage } from "firebase-admin/storage";
import { FieldValue } from "firebase-admin/firestore";
import type { SpotGame, SpotScore, SpotComment } from "@/types/spot";

/**
 * 틀린그림찾기 저장소 (Admin SDK).
 * spot_games — 문제(이미지·좌표). spot_scores — 플레이 기록(최단시간 랭킹).
 * spot_comments — 클리어한 플레이어만 작성/열람 가능한 댓글.
 */

const GAMES = "spot_games";
const SCORES = "spot_scores";
const COMMENTS = "spot_comments";

export async function createGame(g: SpotGame): Promise<void> {
  await getAdminDb().collection(GAMES).doc(g.id).set(g);
}

/** 서버사이드 Storage 업로드 (크론·자동생성용 — 클라 업로드 API와 동일 형식 URL 반환) */
export async function saveSpotImageBuffer(buffer: Buffer, label: string, mime = "image/jpeg"): Promise<string> {
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!bucketName) throw new Error("Storage bucket 미설정");
  const ext = mime.includes("png") ? "png" : "jpg";
  const path = `spot/${Date.now()}-${label}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const token = crypto.randomUUID();
  const file = getStorage(getAdminApp()).bucket(bucketName).file(path);
  await file.save(buffer, { metadata: { contentType: mime, metadata: { firebaseStorageDownloadTokens: token } } });
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

/** 이미 틀린그림으로 생성된 피드 id 집합 — 크론 중복 생성 방지 */
export async function listUsedFeedIds(): Promise<Set<string>> {
  const snap = await getAdminDb().collection(GAMES).limit(500).get();
  const ids = new Set<string>();
  for (const d of snap.docs) {
    const fid = (d.data() as SpotGame).sourceFeedId;
    if (fid) ids.add(fid);
  }
  return ids;
}

export async function updateGame(
  id: string,
  updates: Partial<Pick<SpotGame, "title" | "markers" | "layout" | "diffCount" | "homepageUrl" | "homepageName">>
): Promise<void> {
  await getAdminDb().collection(GAMES).doc(id).update(updates);
}

export async function getGame(id: string): Promise<SpotGame | null> {
  const snap = await getAdminDb().collection(GAMES).doc(id).get();
  return snap.exists ? (snap.data() as SpotGame) : null;
}

export async function deleteGame(id: string): Promise<void> {
  await getAdminDb().collection(GAMES).doc(id).delete();
}

export async function setPublished(id: string, published: boolean): Promise<void> {
  await getAdminDb().collection(GAMES).doc(id).update({ status: published ? "published" : "draft" });
}

/** 어드민 목록 (전체, 최신순 — 복합 인덱스 회피 위해 메모리 정렬) */
export async function listGames(opts?: { publishedOnly?: boolean; limit?: number }): Promise<SpotGame[]> {
  let q = getAdminDb().collection(GAMES) as FirebaseFirestore.Query;
  if (opts?.publishedOnly) q = q.where("status", "==", "published");
  // orderBy 없이 limit를 걸면 Firestore가 임의 순서로 잘라오므로 최신 글이 누락된다.
  // 복합 인덱스 회피를 위해 후보를 넉넉히(최대 200) 가져와 메모리에서 최신순 정렬 후 자른다.
  const snap = await q.limit(200).get();
  const sorted = snap.docs
    .map((d) => d.data() as SpotGame)
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  return opts?.limit ? sorted.slice(0, opts.limit) : sorted;
}

export async function incrementPlay(id: string): Promise<void> {
  await getAdminDb().collection(GAMES).doc(id).update({ playCount: FieldValue.increment(1) }).catch(() => {});
}

/** 점수 기록 + 그 문제의 최단시간 랭킹 반환 */
export async function addScore(s: SpotScore): Promise<SpotScore[]> {
  const db = getAdminDb();
  await db.collection(SCORES).add(s);
  return topScores(s.gameId);
}

/** 문제별 최단시간 TOP N (단일 where + 메모리 정렬로 복합 인덱스 회피) */
export async function topScores(gameId: string, limit = 10): Promise<SpotScore[]> {
  const snap = await getAdminDb().collection(SCORES).where("gameId", "==", gameId).limit(200).get();
  return snap.docs
    .map((d) => d.data() as SpotScore)
    .sort((a, b) => a.timeMs - b.timeMs)
    .slice(0, limit);
}

/** 댓글 작성 (클리어한 플레이어만 — API에서 게이팅) */
export async function addComment(c: SpotComment): Promise<SpotComment[]> {
  await getAdminDb().collection(COMMENTS).add(c);
  return listComments(c.gameId);
}

/** 문제별 댓글 최신순 (단일 where + 메모리 정렬) */
export async function listComments(gameId: string, limit = 50): Promise<SpotComment[]> {
  const snap = await getAdminDb().collection(COMMENTS).where("gameId", "==", gameId).limit(200).get();
  return snap.docs
    .map((d) => d.data() as SpotComment)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}
