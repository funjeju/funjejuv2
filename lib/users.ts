import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import type { PlanId } from "@/lib/plans";

/**
 * 유저 요금제(users/{uid}.plan) — 정식 게이팅의 등급 소스.
 *
 * - 결제 성공(④ PG) 시 setUserPlan으로 갱신 → 한도가 올라간다.
 * - 미설정/조회 실패는 "free"로 안전 폴백.
 * - 베타 모드(SERVICE_MODE="beta")에선 getEntitlements가 plan을 무시하므로
 *   이 값은 정식 전환(live) 후부터 실제 효력을 갖는다.
 */

const VALID: PlanId[] = ["guest", "free", "basic", "pro", "biz"];

export async function getUserPlan(uid: string): Promise<PlanId> {
  try {
    const snap = await getAdminDb().collection("users").doc(uid).get();
    const plan = snap.exists ? (snap.data()?.plan as PlanId | undefined) : undefined;
    return plan && VALID.includes(plan) ? plan : "free";
  } catch {
    return "free";
  }
}

export async function setUserPlan(uid: string, plan: PlanId): Promise<void> {
  if (!VALID.includes(plan)) throw new Error(`invalid plan: ${plan}`);
  await getAdminDb()
    .collection("users")
    .doc(uid)
    .set({ plan, planUpdatedAt: new Date() }, { merge: true });
}
