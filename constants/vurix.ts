/**
 * vurix(59.8.86.94) CCTV — 프록시로는 1초 세그먼트/3초보관이라 끊김이 심함.
 * → 멀티뷰에서 제외하고, 개별 화면은 HTTP 원본을 새 창(모니터 뷰어)으로 직접 재생.
 */
export const VURIX_IDS = new Set<string>([
  "sinchang", "ongpo", "namwon_deokdol", "seogwipo_hang1", "jungmun", "sanbangsan",
  "beophwan_po", "beophwan_eo", "onpyeong",
]);

export function isVurixId(id: string): boolean {
  return VURIX_IDS.has(id);
}

// Vultr 평문 HTTP 뷰어 (HTTPS 페이지는 HTTP 스트림 임베드 불가 → 새 창을 HTTP로 띄움)
export const VURIX_WATCH_BASE = "http://141.164.53.216:8080";

export function vurixWatchUrl(id: string, name: string): string {
  return `${VURIX_WATCH_BASE}/watch?id=${encodeURIComponent(id)}&name=${encodeURIComponent(name)}`;
}

/** CCTV 모니터 뷰어를 영상 비율 팝업으로 — 브라우저 크롬 최소화 */
export function openVurixWatch(id: string, name: string): void {
  if (typeof window === "undefined") return;
  const aw = window.screen.availWidth || 1280;
  const ah = window.screen.availHeight || 800;
  const w = Math.min(1100, Math.round(aw * 0.72));
  const h = Math.round((w * 9) / 16) + 24;
  const left = Math.round((aw - w) / 2);
  const top = Math.round((ah - h) / 2);
  window.open(
    vurixWatchUrl(id, name),
    `funjeju_cctv_${id}`,
    `popup=yes,width=${w},height=${h},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,scrollbars=no,resizable=yes`,
  );
}
