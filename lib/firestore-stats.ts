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
  { key: "watch",    label: "CCTV 영상 창",  test: (p) => p.startsWith("/watch") },
  { key: "promo",    label: "업소 홍보",     test: (p) => p.startsWith("/promo") },
  { key: "home",     label: "홈",            test: (p) => p === "/" },
];

/** 섹션 key → 이름 (요약 문서에 남은 key를 화면 이름으로 바꿀 때) */
export const SECTION_LABELS: Record<string, string> = {
  ...Object.fromEntries(SECTION_RULES.map((r) => [r.key, r.label])),
  etc: "기타",
};

export type SectionStat = { key: string; label: string; views: number; uniqueUsers: number };

/**
 * 하루치 섹션 집계 요약 — `stats_daily/{YYYY-MM-DD}` 문서 구조.
 * users는 7일 순방문자를 정확히 합집합으로 구하기 위해 id 목록을 그대로 보관한다
 * (일별 순방문자를 단순 합산하면 재방문자가 중복 계산됨).
 */
type DailyRollup = {
  date: string;
  sections: Record<string, { views: number; users: string[] }>;
  /** 날짜가 끝나 값이 확정된 경우 true — 이후 재계산하지 않는다 */
  final: boolean;
  computedAt: number;
};

/** 섹션당 보관할 최대 userId 수 — 문서 1MB 한도 방어 */
const ROLLUP_USER_CAP = 3000;
/** 오늘치 요약 재사용 시간 — 연속 클릭 시 원본 재스캔 방지 */
const TODAY_ROLLUP_TTL_MS = 5 * 60 * 1000;

function sectionKeyFor(path: string): string {
  return SECTION_RULES.find((r) => r.test(path))?.key ?? "etc";
}

/** 특정 날짜의 원본 페이지뷰를 스캔해 섹션별 요약을 만든다 (하루치만 읽음) */
async function computeDailyRollup(date: string): Promise<DailyRollup> {
  const db = getAdminDb();
  const snap = await db.collection("stats_pageviews").where("date", "==", date).limit(50000).get();

  const agg = new Map<string, { views: number; users: Set<string> }>();
  for (const doc of snap.docs) {
    const d = doc.data() as { path?: string; userId?: string };
    const key = sectionKeyFor(d.path ?? "");
    const cur = agg.get(key) ?? { views: 0, users: new Set<string>() };
    cur.views++;
    if (d.userId) cur.users.add(d.userId);
    agg.set(key, cur);
  }

  const sections: DailyRollup["sections"] = {};
  for (const [key, v] of agg) {
    sections[key] = { views: v.views, users: [...v.users].slice(0, ROLLUP_USER_CAP) };
  }
  return { date, sections, final: date < todayDate(), computedAt: Date.now() };
}

/**
 * 최근 N일 페이지뷰를 섹션별로 집계.
 *
 * 비용 최적화(2026-07-21): 예전에는 호출할 때마다 stats_pageviews를 최대 5만 건 스캔했다
 * (7일치 약 2.8만 건 = 읽기 2.8만). 어드민이 한 번 누를 때마다 그 비용이 그대로 나갔다.
 *
 * 지금은 하루치 요약을 `stats_daily/{date}`에 저장해두고 재사용한다.
 *  - 지난 날짜: 값이 변하지 않으므로 최초 1회만 계산하고 이후엔 요약 문서 1건만 읽는다.
 *  - 오늘 날짜: 계속 늘어나므로 5분 TTL로만 재계산한다.
 * 워밍업 후 호출당 읽기는 요약 7건 수준으로 떨어진다.
 */
/** 하루치 요약을 stats_daily에서 꺼내고, 없거나(또는 오늘치 TTL 만료) 확정 전이면 원본에서 다시 만든다 */
async function loadDailyRollup(date: string, today: string): Promise<DailyRollup> {
  const ref = getAdminDb().collection("stats_daily").doc(date);
  try {
    const snap = await ref.get();
    if (snap.exists) {
      const cached = snap.data() as DailyRollup;
      // 확정된 과거 요약은 그대로 재사용
      if (cached.final) return cached;
      // 오늘치는 TTL 내라면 재사용
      if (date === today && Date.now() - (cached.computedAt ?? 0) < TODAY_ROLLUP_TTL_MS) {
        return cached;
      }
    }
  } catch { /* 요약 읽기 실패 시 원본에서 재계산 */ }

  const fresh = await computeDailyRollup(date);
  // 저장 실패해도 집계 자체는 계속 진행
  await ref.set(fresh).catch(() => { /* ignore */ });
  return fresh;
}

// ── 체류시간 ─────────────────────────────────────────
/** 한 번에 받는 최대 초 — 탭을 띄워 두고 자리를 뜬 경우가 평균을 끌어올리지 않게 */
const DWELL_CAP_SEC = 1800;

/**
 * 페이지를 실제로 띄워 둔 시간(탭이 앞에 있던 시간)을 하루 문서 하나에 더한다.
 * `stats_dwell/{date}` = { sec, n, sections: { key: { sec, n } } } — 페이지를 떠날 때 1회 쓰기.
 */
export async function logDwell(path: string, seconds: number): Promise<void> {
  const sec = Math.min(DWELL_CAP_SEC, Math.round(seconds));
  if (!(sec >= 1)) return;
  const key = sectionKeyFor(path);
  await getAdminDb().collection("stats_dwell").doc(todayDate()).set({
    sec: FieldValue.increment(sec),
    n: FieldValue.increment(1),
    sections: { [key]: { sec: FieldValue.increment(sec), n: FieldValue.increment(1) } },
  }, { merge: true });
}

type DwellDoc = { sec?: number; n?: number; sections?: Record<string, { sec?: number; n?: number }> };

export type DailySectionStat = {
  date: string;
  views: number;
  /** 그날 순방문자(섹션 합집합) */
  visitors: number;
  /** 그날 모든 방문자가 페이지를 띄워 둔 시간의 합(초). 체류시간 기록 전 날짜는 null */
  dwellSec: number | null;
  sections: Record<string, { views: number; visitors: number; dwellSec: number }>;
};

/**
 * 최근 N일 날짜별·섹션별 집계 (오래된 날짜부터). 제주멍 관리자 화면의 펀제주 탭이 쓴다.
 * getSectionStats와 같은 stats_daily 요약을 읽으므로 워밍업 후 호출당 읽기는 N건 수준.
 */
export async function getDailySectionStats(days = 14): Promise<DailySectionStat[]> {
  const today = todayDate();
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    dates.push(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10));
  }
  const db = getAdminDb();
  const [rollups, dwells] = await Promise.all([
    Promise.all(dates.map((date) => loadDailyRollup(date, today))),
    db.getAll(...dates.map((date) => db.collection("stats_dwell").doc(date))),
  ]);
  return rollups.map((r, i) => {
    const dwell = dwells[i].exists ? (dwells[i].data() as DwellDoc) : null;
    const all = new Set<string>();
    const sections: DailySectionStat["sections"] = {};
    let views = 0;
    for (const [key, v] of Object.entries(r.sections ?? {})) {
      views += v.views;
      for (const u of v.users ?? []) all.add(u);
      sections[key] = { views: v.views, visitors: (v.users ?? []).length, dwellSec: dwell?.sections?.[key]?.sec ?? 0 };
    }
    return { date: r.date, views, visitors: all.size, dwellSec: dwell ? dwell.sec ?? 0 : null, sections };
  });
}

/** 최근 몇 분 안에 페이지를 연 순방문자 수 — 공개 화면은 시청 ping이 없어서 '지금 접속'을 이것으로 본다 */
export async function getRecentVisitorCount(minutes = 5): Promise<number> {
  const since = new Date(Date.now() - minutes * 60000);
  const snap = await getAdminDb().collection("stats_pageviews")
    .where("visitedAt", ">=", since)
    .limit(2000)
    .get();
  return new Set(snap.docs.map((d) => d.get("userId") as string)).size;
}

export async function getSectionStats(days = 7): Promise<SectionStat[]> {
  const today = todayDate();

  // 대상 날짜 목록 (오늘 포함 최근 N일)
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    dates.push(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10));
  }

  const rollups = await Promise.all(dates.map((date) => loadDailyRollup(date, today)));

  // 일별 요약 병합 — views는 합산, users는 합집합(재방문 중복 제거)
  const agg = new Map<string, { views: number; users: Set<string> }>();
  for (const r of rollups) {
    for (const [key, v] of Object.entries(r.sections ?? {})) {
      const cur = agg.get(key) ?? { views: 0, users: new Set<string>() };
      cur.views += v.views;
      for (const u of v.users ?? []) cur.users.add(u);
      agg.set(key, cur);
    }
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
