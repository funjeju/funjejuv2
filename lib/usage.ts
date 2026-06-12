import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { getEntitlements } from "@/lib/entitlements";
import { getUserPlan } from "@/lib/users";
import type { PlanId, PlanLimits } from "@/lib/plans";
import type { UserTier } from "@/lib/firestore-stats";

/**
 * 기능별 횟수 게이팅 — chat / 제주tube 추출 / 여행일정(복잡·단순).
 *
 * 진실의 원천: Firestore `stats_usage/{userId}__{period}` (Admin SDK 전용, rules 불필요).
 * - 일/월 주기별 카운터를 원자적 트랜잭션으로 read-check-increment.
 * - 한도는 getEntitlements 단일 진입점 (베타: 회원 거의 무제한, 비회원 guest).
 * - admin은 무제한이되 누적은 함(위로 카운트 — 사용량 파악용).
 *
 * 시청시간(스트림·초)은 별도 트랙: [[firestore-stats]] recordHeartbeat.
 */

const ADMIN_EMAIL = "naggu1999@gmail.com";

export type Feature = "chat" | "ytExtract" | "tripComplex" | "tripSimple";

const FEATURE_META: Record<Feature, { field: keyof PlanLimits; period: "day" | "month" }> = {
  chat:        { field: "chatPerDay",          period: "day" },
  ytExtract:   { field: "ytExtractPerMonth",   period: "month" },
  tripComplex: { field: "tripComplexPerMonth", period: "month" },
  tripSimple:  { field: "tripSimplePerMonth",  period: "month" },
};

export type UsageResult = {
  allowed: boolean;
  used: number;    // 소비 후 값(allowed면 +1 반영) / 차단 시 현재값
  limit: number;   // -1 = 무제한
  unlimited: boolean;
};

function periodKey(period: "day" | "month"): string {
  const iso = new Date().toISOString();
  return period === "day" ? iso.slice(0, 10) : iso.slice(0, 7);
}

export type ResolvedUser = {
  userId: string;
  userTier: UserTier;
  loggedIn: boolean;
  plan: PlanId;
};

/**
 * 토큰 인증 결과 → userId/tier/plan. 비로그인은 anonId(클라 익명 식별자)로 약식 식별.
 * 로그인 유저는 users/{uid}.plan을 조회해 등급별 한도를 적용한다(정식 모드).
 */
export async function resolveUser(
  auth: { uid: string; email?: string } | null,
  anonId?: string | null
): Promise<ResolvedUser> {
  if (auth) {
    const isAdmin = auth.email === ADMIN_EMAIL;
    // admin은 어차피 무제한(아래 unlimited 처리)이라 plan 조회 생략
    const plan = isAdmin ? "biz" : await getUserPlan(auth.uid);
    return { userId: auth.uid, userTier: isAdmin ? "admin" : "free", loggedIn: true, plan };
  }
  // 비로그인: 클라가 보낸 익명 식별자(localStorage UUID)로 분리. 없으면 공용 anon.
  return {
    userId: anonId ? `anon_${anonId}` : "anon_shared",
    userTier: "anonymous",
    loggedIn: false,
    plan: "guest",
  };
}

/**
 * 기능 사용 1회 소비 + 한도 체크 (원자적).
 * allowed=false면 호출부는 429 반환.
 */
export async function consumeUsage(opts: {
  userId: string;
  userTier: UserTier;
  loggedIn: boolean;
  plan?: PlanId;
  feature: Feature;
}): Promise<UsageResult> {
  const { field, period } = FEATURE_META[opts.feature];
  const ent = getEntitlements({ loggedIn: opts.loggedIn, plan: opts.plan });
  const limit = ent.limits[field] as number;
  const unlimited = opts.userTier === "admin" || limit === -1;

  const db = getAdminDb();
  const ref = db.collection("stats_usage").doc(`${opts.userId}__${periodKey(period)}`);
  const now = new Date();

  if (unlimited) {
    // 차단 없이 누적만 (어드민/무제한 — 사용량 파악용)
    await ref.set(
      { userId: opts.userId, userTier: opts.userTier, [opts.feature]: FieldValue.increment(1), updatedAt: now },
      { merge: true }
    );
    const snap = await ref.get();
    return { allowed: true, used: (snap.data()?.[opts.feature] as number) ?? 1, limit: -1, unlimited: true };
  }

  // 트랜잭션으로 read-check-increment 원자화 (동시 요청 경쟁 방지)
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const cur = ((snap.exists ? (snap.data()![opts.feature] as number) : 0) ?? 0);
    if (cur >= limit) {
      return { allowed: false, used: cur, limit, unlimited: false };
    }
    tx.set(
      ref,
      { userId: opts.userId, userTier: opts.userTier, [opts.feature]: cur + 1, updatedAt: now },
      { merge: true }
    );
    return { allowed: true, used: cur + 1, limit, unlimited: false };
  });
}

/**
 * 소비 없이 한도만 확인 (dedup 등으로 "비용 발생 시에만 소비"하고 싶을 때 사전 차단용).
 * 비용 발생이 확정되면 이어서 consumeUsage를 호출한다.
 */
export async function checkUsage(opts: {
  userId: string;
  userTier: UserTier;
  loggedIn: boolean;
  plan?: PlanId;
  feature: Feature;
}): Promise<UsageResult> {
  const { field, period } = FEATURE_META[opts.feature];
  const ent = getEntitlements({ loggedIn: opts.loggedIn, plan: opts.plan });
  const limit = ent.limits[field] as number;
  const unlimited = opts.userTier === "admin" || limit === -1;

  const db = getAdminDb();
  const ref = db.collection("stats_usage").doc(`${opts.userId}__${periodKey(period)}`);
  const snap = await ref.get();
  const used = ((snap.exists ? (snap.data()![opts.feature] as number) : 0) ?? 0);

  return { allowed: unlimited || used < limit, used, limit: unlimited ? -1 : limit, unlimited };
}

/** 읽기 전용 — 어드민 대시보드/표시용 */
export async function getUsage(userId: string, feature: Feature): Promise<number> {
  const { period } = FEATURE_META[feature];
  const db = getAdminDb();
  const ref = db.collection("stats_usage").doc(`${userId}__${periodKey(period)}`);
  const snap = await ref.get();
  return ((snap.exists ? (snap.data()![feature] as number) : 0) ?? 0);
}
