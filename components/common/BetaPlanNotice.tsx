"use client";

import Link from "next/link";
import { SERVICE_MODE } from "@/lib/plans";

/**
 * 베타 안내 배너 — "정식 오픈하면 요금제에 따라 달라집니다" + 요금제 보러가기.
 * SERVICE_MODE가 "live"가 되면 자동으로 사라짐.
 */
export function BetaPlanNotice({ compact = false }: { compact?: boolean }) {
  if (SERVICE_MODE !== "beta") return null;

  if (compact) {
    return (
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-text-secondary">
        <span>🎈 지금은 시범 서비스 기간 — 정식 오픈 후에는 요금제에 따라 달라져요.</span>
        <Link href="/pricing" className="font-bold text-brand-orange hover:underline">
          요금제 보러가기 →
        </Link>
      </p>
    );
  }

  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-brand-yellow/40 bg-brand-yellow/15 px-4 py-2.5">
      <span className="text-base">🎈</span>
      <p className="flex-1 text-[11px] leading-5 text-text-primary">
        지금은 <strong>시범 서비스 기간</strong>이에요. 정식 오픈 후에는 시청시간·기능이{" "}
        <strong>요금제에 따라 달라집니다.</strong>
      </p>
      <Link
        href="/pricing"
        className="shrink-0 rounded-full bg-brand-orange px-3 py-1.5 text-[11px] font-bold text-white hover:bg-brand-orange/90 transition-colors"
      >
        요금제 보러가기
      </Link>
    </div>
  );
}
