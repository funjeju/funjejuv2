"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";

const ADMIN_EMAIL = "naggu1999@gmail.com";
const HEARTBEAT_MS = 30 * 1000; // 30초마다 ping

/**
 * CCTV 시청 세션 추적 훅
 * 마운트 시 세션 시작 → 30초마다 heartbeat → 언마운트 시 종료
 *
 * cctvId가 null이면 비활성 (영상 안 보는 상태)
 */
export function useCctvSession(opts: {
  cctvId: string | null;
  cctvName?: string;
}) {
  const { user } = useAuth();
  const sessionIdRef = useRef<string | null>(null);
  const intervalRef  = useRef<NodeJS.Timeout | null>(null);
  const currentCctvIdRef = useRef<string | null>(null);

  useEffect(() => {
    // 영상 안 보는 상태 → 기존 세션 종료
    if (!opts.cctvId) {
      cleanup();
      return;
    }

    // 같은 CCTV 계속 보는 중 → 그대로
    if (currentCctvIdRef.current === opts.cctvId && sessionIdRef.current) {
      return;
    }

    // 다른 CCTV로 전환 → 기존 종료 + 새 시작
    cleanup();
    startSession();

    function startSession() {
      const sessionId = crypto.randomUUID();
      sessionIdRef.current = sessionId;
      currentCctvIdRef.current = opts.cctvId;

      const userId = user?.uid ?? `anon_${sessionId.slice(0, 8)}`;
      const userTier = user?.email === ADMIN_EMAIL
        ? "admin"
        : user
          ? "free"  // TODO: 비즈니스 회원 구분
          : "anonymous";

      const payload = {
        sessionId,
        userId,
        userTier,
        cctvId: opts.cctvId!,
        cctvName: opts.cctvName ?? "",
      };

      // 첫 heartbeat 즉시
      fetch("/api/stats/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => { /* ignore */ });

      // 30초 간격
      intervalRef.current = setInterval(() => {
        fetch("/api/stats/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }).catch(() => { /* ignore */ });
      }, HEARTBEAT_MS);
    }

    return cleanup;

    function cleanup() {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (sessionIdRef.current) {
        const sid = sessionIdRef.current;
        sessionIdRef.current = null;
        currentCctvIdRef.current = null;
        // sendBeacon이 navigator 떠나도 안정적
        if (navigator.sendBeacon) {
          navigator.sendBeacon(
            "/api/stats/end",
            new Blob([JSON.stringify({ sessionId: sid })], { type: "application/json" })
          );
        } else {
          fetch("/api/stats/end", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: sid }),
            keepalive: true,
          }).catch(() => { /* ignore */ });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.cctvId, user?.uid]);

  // 페이지 떠날 때 종료
  useEffect(() => {
    function handleBeforeUnload() {
      if (sessionIdRef.current && navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/stats/end",
          new Blob([JSON.stringify({ sessionId: sessionIdRef.current })], { type: "application/json" })
        );
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);
}
