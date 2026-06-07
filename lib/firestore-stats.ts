import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export type UserTier = "anonymous" | "free" | "biz" | "admin";

const ACTIVE_THRESHOLD_MS = 90 * 1000; // 90초 이내 ping = 활성

export type Session = {
  sessionId: string;
  userId: string;
  userTier: UserTier;
  cctvId: string;
  cctvName: string;
  startedAt: Date;
  lastPing: Date;
};

export type ViewLog = {
  userId: string;
  userTier: UserTier;
  cctvId: string;
  cctvName: string;
  startedAt: Date;
  endedAt: Date;
  durationSec: number;
  date: string; // YYYY-MM-DD
};

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── 세션 시작 / heartbeat ───────────────────────────────
export async function upsertSession(input: {
  sessionId: string;
  userId: string;
  userTier: UserTier;
  cctvId: string;
  cctvName: string;
}): Promise<void> {
  const db = getAdminDb();
  const ref = db.collection("stats_sessions").doc(input.sessionId);
  const snap = await ref.get();
  const now = new Date();

  if (snap.exists) {
    // 기존 세션 → lastPing만 갱신
    await ref.update({ lastPing: now });
  } else {
    // 새 세션 시작
    await ref.set({
      sessionId: input.sessionId,
      userId: input.userId,
      userTier: input.userTier,
      cctvId: input.cctvId,
      cctvName: input.cctvName,
      startedAt: now,
      lastPing: now,
    });
  }
}

// ── 세션 종료 + view log 기록 ───────────────────────────
export async function endSession(sessionId: string): Promise<void> {
  const db = getAdminDb();
  const ref = db.collection("stats_sessions").doc(sessionId);
  const snap = await ref.get();
  if (!snap.exists) return;

  const data = snap.data()!;
  const startedAt = (data.startedAt as Timestamp).toDate();
  const endedAt = new Date();
  const durationSec = Math.round((endedAt.getTime() - startedAt.getTime()) / 1000);

  // 5초 미만은 무시 (오인 클릭)
  if (durationSec >= 5) {
    await db.collection("stats_views").add({
      userId: data.userId,
      userTier: data.userTier,
      cctvId: data.cctvId,
      cctvName: data.cctvName,
      startedAt,
      endedAt,
      durationSec,
      date: todayDate(),
    });
  }

  await ref.delete();
}

// ── 활성 세션 조회 (어드민 대시보드용) ────────────────────
export async function getActiveSessions(): Promise<Session[]> {
  const db = getAdminDb();
  const cutoff = new Date(Date.now() - ACTIVE_THRESHOLD_MS);
  const snap = await db.collection("stats_sessions")
    .where("lastPing", ">=", cutoff)
    .get();

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      sessionId: data.sessionId,
      userId: data.userId,
      userTier: data.userTier,
      cctvId: data.cctvId,
      cctvName: data.cctvName,
      startedAt: (data.startedAt as Timestamp).toDate(),
      lastPing: (data.lastPing as Timestamp).toDate(),
    };
  });
}

// ── 만료된 세션 정리 (이미 ping 끊긴 세션) ─────────────────
export async function cleanupStaleSessions(): Promise<number> {
  const db = getAdminDb();
  const cutoff = new Date(Date.now() - ACTIVE_THRESHOLD_MS);
  const snap = await db.collection("stats_sessions")
    .where("lastPing", "<", cutoff)
    .limit(100)
    .get();

  let count = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    const startedAt = (data.startedAt as Timestamp).toDate();
    const endedAt = (data.lastPing as Timestamp).toDate(); // 마지막 ping을 종료로
    const durationSec = Math.round((endedAt.getTime() - startedAt.getTime()) / 1000);

    if (durationSec >= 5) {
      await db.collection("stats_views").add({
        userId: data.userId,
        userTier: data.userTier,
        cctvId: data.cctvId,
        cctvName: data.cctvName,
        startedAt,
        endedAt,
        durationSec,
        date: endedAt.toISOString().slice(0, 10),
      });
    }
    await doc.ref.delete();
    count++;
  }
  return count;
}

// ── 오늘의 시청 로그 ──────────────────────────────────
export async function getTodayViews(): Promise<ViewLog[]> {
  const db = getAdminDb();
  const snap = await db.collection("stats_views")
    .where("date", "==", todayDate())
    .get();

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      userId: data.userId,
      userTier: data.userTier,
      cctvId: data.cctvId,
      cctvName: data.cctvName,
      startedAt: (data.startedAt as Timestamp).toDate(),
      endedAt: (data.endedAt as Timestamp).toDate(),
      durationSec: data.durationSec,
      date: data.date,
    };
  });
}

// ── 최근 N일 시청 로그 ────────────────────────────────
export async function getRecentViews(days = 7): Promise<ViewLog[]> {
  const db = getAdminDb();
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }

  const snap = await db.collection("stats_views")
    .where("date", "in", dates)
    .get();

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      userId: data.userId,
      userTier: data.userTier,
      cctvId: data.cctvId,
      cctvName: data.cctvName,
      startedAt: (data.startedAt as Timestamp).toDate(),
      endedAt: (data.endedAt as Timestamp).toDate(),
      durationSec: data.durationSec,
      date: data.date,
    };
  });
}
