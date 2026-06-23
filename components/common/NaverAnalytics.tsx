"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * 네이버 애널리틱스(wcslog) — App Router SPA 대응.
 * 스크립트 로드(onLoad) + 라우트 변경(usePathname)마다 wcs_do() 재호출해
 * 클라이언트 네비게이션 페이지뷰까지 누락 없이 집계.
 */
const WA = "158f41f64ca9e4";

type WcsWindow = Window & {
  wcs_add?: Record<string, string>;
  wcs?: { inflow?: (host?: string) => void };
  wcs_do?: (add?: Record<string, string>) => void;
};

let lastPath = ""; // 같은 경로 중복 집계 방지 (onLoad + 라우트 effect 동시 발화 디듀프)

function trackPageView(path: string) {
  if (typeof window === "undefined") return;
  const w = window as WcsWindow;
  if (!w.wcs) return; // 스크립트 아직 미로드 — onLoad에서 처리됨
  if (path === lastPath) return;
  lastPath = path;
  if (!w.wcs_add) w.wcs_add = {};
  w.wcs_add["wa"] = WA;
  try { w.wcs.inflow?.("funjeju.com"); } catch { /* noop */ }
  try { w.wcs_do?.(w.wcs_add); } catch { /* noop */ }
}

export function NaverAnalytics() {
  const pathname = usePathname();
  useEffect(() => { trackPageView(pathname); }, [pathname]);
  return (
    <Script
      src="//wcs.pstatic.net/wcslog.js"
      strategy="afterInteractive"
      onLoad={() => trackPageView(window.location.pathname)}
    />
  );
}
