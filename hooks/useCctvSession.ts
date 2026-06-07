"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";

const ADMIN_EMAIL = "naggu1999@gmail.com";
const HEARTBEAT_MS = 30 * 1000; // 30초마다 ping

/**
 * CCTV 시청 세션 추적 훅 — 정확한 시청 시간 측정
 *
 * - cctvId가 있고 isPlaying=true일 때만 세션 활성
 * - isPlaying이 false가 되면 즉시 세션 종료 (영상 정지 = 시청 종료)
 * - 언마운트 시 sendBeacon으로 즉시 종료 (페이지 이동 정확)
 *
 * @param cctvId 시청 중인 CCTV id (null = 비활성)
 * @param cctvName CCTV 이름 (로그용)
 * @param isPlaying 영상이 실제 재생 중인지 (HLS playing 상태)
 */
export function useCctvSession(opts: {
  cctvId: string | null;
  cctvName?: string;
  isPlaying?: boolean;
}) {
  const { user } = useAuth();
  const sessionIdRef = useRef<string | null>(null);
  const intervalRef  = useRef<NodeJS.Timeout | null>(null);
  const trackingKeyRef = useRef<string | null>(null);

  // isPlaying 기본값 true (옵션 안 넘기면 항상 재생 중으로 간주)
  const isPlaying = opts.isPlaying ?? true;
  const trackingKey = opts.cctvId && isPlaying ? opts.cctvId : null;

  useEffect(() => {
    // 비활성 상태 → 기존 세션 종료
    if (!trackingKey) {
      cleanup();
      return;
    }

    // 같은 CCTV 재생 중 → 그대로 (heartbeat 계속)
    if (trackingKeyRef.current === trackingKey && sessionIdRef.current) {
      return;
    }

    // 다른 CCTV 또는 새로 재생 → 기존 종료 + 새 세션 시작
    cleanup();
    startSession();

    function startSession() {
      const sessionId = crypto.randomUUID();
      sessionIdRef.current = sessionId;
      trackingKeyRef.current = trackingKey;

      const userId = user?.uid ?? `anon_${sessionId.slice(0, 8)}`;
      const userTier = user?.email === ADMIN_EMAIL
        ? "admin"
        : user
          ? "free"
          : "anonymous";

      const payload = {
        sessionId,
        userId,
        userTier,
        cctvId: opts.cctvId!,
        cctvName: opts.cctvName ?? "",
      };

      // 즉시 ping
      sendHeartbeat(payload);

      // 30초마다
      intervalRef.current = setInterval(() => sendHeartbeat(payload), HEARTBEAT_MS);
    }

    return cleanup;

    function cleanup() {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (sessionIdRef.current) {
        endSession(sessionIdRef.current);
        sessionIdRef.current = null;
        trackingKeyRef.current = null;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackingKey, user?.uid]);

  // 페이지 떠날 때 (브라우저 닫기, 탭 닫기) 강제 종료
  useEffect(() => {
    function handleUnload() {
      if (sessionIdRef.current) {
        endSession(sessionIdRef.current);
      }
    }
    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("pagehide", handleUnload);
    };
  }, []);
}

function sendHeartbeat(payload: object) {
  fetch("/api/stats/heartbeat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => { /* ignore */ });
}

function endSession(sessionId: string) {
  // sendBeacon은 페이지 떠나는 중에도 안정적으로 전송
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon(
      "/api/stats/end",
      new Blob([JSON.stringify({ sessionId })], { type: "application/json" })
    );
  } else {
    fetch("/api/stats/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
      keepalive: true,
    }).catch(() => { /* ignore */ });
  }
}
