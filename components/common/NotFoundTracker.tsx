"use client";

import { useEffect } from "react";

/**
 * 404 발생 경로를 GA4 이벤트로 전송 → 어느 옛/깨진 URL이 404 나는지 추적.
 * GA4: 이벤트 'page_not_found' (파라미터 not_found_path = 경로+쿼리, ref = 유입경로)
 */
export function NotFoundTracker() {
  useEffect(() => {
    try {
      const path = window.location.pathname + window.location.search;
      const w = window as unknown as { gtag?: (...a: unknown[]) => void };
      if (typeof w.gtag === "function") {
        w.gtag("event", "page_not_found", {
          not_found_path: path,
          ref: document.referrer || "(direct)",
        });
      }
      // 콘솔에도 남겨 디버깅/서버로그 수집 용이
      console.warn("[404]", path, "ref:", document.referrer || "(direct)");
    } catch { /* ignore */ }
  }, []);
  return null;
}
