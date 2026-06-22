/**
 * GA4 커스텀 이벤트 헬퍼 — window.gtag 래퍼 (클라이언트 전용, 안전 가드).
 * 사용: track("cctv_play", { cctv_id: id })
 * layout.tsx 의 <GoogleAnalytics> 가 gtag 를 주입한다.
 */
type Params = Record<string, string | number | boolean | undefined>;

export function track(event: string, params?: Params) {
  if (typeof window === "undefined") return;
  const w = window as unknown as { gtag?: (...a: unknown[]) => void };
  try {
    w.gtag?.("event", event, params ?? {});
  } catch {
    /* analytics 실패는 무시 */
  }
}
