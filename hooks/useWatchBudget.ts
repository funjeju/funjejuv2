"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getEntitlements } from "@/lib/entitlements";

/**
 * CCTV 시청시간 예산 — 클라이언트 측 누적 차감 (베타용 약식).
 *
 * - 활성 스트림 수 × 경과초를 localStorage에 누적 (4분할이면 1초에 4초 차감).
 * - 한도(스트림·분 → 초) 초과 시 exhausted=true → 호출부가 재생 정지.
 * - 날짜 바뀌면 자동 리셋.
 *
 * ⚠️ 클라 측이라 개발자도구로 우회 가능. 정식 오픈 시 서버 heartbeat로 교체 예정.
 *   유튜브 스트림은 우리 대역폭이 아니므로 activeStreams에서 제외하고 넘길 것.
 */

const KEY = "cctvWatchBudget:v1";

function today(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (로컬 자정 기준 근사)
}

function readUsed(): number {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}") as { date?: string; used?: number };
    if (raw.date === today() && typeof raw.used === "number") return raw.used;
  } catch { /* ignore */ }
  return 0;
}

function writeUsed(used: number) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ date: today(), used }));
  } catch { /* ignore */ }
}

export type WatchBudget = {
  limitSeconds: number;       // 하루 한도 (스트림·초). -1이면 무제한
  usedSeconds: number;        // 오늘 누적 (스트림·초)
  remainingSeconds: number;   // 남은 시간 (벽시계 환산 X, 1배속 기준 잔여)
  exhausted: boolean;         // 소진 여부
  maxSplit: number;           // 허용 최대 분할 수
  unlimited: boolean;
};

/**
 * @param activeStreams 지금 재생 중인 (우리 워커 경유) HLS 스트림 수. 유튜브 제외.
 */
export function useWatchBudget(activeStreams: number): WatchBudget {
  const { user } = useAuth();
  const ent = getEntitlements({ loggedIn: !!user });
  const limitMin = ent.limits.cctvMinutesPerDay;
  const unlimited = limitMin === -1;
  const limitSeconds = unlimited ? -1 : limitMin * 60;

  // 클라이언트 첫 렌더에 바로 읽음 (SSR은 0 → 하이드레이션 후 보정)
  const [used, setUsed] = useState<number>(() =>
    typeof window === "undefined" ? 0 : readUsed()
  );
  // SSR/HMR 등으로 초기값이 0으로 굳은 경우 대비, 마운트 시 한 번 더 동기화
  useEffect(() => {
    setUsed((prev) => {
      const stored = readUsed();
      return stored > prev ? stored : prev;
    });
  }, []);

  const exhausted = !unlimited && used >= limitSeconds;

  // 누적 타이머 — exhausted는 derived라 자동으로 멈춤
  useEffect(() => {
    if (unlimited || exhausted || activeStreams <= 0) return;
    const iv = setInterval(() => {
      setUsed((prev) => {
        const next = prev + activeStreams;
        writeUsed(next);
        return next;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [unlimited, exhausted, activeStreams]);

  return {
    limitSeconds,
    usedSeconds: used,
    remainingSeconds: unlimited ? -1 : Math.max(0, limitSeconds - used),
    exhausted,
    maxSplit: ent.limits.maxSplit,
    unlimited,
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
