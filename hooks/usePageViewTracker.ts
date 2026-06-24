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
}
