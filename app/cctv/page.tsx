"use client";

import { useState } from "react";
import Link from "next/link";
import { CctvList } from "@/components/cctv/CctvList";
import { CctvMap } from "@/components/cctv/CctvMap";
import { BgmPlayer } from "@/components/cctv/BgmPlayer";
import { PageHeader } from "@/components/common/PageHeader";
import { useCctvs } from "@/hooks/useCctvs";
import { DIRECTION_META } from "@/constants/cctv-directions";
import type { CctvDirection } from "@/types/cctv";

type DirectionFilter = "전체" | CctvDirection;

const DIR_FILTERS: { id: DirectionFilter; label: string; emoji: string; sub: string }[] = [
  { id: "전체", label: "전체",  emoji: "📡", sub: "제주 전 지역" },
  { id: "북",   label: "북쪽",  emoji: DIRECTION_META["북"].emoji, sub: DIRECTION_META["북"].sub },
  { id: "동",   label: "동쪽",  emoji: DIRECTION_META["동"].emoji, sub: DIRECTION_META["동"].sub },
  { id: "남",   label: "남쪽",  emoji: DIRECTION_META["남"].emoji, sub: DIRECTION_META["남"].sub },
  { id: "서",   label: "서쪽",  emoji: DIRECTION_META["서"].emoji, sub: DIRECTION_META["서"].sub },
];

export default function CctvPage() {
  const { cctvs, loading } = useCctvs();
  const [activeDir, setActiveDir] = useState<DirectionFilter>("전체");
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");

  const filtered = cctvs.filter((c) =>
    activeDir === "전체" || c.direction === activeDir
  );

  const youtubeCount = filtered.filter((c) => c.youtubeId).length;

  return (
    <div className="mx-auto max-w-screen-xl px-0 md:px-4 md:py-6">
      <BgmPlayer />
      <PageHeader
        title="실시간 제주 CCTV"
        subtitle="지금 제주 현장을 실시간으로 확인하세요"
        emoji="📷"
        right={
          <div className="flex items-center gap-1.5">
            <Link
              href="/cctv/multiview"
              className="flex items-center gap-1 rounded-full bg-brand-orange px-2.5 py-1.5 text-[11px] font-bold text-white shadow-soft hover:bg-brand-orange/90 transition-colors"
            >
              📺 <span className="hidden sm:inline">멀티뷰</span>
            </Link>
            <div className="flex overflow-hidden rounded-full border border-border-soft bg-bg-card text-[11px] font-semibold shadow-card">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={["rounded-full px-2.5 py-1.5 transition-colors", viewMode === "grid" ? "bg-brand-navy text-white" : "text-text-secondary"].join(" ")}
              >
                목록
              </button>
              <button
                type="button"
                onClick={() => setViewMode("map")}
                className={["px-2.5 py-1.5 transition-colors", viewMode === "map" ? "bg-brand-navy text-white" : "text-text-secondary"].join(" ")}
              >
                지도
              </button>
            </div>
          </div>
        }
      />

      {/* Status bar */}
      <div className="mx-4 mb-4 flex items-center gap-3 rounded-2xl border border-jeju-green/20 bg-jeju-green/10 px-4 py-3 md:mx-0">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-jeju-green opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-jeju-green" />
        </span>
        <p className="text-sm font-medium text-text-primary">
          <span className="font-bold text-jeju-green">{filtered.length}개</span> CCTV 연결 중
          {youtubeCount > 0 && (
            <span className="ml-2 text-xs text-red-500 font-medium">▶ YouTube {youtubeCount}개 포함</span>
          )}
        </p>
        <span className="ml-auto text-xs text-text-secondary">실시간 업데이트</span>
      </div>

      {/* 방향 필터 — 컴퍼스 기반 */}
      <div className="mx-4 mb-4 grid grid-cols-5 gap-1.5 md:mx-0 md:gap-2">
        {DIR_FILTERS.map((f) => {
          const count = f.id === "전체" ? cctvs.length : cctvs.filter((c) => c.direction === f.id).length;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveDir(f.id)}
              className={[
                "flex flex-col items-center rounded-xl px-1 py-2 text-center transition-all md:rounded-2xl md:px-2 md:py-3",
                activeDir === f.id
                  ? "bg-brand-navy text-white shadow-soft"
                  : "border border-border-soft bg-bg-card text-text-secondary hover:border-brand-navy/30 hover:bg-bg-secondary",
              ].join(" ")}
            >
              <span className="text-base md:text-xl">{f.emoji}</span>
              <span className="mt-0.5 text-[10px] font-bold md:text-xs">{f.label}</span>
              {/* sub 텍스트: md 이상에서만 표시 */}
              <span className={["hidden text-[9px] leading-tight md:block", activeDir === f.id ? "text-white/70" : "text-text-secondary"].join(" ")}>
                {f.sub}
              </span>
              <span className={[
                "mt-0.5 rounded-full px-1 py-0.5 text-[9px] font-bold",
                activeDir === f.id ? "bg-white/20 text-white" : "bg-brand-orange/10 text-brand-orange",
              ].join(" ")}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* CCTV 지도 — Kakao Maps */}
      {viewMode === "map" && (
        <div className="mx-4 mb-4 md:mx-0">
          <CctvMap cctvs={filtered} />
        </div>
      )}

      {/* 그리드 */}
      {viewMode === "grid" && (
        <div className="px-4 md:px-0">
          {filtered.length > 0 ? (
            <CctvList cctvs={filtered} />
          ) : (
            <div className="flex flex-col items-center py-16 text-center">
              <p className="text-4xl">📷</p>
              <p className="mt-3 text-sm font-bold text-text-primary">해당 방향의 CCTV가 없어요</p>
              <button type="button" onClick={() => setActiveDir("전체")} className="mt-3 text-xs text-brand-orange underline">
                전체 보기
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
