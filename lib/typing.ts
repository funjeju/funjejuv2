import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { TypingPassage, TypingScore, TypingSet, TypingSetScore } from "@/types/typing";

const PASSAGES = "typing_passages";
const SCORES = "typing_scores";
const SETS = "typing_sets";
const SET_SCORES = "typing_set_scores";

/** ISO 주차 키 (예: 2026-W24) */
export function weekKeyOf(d = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

// ── 지문(Passage) ────────────────────────────────────────
export async function createPassage(p: TypingPassage): Promise<void> {
  const clean = Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined));
  await getAdminDb().collection(PASSAGES).doc(p.id).set(clean);
}
export async function updatePassage(
  id: string,
  updates: Partial<Pick<TypingPassage, "text" | "businessName" | "homepageUrl" | "homepageName" | "kind" | "weightW" | "maxAttempts">>
): Promise<void> {
  await getAdminDb().collection(PASSAGES).doc(id).update(updates);
}
export async function setPassagePublished(id: string, published: boolean): Promise<void> {
  await getAdminDb().collection(PASSAGES).doc(id).update({ status: published ? "published" : "draft" });
}
export async function deletePassage(id: string): Promise<void> {
  await getAdminDb().collection(PASSAGES).doc(id).delete();
}
export async function getPassage(id: string): Promise<TypingPassage | null> {
  const snap = await getAdminDb().collection(PASSAGES).doc(id).get();
  return snap.exists ? (snap.data() as TypingPassage) : null;
}
export async function listPassages(opts?: { publishedOnly?: boolean }): Promise<TypingPassage[]> {
  const snap = await getAdminDb().collection(PASSAGES).orderBy("createdAt", "desc").limit(100).get();
  let items = snap.docs.map((d) => d.data() as TypingPassage);
  if (opts?.publishedOnly) items = items.filter((p) => p.status === "published");
  return items;
}

// ── 기록(Score) ──────────────────────────────────────────
/**
 * 점수 제출 — 1인 1주 1도큐먼트(최고기록 유지). 주당 도전 횟수 제한 검사.
 * 반환: blocked(도전횟수 초과) | best 기록 + 남은 횟수.
 */
export async function submitScore(opts: {
  passageId: string; userId: string; name: string;
  cpm: number; accuracy: number; score: number; maxAttempts: number;
}): Promise<{ blocked: boolean; bestScore: number; attempts: number; attemptsLeft: number | null }> {
  const db = getAdminDb();
  const wk = weekKeyOf();
  const ref = db.collection(SCORES).doc(`${opts.passageId}__${opts.userId}__${wk}`);
  const res = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const prev = snap.exists ? (snap.data() as TypingScore) : null;
    const attempts = prev?.attempts ?? 0;
    if (opts.maxAttempts > 0 && attempts >= opts.maxAttempts) {
      return { blocked: true, bestScore: prev?.bestScore ?? 0, attempts, attemptsLeft: 0 };
    }
    const newAttempts = attempts + 1;
    const isBest = opts.score > (prev?.bestScore ?? -1);
    const doc: TypingScore = {
      passageId: opts.passageId,
      userId: opts.userId,
      name: opts.name,
      weekKey: wk,
      bestScore: isBest ? opts.score : (prev?.bestScore ?? 0),
      bestCpm: isBest ? opts.cpm : (prev?.bestCpm ?? 0),
      bestAccuracy: isBest ? opts.accuracy : (prev?.bestAccuracy ?? 0),
      attempts: newAttempts,
      updatedAt: Date.now(),
    };
    tx.set(ref, doc);
    return {
      blocked: false,
      bestScore: doc.bestScore,
      attempts: newAttempts,
      attemptsLeft: opts.maxAttempts > 0 ? Math.max(0, opts.maxAttempts - newAttempts) : null,
    };
  });
  if (!res.blocked) {
    await db.collection(PASSAGES).doc(opts.passageId).update({ playCount: FieldValue.increment(1) }).catch(() => {});
  }
  return res;
}

/** 이번 주 도전 횟수 (제한 표시용) */
export async function getUserAttempts(passageId: string, userId: string): Promise<number> {
  const snap = await getAdminDb().collection(SCORES).doc(`${passageId}__${userId}__${weekKeyOf()}`).get();
  return snap.exists ? ((snap.data() as TypingScore).attempts ?? 0) : 0;
}

/** 이번 주 주간 순위 (해당 지문) */
export async function weeklyTop(passageId: string, limit = 20): Promise<TypingScore[]> {
  const snap = await getAdminDb().collection(SCORES)
    .where("passageId", "==", passageId)
    .where("weekKey", "==", weekKeyOf())
    .get();
  return snap.docs.map((d) => d.data() as TypingScore).sort((a, b) => b.bestScore - a.bestScore).slice(0, limit);
}

// ── 묶음 세트(Set) ───────────────────────────────────────
export async function createSet(s: TypingSet): Promise<void> {
  const clean = Object.fromEntries(Object.entries(s).filter(([, v]) => v !== undefined));
  await getAdminDb().collection(SETS).doc(s.id).set(clean);
}
export async function updateSet(
  id: string,
  updates: Partial<Pick<TypingSet, "title" | "businessName" | "homepageUrl" | "homepageName" | "passageIds" | "maxAttempts">>
): Promise<void> {
  await getAdminDb().collection(SETS).doc(id).update(updates);
}
export async function setSetPublished(id: string, published: boolean): Promise<void> {
  await getAdminDb().collection(SETS).doc(id).update({ status: published ? "published" : "draft" });
}
export async function deleteSet(id: string): Promise<void> {
  await getAdminDb().collection(SETS).doc(id).delete();
}
export async function getSet(id: string): Promise<TypingSet | null> {
  const snap = await getAdminDb().collection(SETS).doc(id).get();
  return snap.exists ? (snap.data() as TypingSet) : null;
}
export async function listSets(opts?: { publishedOnly?: boolean }): Promise<TypingSet[]> {
  const snap = await getAdminDb().collection(SETS).orderBy("createdAt", "desc").limit(100).get();
  let items = snap.docs.map((d) => d.data() as TypingSet);
  if (opts?.publishedOnly) items = items.filter((s) => s.status === "published");
  return items;
}
/** 세트 구성 지문들을 passageIds 순서대로 반환(발행 여부 무관 — 세트가 발행이면 구성지문도 플레이 가능) */
export async function getSetPassages(set: TypingSet): Promise<TypingPassage[]> {
  if (!set.passageIds.length) return [];
  const refs = set.passageIds.map((id) => getAdminDb().collection(PASSAGES).doc(id));
  const snaps = await getAdminDb().getAll(...refs);
  const byId = new Map(snaps.filter((s) => s.exists).map((s) => [s.id, s.data() as TypingPassage]));
  return set.passageIds.map((id) => byId.get(id)).filter((p): p is TypingPassage => !!p);
}

/** 세트 점수 제출 — 1인 1주 1도큐먼트(평균 최고기록). 주당 도전 제한. */
export async function submitSetScore(opts: {
  setId: string; userId: string; name: string;
  avgScore: number; avgCpm: number; avgAccuracy: number; maxAttempts: number;
}): Promise<{ blocked: boolean; bestAvgScore: number; attempts: number; attemptsLeft: number | null }> {
  const db = getAdminDb();
  const wk = weekKeyOf();
  const ref = db.collection(SET_SCORES).doc(`${opts.setId}__${opts.userId}__${wk}`);
  const res = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const prev = snap.exists ? (snap.data() as TypingSetScore) : null;
    const attempts = prev?.attempts ?? 0;
    if (opts.maxAttempts > 0 && attempts >= opts.maxAttempts) {
      return { blocked: true, bestAvgScore: prev?.bestAvgScore ?? 0, attempts, attemptsLeft: 0 };
    }
    const newAttempts = attempts + 1;
    const isBest = opts.avgScore > (prev?.bestAvgScore ?? -1);
    const doc: TypingSetScore = {
      setId: opts.setId, userId: opts.userId, name: opts.name, weekKey: wk,
      bestAvgScore: isBest ? opts.avgScore : (prev?.bestAvgScore ?? 0),
      bestAvgCpm: isBest ? opts.avgCpm : (prev?.bestAvgCpm ?? 0),
      bestAvgAccuracy: isBest ? opts.avgAccuracy : (prev?.bestAvgAccuracy ?? 0),
      attempts: newAttempts, updatedAt: Date.now(),
    };
    tx.set(ref, doc);
    return { blocked: false, bestAvgScore: doc.bestAvgScore, attempts: newAttempts, attemptsLeft: opts.maxAttempts > 0 ? Math.max(0, opts.maxAttempts - newAttempts) : null };
  });
  if (!res.blocked) await db.collection(SETS).doc(opts.setId).update({ playCount: FieldValue.increment(1) }).catch(() => {});
  return res;
}

export async function getUserSetAttempts(setId: string, userId: string): Promise<number> {
  const snap = await getAdminDb().collection(SET_SCORES).doc(`${setId}__${userId}__${weekKeyOf()}`).get();
  return snap.exists ? ((snap.data() as TypingSetScore).attempts ?? 0) : 0;
}

export async function setWeeklyTop(setId: string, limit = 20): Promise<TypingSetScore[]> {
  const snap = await getAdminDb().collection(SET_SCORES)
    .where("setId", "==", setId).where("weekKey", "==", weekKeyOf()).get();
  return snap.docs.map((d) => d.data() as TypingSetScore).sort((a, b) => b.bestAvgScore - a.bestAvgScore).slice(0, limit);
}
