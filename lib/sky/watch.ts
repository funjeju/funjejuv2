import type { SkyCamera } from "./cameras";

/**
 * 평문 HTTP 원본(서귀포·공항·방재 vurix)은 HTTPS 페이지에서 재생할 수 없어서 HTTP로 뜨는 뷰어 새 창으로 연다.
 *
 * - NEXT_PUBLIC_HTTP_VIEWER_URL 이 있으면 정적 뷰어(http-viewer/index.html, GitHub Pages)를 쓴다.
 *   예: http://cctv-view.funjeju.com/  → ?src=<원본 m3u8>&name=<이름>
 * - 없으면 지금 운영 중인 Vultr 뷰어로 연다. Vultr를 없애기 전에 반드시 위 변수를 설정할 것.
 */
const VULTR_HTTP_WATCH = "http://141.164.53.216:8080/watch";

export function httpViewerUrl(cam: SkyCamera): string {
  if (cam.source.kind !== "http") return `/watch/${encodeURIComponent(cam.id)}`;
  const base = process.env.NEXT_PUBLIC_HTTP_VIEWER_URL;
  if (base) {
    return `${base}?src=${encodeURIComponent(cam.source.url)}&name=${encodeURIComponent(cam.name)}`;
  }
  return `${VULTR_HTTP_WATCH}?id=${encodeURIComponent(cam.id)}&name=${encodeURIComponent(cam.name)}`;
}

export function watchUrl(cam: SkyCamera): string {
  return cam.source.kind === "http" ? httpViewerUrl(cam) : `/watch/${encodeURIComponent(cam.id)}`;
}

/** 클릭 핸들러 안에서 동기적으로 호출해야 팝업 차단을 피한다. */
export function openWatch(cam: SkyCamera): void {
  if (typeof window === "undefined") return;
  const aw = window.screen.availWidth || 1280;
  const ah = window.screen.availHeight || 800;
  const w = Math.min(1100, Math.round(aw * 0.72));
  const h = Math.round((w * 9) / 16) + 64;
  const left = Math.round((aw - w) / 2);
  const top = Math.max(0, Math.round((ah - h) / 2));
  window.open(
    watchUrl(cam),
    `funjeju_cctv_${cam.id}`,
    `popup=yes,width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=no,noopener,noreferrer`,
  );
}
