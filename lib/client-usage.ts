"use client";

/**
 * 클라이언트 → 기능 API 호출 시 사용자 식별 헤더.
 * - 로그인: Authorization Bearer <Firebase ID 토큰> (서버가 uid/email로 tier 판정)
 * - 비로그인: x-anon-id (localStorage UUID — 익명 약식 식별, 우회 가능하나 베타용)
 *
 * 서버의 resolveUser([[usage]])가 이 헤더로 userId/tier를 정한다.
 */

const ANON_KEY = "funjeju_anon_id";

export function getAnonId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(ANON_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(ANON_KEY, id);
  }
  return id;
}

export async function usageHeaders(
  user: { getIdToken: () => Promise<string> } | null | undefined
): Promise<Record<string, string>> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (user) {
    try {
      h["Authorization"] = `Bearer ${await user.getIdToken()}`;
    } catch {
      h["x-anon-id"] = getAnonId();
    }
  } else {
    h["x-anon-id"] = getAnonId();
  }
  return h;
}
