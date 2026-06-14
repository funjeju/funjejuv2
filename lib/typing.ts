import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { TypingPassage, TypingScore } from "@/types/typing";

const PASSAGES = "typing_passages";
const SCORES = "typing_scores";

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
