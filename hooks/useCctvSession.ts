"use client";

import type { WatchBudgetResult } from "@/hooks/useWatchBudget";

// ── 비용 절감을 위해 하트비트 비활성화 (2026-07-20) ──
// 현재 시청 시간 과금 없으므로 Firestore 비용만 발생.
// 유료화 시 아래 주석을 해제하고 no-op을 제거할 것.
// 원본 코드: git show 12e7213:hooks/useCctvSession.ts

export function useCctvSession(_opts: {
  cctvId: string | null;
  cctvName?: string;
  isPlaying?: boolean;
  activeStreams?: number;
  onBudget?: (b: WatchBudgetResult) => void;
}) {
  // no-op: 하트비트 비활성화 상태
}

/*
// ── 원본 코드 (복원 시 위 no-op 삭제 후 이 블록 주석 해제) ──

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";

const ADMIN_EMAIL = "naggu1999@gmail.com";
const HEARTBEAT_MS = 30 * 1000; // 30초마다 ping

export function useCctvSession(opts: {
  cctvId: string | null;
  cctvName?: string;
  isPlaying?: boolean;
  activeStreams?: number;
  onBudget?: (b: WatchBudgetResult) => void;
}) {
  const { user } = useAuth();
  const sessionIdRef = useRef<string | null>(null);
  const intervalRef  = useRef<NodeJS.Timeout | null>(null);
  const trackingKeyRef = useRef<string | null>(null);

  const activeStreamsRef = useRef<number>(opts.activeStreams ?? 1);
  activeStreamsRef.current = opts.activeStreams ?? 1;
  const onBudgetRef = useRef(opts.onBudget);
  onBudgetRef.current = opts.onBudget;

  const isPlaying = opts.isPlaying ?? true;
  const trackingKey = opts.cctvId && isPlaying ? opts.cctvId : null;

  useEffect(() => {
    if (!trackingKey) {
      cleanup();
      return;
    }

    if (trackingKeyRef.current === trackingKey && sessionIdRef.current) {
      return;
    }

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

      const base = {
        sessionId,
        userId,
        userTier,
        cctvId: opts.cctvId!,
        cctvName: opts.cctvName ?? "",
      };

      const ping = () =>
        sendHeartbeat(
          { ...base, activeStreams: activeStreamsRef.current },
          onBudgetRef.current
        );

      ping();
      intervalRef.current = setInterval(ping, HEARTBEAT_MS);
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

function sendHeartbeat(payload: object, onBudget?: (b: WatchBudgetResult) => void) {
  fetch("/api/stats/heartbeat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (d?.budget && onBudget) onBudget(d.budget as WatchBudgetResult);
    })
    .catch(() => {});
}

function endSession(sessionId: string) {
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
    }).catch(() => {});
  }
}
*/
