"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getAnonId } from "@/lib/client-usage";

const ADMIN_EMAIL = "naggu1999@gmail.com";

/** 페이지 진입 시 자동으로 페이지뷰 기록 */
export function usePageViewTracker() {
  const pathname = usePathname();
  const { user } = useAuth();

  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith("/admin")) return; // admin은 통계 제외

    const userId = user?.uid ?? getAnonId(); // 익명도 기기별 UUID로 → 고유 방문자 집계 정확
    const userTier = user?.email === ADMIN_EMAIL
      ? "admin"
      : user
        ? "free"
        : "anonymous";

    fetch("/api/stats/pageview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname, userId, userTier }),
      keepalive: true,
    }).catch(() => { /* ignore */ });
  }, [pathname, user?.uid]);

  useDwellTracker(pathname);
}

/**
 * 체류시간 — 이 페이지를 실제로 띄워 둔 시간(탭이 앞에 있던 시간)만 센다.
 * 탭이 가려질 때와 다른 페이지로 옮길 때 sendBeacon 한 번으로 보낸다 (페이지당 쓰기 1회 수준).
 */
function useDwellTracker(pathname: string | null) {
  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    let shownAt = document.visibilityState === "visible" ? Date.now() : 0;
    let acc = 0;

    const flush = () => {
      if (shownAt) { acc += Date.now() - shownAt; shownAt = 0; }
      const sec = Math.round(acc / 1000);
      acc = 0;
      if (sec < 1) return;
      const body = JSON.stringify({ path: pathname, sec });
      if (!navigator.sendBeacon?.("/api/stats/dwell", body)) {
        fetch("/api/stats/dwell", { method: "POST", body, keepalive: true }).catch(() => { /* ignore */ });
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") { if (!shownAt) shownAt = Date.now(); }
      else flush();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
      flush(); // 다른 페이지로 이동
    };
  }, [pathname]);
}
