"use client";

import { useState } from "react";
import { CctvList } from "@/components/cctv/CctvList";
import { PageHeader } from "@/components/common/PageHeader";
import { mockCctvs } from "@/constants/mock-cctvs";

const categories = ["전체", "해변", "오름", "드라이브", "관광지"];
const regions = ["전체 지역", "제주시", "서귀포시"];

export default function CctvPage() {
  const [activeCat, setActiveCat] = useState("전체");
  const [activeRegion, setActiveRegion] = useState("전체 지역");
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");

  const filtered = mockCctvs.filter((c) => {
    const catOk = activeCat === "전체" || c.category === activeCat;
    const regionOk = activeRegion === "전체 지역" || c.region === activeRegion;
    return catOk && regionOk;
  });

  return (
    <div className="mx-auto max-w-screen-xl px-0 md:px-4 md:py-6">
      <PageHeader
        title="실시간 제주 CCTV"
        subtitle="지금 제주 현장을 실시간으로 확인하세요"
        emoji="📷"
        right={
          <div className="flex overflow-hidden rounded-full border border-border-soft bg-bg-card text-xs font-semibold shadow-card">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={["rounded-full px-4 py-2 transition-colors", viewMode === "grid" ? "bg-brand-navy text-white" : "text-text-secondary hover:text-text-primary"].join(" ")}
            >
              목록형
            </button>
            <button
              type="button"
              onClick={() => setViewMode("map")}
              className={["px-4 py-2 transition-colors", viewMode === "map" ? "bg-brand-navy text-white" : "text-text-secondary hover:text-text-primary"].join(" ")}
            >
              지도형
            </button>
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
          현재 <span className="font-bold text-jeju-green">{filtered.length}개</span> CCTV 실시간 연결 중
        </p>
        <span className="ml-auto text-xs text-text-secondary">방금 업데이트</span>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-2 md:px-0">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCat(cat)}
            className={[
              "shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors",
              activeCat === cat
                ? "bg-brand-orange text-white"
                : "border border-border-soft bg-bg-card text-text-secondary hover:bg-bg-secondary",
            ].join(" ")}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Region filter */}
      <div className="mt-2 flex gap-2 overflow-x-auto px-4 pb-3 md:px-0">
        {regions.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setActiveRegion(r)}
            className={[
              "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors",
              activeRegion === r
                ? "bg-brand-navy/10 font-semibold text-brand-navy"
                : "text-text-secondary hover:text-text-primary",
            ].join(" ")}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Map placeholder */}
      {viewMode === "map" && (
        <div className="mx-4 mb-4 flex h-64 items-center justify-center rounded-2xl border border-border-soft bg-bg-secondary text-center md:mx-0">
          <div>
            <p className="text-3xl">🗺️</p>
            <p className="mt-2 text-sm font-bold text-text-primary">지도 연동 준비 중</p>
            <p className="text-xs text-text-secondary">Kakao Maps API 연결 예정</p>
          </div>
        </div>
      )}

      {/* Grid */}
      {viewMode === "grid" && (
        <div className="px-4 md:px-0">
          {filtered.length > 0 ? (
            <CctvList cctvs={filtered} />
          ) : (
            <div className="flex flex-col items-center py-16 text-center">
              <p className="text-4xl">📷</p>
              <p className="mt-3 text-sm font-bold text-text-primary">해당 조건의 CCTV가 없어요</p>
              <button type="button" onClick={() => { setActiveCat("전체"); setActiveRegion("전체 지역"); }} className="mt-3 text-xs text-brand-orange underline">
                필터 초기화
              </button>
            </div>
          )}
        </div>
      )}

      {filtered.length > 0 && viewMode === "grid" && (
        <div className="mt-6 px-4 md:px-0">
          <button type="button" className="w-full rounded-full border border-border-soft bg-bg-card py-3.5 text-sm font-semibold text-text-secondary shadow-card hover:bg-bg-secondary transition-colors">
            더 많은 CCTV 보기 ∨
          </button>
        </div>
      )}
    </div>
  );
}
