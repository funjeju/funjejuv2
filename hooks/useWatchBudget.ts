"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getEntitlements } from "@/lib/entitlements";

/**
 * CCTV 시청시간 예산 — 서버 권위 + 클라 보간.
 *
 * 차감의 진실은 서버(heartbeat → recordHeartbeat, 계정 단위 누적)에 있다.
 * 이 훅은 useCctvSession이 heartbeat 응답으로 받은 `server` 값을 기준점으로 삼고,
 * 다음 ping(30초)까지 1초씩 부드럽게 보간해 "남은 시간"을 표시한다.
 *
 * 멀티 창/기기는 같은 userId라 서버에서 합산되므로, 이 표시도 자연히 합산값을 반영한다.
 * 서버 응답이 도착하기 전(초기 깜빡임 구간)에만 localStorage 캐시로 근사 표시한다.
 */

const KEY = "cctvWatchBudget:v1";

/** 서버(recordHeartbeat)가 돌려주는 예산 결과 */
export type WatchBudgetResult = {
  usedSeconds: number;
  limitSeconds: number; // -1 = 무제한
  exhausted: boolean;
  unlimited: boolean;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function readCachedUsed(): number {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}") as { date?: string; used?: number };
    if (raw.date === today() && typeof raw.used === "number") return raw.used;
  } catch { /* ignore */ }
  return 0;
}

function writeCachedUsed(used: number) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ date: today(), used }));
  } catch { /* ignore */ }
}

export type WatchBudget = {
  limitSeconds: number;
  usedSeconds: number;
  remainingSeconds: number;
  exhausted: boolean;
  maxSplit: number;
  unlimited: boolean;
};

/**
 * @param activeStreams 지금 재생 중인 (우리 워커 경유) HLS 스트림 수. 유튜브 제외.
 * @param server        useCctvSession이 heartbeat로 받은 서버 예산 결과 (없으면 캐시 근사).
 */
export function useWatchBudget(
  activeStreams: number,
  server?: WatchBudgetResult | null
): WatchBudget {
  const { user } = useAuth();
  const ent = getEntitlements({ loggedIn: !!user });
  const maxSplit = ent.limits.maxSplit;

  // 서버값 수신 기준점 (보간 origin)
  const [base, setBase] = useState<{ used: number; at: number } | null>(null);
  const serverRef = useRef<WatchBudgetResult | null>(null);

  useEffect(() => {
    if (!server) return;
    serverRef.current = server;
    setBase({ used: server.usedSeconds, at: Date.now() });
    if (!server.unlimited) writeCachedUsed(server.usedSeconds);
  }, [server?.usedSeconds, server?.limitSeconds, server?.exhausted, server?.unlimited]);

  // 1초 보간 tick (재생 중일 때 — 무제한 어드민도 위로 카운트하므로 포함)
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!base || activeStreams <= 0) return;
    const iv = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(iv);
  }, [base, activeStreams]);

  const srv = serverRef.current ?? server ?? null;

  // 무제한 (admin / 무제한 플랜) — 차단 없이 "오늘 누적 사용량"을 위로 카운트
  if (srv?.unlimited) {
    const elapsed = base ? Math.max(0, (Date.now() - base.at) / 1000) : 0;
    const used = base
      ? Math.round(base.used + elapsed * Math.max(0, activeStreams))
      : (srv.usedSeconds ?? 0);
    return {
      limitSeconds: -1, usedSeconds: used, remainingSeconds: -1,
      exhausted: false, maxSplit, unlimited: true,
    };
  }

  // 서버값 도착 전 — localStorage 캐시로 근사 (깜빡임 방지)
  if (!srv || !base) {
    const cached = readCachedUsed();
    const limitMin = ent.limits.cctvMinutesPerDay;
    const unlimited = limitMin === -1;
    const limitSeconds = unlimited ? -1 : limitMin * 60;
    return {
      limitSeconds,
      usedSeconds: cached,
      remainingSeconds: unlimited ? -1 : Math.max(0, limitSeconds - cached),
      exhausted: !unlimited && cached >= limitSeconds,
      maxSplit,
      unlimited,
    };
  }

  // 서버 기준점 + 경과시간×스트림수 보간
  const elapsed = Math.max(0, (Date.now() - base.at) / 1000);
  const used = Math.round(base.used + elapsed * Math.max(0, activeStreams));
  const limitSeconds = srv.limitSeconds;
  const exhausted = srv.exhausted || used >= limitSeconds;

  return {
    limitSeconds,
    usedSeconds: used,
    remainingSeconds: Math.max(0, limitSeconds - used),
    exhausted,
    maxSplit,
    unlimited: false,
  };
}

/** 초 → "1시간 23분" / "12분 30초" 표시 */
export function fmtDuration(sec: number): string {
  if (sec < 0) return "무제한";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}시간 ${m}분`;
  if (m > 0) return `${m}분 ${s}초`;
  return `${s}초`;
}
