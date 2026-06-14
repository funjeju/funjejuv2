/**
 * 권한(entitlement) 계산 — "이 유저가 지금 무엇을 할 수 있나"의 단일 진입점.
 * 서버·클라 어디서든 import 가능한 순수 함수 (firebase 의존 없음).
 *
 * 게이팅이 필요한 모든 곳은 이 헬퍼만 호출하면 됨:
 *   const ent = getEntitlements({ loggedIn, plan });
 *   if (ent.limits.maxSplit < 9) { ...업그레이드 유도... }
 */

import {
  PLANS, BETA_MEMBER_LIMITS, SERVICE_MODE,
  type PlanId, type PlanLimits, type ServiceMode,
} from "@/lib/plans";

export type Entitlements = {
  mode: ServiceMode;
  /** 화면 표시용 현재 등급 라벨 */
  planLabel: string;
  /** 실제 적용 한도 */
  limits: PlanLimits;
  /** 정식 모드에서의 플랜 id (베타에선 표시용 참고치) */
  planId: PlanId;
  /** 베타 기간 회원 특典 적용 중인지 */
  betaPerks: boolean;
};

/**
 * @param loggedIn 로그인 여부
 * @param plan     users.plan (정식 모드에서만 사용). 없으면 free.
 */
export function getEntitlements(opts: { loggedIn: boolean; plan?: PlanId | null }): Entitlements {
  const { loggedIn, plan } = opts;

  if (SERVICE_MODE === "beta") {
    if (loggedIn) {
      return {
        mode: "beta",
        planLabel: "베타 회원",
        limits: BETA_MEMBER_LIMITS,
        planId: plan ?? "free",
        betaPerks: true,
      };
    }
    // 비회원도 베타에는 guest 한도 — 단, 챗봇(AI 도슨트)은 누구에게나 무제한 개방
    return {
      mode: "beta",
      planLabel: "비회원",
      limits: { ...PLANS.guest.limits, chatPerDay: -1 },
      planId: "guest",
      betaPerks: false,
    };
  }

  // ── 정식 모드 ──
  const id: PlanId = loggedIn ? (plan ?? "free") : "guest";
  return {
    mode: "live",
    planLabel: PLANS[id].label,
    limits: PLANS[id].limits,
    planId: id,
    betaPerks: false,
  };
}

/** 한도 표시 도우미 — -1이면 "무제한" */
export function fmtLimit(n: number, unit = ""): string {
  return n === -1 ? "무제한" : `${n}${unit}`;
}

/** 한도 체크 — 사용량이 한도 미만이면 true (사용 가능) */
export function withinLimit(used: number, limit: number): boolean {
  return limit === -1 || used < limit;
}
