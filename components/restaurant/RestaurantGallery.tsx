"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import type { RestaurantSummary } from "@/types/restaurant";

type Props = {
  restaurants: RestaurantSummary[];
  regions: string[];
  menus: string[];
};

const PAGE_SIZE = 24;

export function RestaurantGallery({ restaurants, regions, menus }: Props) {
  const [activeRegion, setActiveRegion] = useState<string>("전체");
  const [activeMenu, setActiveMenu] = useState<string>("전체");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return restaurants.filter((r) => {
      if (activeRegion !== "전체" && r.region !== activeRegion) return false;
      if (activeMenu !== "전체" && r.menu !== activeMenu) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          r.title.toLowerCase().includes(q) ||
          r.shortDescription.toLowerCase().includes(q) ||
          r.region.toLowerCase().includes(q) ||
          r.menu.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [restaurants, activeRegion, activeMenu, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function resetPage() { setPage(1); }

  return (
    <div>
      {/* 검색 + 필터 */}
      <div className="mb-4 space-y-3 px-4 md:px-0">
        {/* 검색바 */}
        <div className="flex items-center gap-2 rounded-2xl border border-border-soft bg-bg-card px-4 py-2.5 shadow-card focus-within:border-brand-orange transition-colors">
          <span className="text-lg text-text-secondary">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetPage(); }}
            placeholder="식당 이름, 메뉴, 지역으로 검색..."
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-secondary outline-none"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} className="text-text-secondary">✕</button>
          )}
        </div>

        {/* 메뉴 필터 */}
        <div>
          <p className="mb-1.5 text-[11px] font-bold text-text-secondary">🍴 메뉴</p>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {["전체", ...menus].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setActiveMenu(m); resetPage(); }}
                className={[
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                  activeMenu === m
                    ? "bg-brand-orange text-white"
                    : "border border-border-soft bg-bg-card text-text-secondary hover:bg-bg-secondary",
                ].join(" ")}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* 지역 필터 */}
        <div>
          <p className="mb-1.5 text-[11px] font-bold text-text-secondary">📍 지역</p>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {["전체", ...regions].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => { setActiveRegion(r); resetPage(); }}
                className={[
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                  activeRegion === r
                    ? "bg-brand-navy text-white"
                    : "border border-border-soft bg-bg-card text-text-secondary hover:bg-bg-secondary",
                ].join(" ")}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* 결과 카운트 */}
        <div className="flex items-center justify-between rounded-xl bg-jeju-green/10 border border-jeju-green/20 px-4 py-2">
          <p className="text-xs font-medium text-text-primary">
            <span className="font-bold text-jeju-green">{filtered.length}개</span>의 도민맛집
          </p>
          {(activeRegion !== "전체" || activeMenu !== "전체" || search) && (
            <button
              type="button"
              onClick={() => { setActiveRegion("전체"); setActiveMenu("전체"); setSearch(""); resetPage(); }}
              className="text-[11px] font-semibold text-brand-orange hover:underline"
            >
              필터 초기화
            </button>
          )}
        </div>
      </div>

      {/* 갤러리 그리드 */}
      {pageItems.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <p className="text-4xl">🍽️</p>
          <p className="mt-3 text-sm font-bold text-text-primary">해당 조건의 맛집이 없어요</p>
          <p className="text-xs text-text-secondary">다른 필터로 검색해보세요</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4 md:grid-cols-3 md:px-0 lg:grid-cols-4">
          {pageItems.map((r) => (
            <Link
              key={r.id}
              href={`/food/${r.id}`}
              className="group overflow-hidden rounded-2xl border border-border-soft bg-bg-card shadow-card transition-transform hover:scale-[1.02]"
            >
              <div className="relative aspect-square bg-bg-secondary">
                {r.thumbnail ? (
                  <Image
                    src={r.thumbnail}
                    alt={r.title}
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-5xl opacity-30">🍽️</div>
                )}
                {r.options?.includes("펀제주인증") && (
                  <span className="absolute left-2 top-2 rounded-full bg-brand-orange px-2 py-0.5 text-[9px] font-bold text-white shadow">
                    ✓ 펀제주 인증
                  </span>
                )}
              </div>
              <div className="p-2.5">
                <div className="flex items-center gap-1">
                  <span className="rounded-full bg-brand-orange/10 px-2 py-0.5 text-[9px] font-bold text-brand-orange">
                    {r.menu}
                  </span>
                  <span className="text-[10px] text-text-secondary">📍 {r.region}</span>
                </div>
                <p className="mt-1 line-clamp-1 text-sm font-bold text-text-primary group-hover:text-brand-orange transition-colors">
                  {r.title}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[10px] leading-4 text-text-secondary">
                  {r.shortDescription}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2 px-4 md:px-0">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-full border border-border-soft bg-bg-card px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-bg-secondary disabled:opacity-30 transition-colors"
          >
            ‹ 이전
          </button>
          <span className="px-3 text-xs font-bold text-text-primary">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-full border border-border-soft bg-bg-card px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-bg-secondary disabled:opacity-30 transition-colors"
          >
            다음 ›
          </button>
        </div>
      )}
    </div>
  );
}
