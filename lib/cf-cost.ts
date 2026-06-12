/**
 * 시청 스트림·초 → Cloudflare Workers 요청 수·비용 추정 (순수 함수).
 *
 * ⚠️ 추정치다. 캐시 HIT 비율·세그먼트 길이가 변수라 실제 청구와 ±차이 있다.
 * 정확한 실측은 Cloudflare GraphQL Analytics API 연동이 필요(별도 작업).
 *
 * 환산 근거:
 *  - 초당 요청 수 ≈ 1.5 (워커 /stats 실시간 로그 관측치: ts + chunklist)
 *  - Workers 무료 한도 1,000만 건/월, 초과 100만 건당 $0.30, 유료 가입 시 기본료 $5
 */

export const REQ_PER_STREAM_SEC = 1.5;
export const CF_FREE_REQ_PER_MONTH = 10_000_000;
export const CF_PRICE_PER_MILLION = 0.3;
export const CF_BASE_FEE = 5;

/** 시청 스트림·초 → 예상 Cloudflare 요청 건수 */
export function estimateRequests(streamSeconds: number): number {
  return Math.round(streamSeconds * REQ_PER_STREAM_SEC);
}

/** 월 요청 건수 → 예상 비용(USD). 무료 한도 내면 0, 초과 시 기본료+종량. */
export function estimateMonthlyCostUsd(monthlyRequests: number): number {
  const over = Math.max(0, monthlyRequests - CF_FREE_REQ_PER_MONTH);
  if (over === 0) return 0;
  return CF_BASE_FEE + (over / 1_000_000) * CF_PRICE_PER_MILLION;
}

/** 무료 한도 소진율 (0~1+) */
export function freeQuotaRatio(monthlyRequests: number): number {
  return monthlyRequests / CF_FREE_REQ_PER_MONTH;
}
