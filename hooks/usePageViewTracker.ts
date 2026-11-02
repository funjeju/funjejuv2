"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getAnonId } from "@/lib/client-usage";

const ADMIN_EMAIL = "naggu1999@gmail.com";

/** 페이지 진입 시 자동으로 페이지뷰 기록 */
export function usePageViewTracker(enabled = true) {
  const pathname = usePathname();
  const { user } = useAuth();
  const uid = user?.uid;
  const email = user?.email;

  useEffect(() => {
    if (!enabled) return;
    if (!pathname) return;
    if (pathname.startsWith("/admin")) return; // admin은 통계 제외

    const userId = uid ?? getAnonId(); // 익명도 기기별 UUID로 → 고유 방문자 집계 정확
    const userTier = email === ADMIN_EMAIL
      ? "admin"
      : uid
        ? "free"
        : "anonymous";

    fetch("/api/stats/pageview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname, userId, userTier }),
      keepalive: true,
    }).catch(() => { /* ignore */ });
  }, [enabled, pathname, uid, email]);
}
