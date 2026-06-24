import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { getEntitlements } from "@/lib/entitlements";
import { getUserPlan } from "@/lib/users";
import type { PlanId } from "@/lib/plans";

export type UserTier = "anonymous" | "free" | "biz" | "admin";

const ACTIVE_THRESHOLD_MS = 90 * 1000; // 90초 이내 ping = 활성

// heartbeat 1회로 누적할 수 있는 최대 초 — 탭 백그라운드 복귀 시 과차감 방지.
// 정상 ping 간격(30초)의 3배. 이보다 길면 그 사이 안 봤다고 간주.
const MAX_HEARTBEAT_DELTA_SEC = 90;

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

// ── 시청예산: heartbeat 기반 계정 단위 누적·판정 ──────────
//
// 핵심: 같은 userId의 모든 창/기기가 같은 budget 문서(`{userId}__{date}`)에
// 누적되므로, 여러 창으로 띄워도 합산되어 우회가 막힌다.
// delta = (직전 ping 이후 경과초) × activeStreams(분할 수) — 9분할이면 9배 차감.

export type WatchBudgetResult = {
  usedSeconds: number;   // 오늘 누적 (스트림·초)
  limitSeconds: number;  // 하루 한도 (스트림·초). -1=무제한
  exhausted: boolean;
  unlimited: boolean;
};

export async function recordHeartbeat(input: {
  sessionId: string;
  userId: string;
  userTier: UserTier;
  cctvId: string;
  cctvName: string;
  activeStreams: number;
}): Promise<WatchBudgetResult> {
  const db = getAdminDb();
  const now = new Date();
  const streams = Math.max(0, Math.floor(input.activeStreams) || 0);

  // 1) 세션 upsert + 직전 ping 기준 delta 계산
  const sessRef = db.collection("stats_sessions").doc(input.sessionId);
  const snap = await sessRef.get();
  let deltaStreamSec = 0;

  if (snap.exists) {
    const prevPing = (snap.data()!.lastPing as Timestamp).toDate();
    const elapsed = Math.min(
      MAX_HEARTBEAT_DELTA_SEC,
      Math.max(0, (now.getTime() - prevPing.getTime()) / 1000)
    );
    deltaStreamSec = Math.round(elapsed * streams);
    await sessRef.update({
      lastPing: now,
      activeStreams: streams,
      cctvId: input.cctvId,
      cctvName: input.cctvName,
    });
  } else {
    await sessRef.set({
      sessionId: input.sessionId,
      userId: input.userId,
      userTier: input.userTier,
      cctvId: input.cctvId,
      cctvName: input.cctvName,
      activeStreams: streams,
      startedAt: now,
      lastPing: now,
    });
    // 첫 ping은 경과시간이 없으므로 delta=0
  }

  // 2) 한도 판정 — entitlements 단일 진입점 (베타/정식 모드 자동 반영)
  //    정식 모드에선 users/{uid}.plan으로 등급별 시청시간 한도 적용 (admin/비회원은 조회 생략)
  const loggedIn = !input.userId.startsWith("anon_");
  const isAdmin = input.userTier === "admin";
  let plan: PlanId | undefined;
  if (loggedIn && !isAdmin) plan = await getUserPlan(input.userId);
  const ent = getEntitlements({ loggedIn, plan });
  const limitMin = ent.limits.cctvMinutesPerDay;
  const unlimited = isAdmin || limitMin === -1;

  // 3) 누적 (delta>0일 때만, 원자적 increment)
  //    어드민/무제한도 "얼마나 쓰고 있나"(=Cloudflare 요청·비용 추정)를 보려고 누적은 한다.
  //    차단(exhausted)만 안 할 뿐. 일반 유저는 한도 대비 차감(아래로), 어드민은 누적 표시(위로).
  const date = todayDate();
  const budgetRef = db.collection("stats_watch_budget").doc(`${input.userId}__${date}`);

  if (deltaStreamSec > 0) {
    await budgetRef.set(
      {
        userId: input.userId,
        userTier: input.userTier,
        date,
        usedStreamSeconds: FieldValue.increment(deltaStreamSec),
        updatedAt: now,
      },
      { merge: true }
    );
  }

  // 4) 현재 누적값 조회
  const bsnap = await budgetRef.get();
  const used = bsnap.exists ? ((bsnap.data()!.usedStreamSeconds as number) ?? 0) : 0;

  if (unlimited) {
    // 무제한(어드민): 위로 카운트만. 차단 없음.
    return { usedSeconds: used, limitSeconds: -1, exhausted: false, unlimited: true };
  }

  const limitSeconds = limitMin * 60;
  return {
    usedSeconds: used,
    limitSeconds,
    exhausted: used >= limitSeconds,
    unlimited: false,
  };
}

// ── 시청예산 집계 (어드민 Cloudflare 비용 추정용) ──────────
export type WatchCostSummary = {
  monthSeconds: number;       // 이번 달 전체 시청 스트림·초
  monthSecondsExAdmin: number;// 어드민 제외 (실제 유저 비용)
  todaySeconds: number;       // 오늘 전체
  adminSeconds: number;       // 어드민(나) 누적
  userCount: number;          // 이번 달 시청한 고유 유저 수
};

export async function getWatchCostSummary(): Promise<WatchCostSummary> {
  const db = getAdminDb();
  const now = new Date();
  const monthStart = now.toISOString().slice(0, 7) + "-01"; // YYYY-MM-01
  const today = todayDate();

  // date는 "YYYY-MM-DD" 문자열 — 사전순=시간순이라 범위 쿼리 가능
  const snap = await db.collection("stats_watch_budget").where("date", ">=", monthStart).get();

  let monthSeconds = 0, monthSecondsExAdmin = 0, todaySeconds = 0, adminSeconds = 0;
  const users = new Set<string>();

  for (const d of snap.docs) {
    const data = d.data();
    const sec = (data.usedStreamSeconds as number) ?? 0;
    const isAdmin = data.userTier === "admin";
    monthSeconds += sec;
    if (isAdmin) adminSeconds += sec;
    else monthSecondsExAdmin += sec;
    if (data.userId) users.add(data.userId as string);
    if (data.date === today) todaySeconds += sec;
  }

  return {
    monthSeconds,
    monthSecondsExAdmin,
    todaySeconds,
    adminSeconds,
    userCount: users.size,
  };
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

// ── 페이지뷰 기록 ─────────────────────────────────────
export type PageViewLog = {
  path: string;
  userId: string;
  userTier: UserTier;
  userAgent: string;
  referer: string;
  visitedAt: Date;
  date: string;
};

export async function logPageView(input: {
  path: string;
  userId: string;
  userTier: UserTier;
  userAgent?: string;
  referer?: string;
}): Promise<void> {
  const db = getAdminDb();
  await db.collection("stats_pageviews").add({
    path: input.path,
    userId: input.userId,
    userTier: input.userTier,
    userAgent: input.userAgent ?? "",
    referer: input.referer ?? "",
    visitedAt: new Date(),
    date: todayDate(),
  });
}

export async function getRecentPageViews(limit = 200): Promise<PageViewLog[]> {
  const db = getAdminDb();
  const snap = await db.collection("stats_pageviews")
    .orderBy("visitedAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      path: data.path,
      userId: data.userId,
      userTier: data.userTier,
      userAgent: data.userAgent ?? "",
      referer: data.referer ?? "",
      visitedAt: (data.visitedAt as Timestamp).toDate(),
      date: data.date,
    };
  });
}

// ── 섹션(유입 영역)별 집계 ────────────────────────────
const SECTION_RULES: { key: string; label: string; test: (p: string) => boolean }[] = [
  { key: "cctv",     label: "실시간 CCTV",   test: (p) => p.startsWith("/cctv") },
  { key: "food",     label: "도민맛집",      test: (p) => p.startsWith("/food") },
  { key: "game",     label: "틀린그림찾기",  test: (p) => p.startsWith("/game") },
  { key: "weather",  label: "제주 날씨",     test: (p) => p.startsWith("/weather") },
  { key: "content",  label: "매거진·웹진·카드", test: (p) => /^\/(webzine|magazine|card|daily|guide|qna)/.test(p) },
  { key: "minihome", label: "미니홈피",      test: (p) => p.startsWith("/minihome") || p.startsWith("/biz") },
  { key: "ai",       label: "제주여행 AI",   test: (p) => /^\/(jeju-ai|trip-ai|chat)/.test(p) },
  { key: "feed",     label: "라이브 피드",   test: (p) => p.startsWith("/feed") },
  { key: "youtube",  label: "제주tube",      test: (p) => p.startsWith("/youtube") },
  { key: "home",     label: "홈",            test: (p) => p === "/" },
];

export type SectionStat = { key: string; label: string; views: number; uniqueUsers: number };

/** 최근 N일 페이지뷰를 섹션별(CCTV·맛집·틀린그림 등)로 집계 */
export async function getSectionStats(days = 7): Promise<SectionStat[]> {
  const db = getAdminDb();
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const snap = await db.collection("stats_pageviews").where("date", ">=", since).limit(50000).get();

  const agg = new Map<string, { views: number; users: Set<string> }>();
  for (const doc of snap.docs) {
    const d = doc.data() as { path?: string; userId?: string };
    const path = d.path ?? "";
    const rule = SECTION_RULES.find((r) => r.test(path));
    const key = rule?.key ?? "etc";
    const cur = agg.get(key) ?? { views: 0, users: new Set<string>() };
    cur.views++;
    if (d.userId) cur.users.add(d.userId);
    agg.set(key, cur);
  }

  const out: SectionStat[] = SECTION_RULES.map((r) => {
    const a = agg.get(r.key);
    return { key: r.key, label: r.label, views: a?.views ?? 0, uniqueUsers: a?.users.size ?? 0 };
  });
  const etc = agg.get("etc");
  if (etc && etc.views > 0) out.push({ key: "etc", label: "기타", views: etc.views, uniqueUsers: etc.users.size });
  return out.sort((a, b) => b.uniqueUsers - a.uniqueUsers);
}

export async function getRecentViewLogs(limit = 200): Promise<ViewLog[]> {
  const db = getAdminDb();
  const snap = await db.collection("stats_views")
    .orderBy("endedAt", "desc")
    .limit(limit)
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
