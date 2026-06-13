import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
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

export async function updateGame(
  id: string,
  updates: Partial<Pick<SpotGame, "title" | "markers" | "layout" | "diffCount">>
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
  const snap = await q.limit(opts?.limit ?? 200).get();
  return snap.docs
    .map((d) => d.data() as SpotGame)
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
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
