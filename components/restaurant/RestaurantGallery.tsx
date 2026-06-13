"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import type { RestaurantSummary } from "@/types/restaurant";
import { FoodMap } from "@/components/restaurant/FoodMap";
import { useMySpot } from "@/hooks/useMySpot";

type Props = {
  restaurants: RestaurantSummary[];
  regions: string[];
  menus: string[];
};

const PAGE_SIZE = 24;

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Fisher-Yates shuffle (stable reference)
function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function RestaurantGallery({ restaurants, regions, menus }: Props) {
  const [activeRegion, setActiveRegion] = useState<string>("전체");
  const [activeMenu, setActiveMenu] = useState<string>("전체");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const { isSpot, toggle: toggleSpot } = useMySpot();
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<"pending" | "ok" | "denied">("pending");
  // 랜덤 순서는 마운트 시 한 번만 결정
  const randomOrder = useRef<RestaurantSummary[]>(shuffled(restaurants));

  useEffect(() => {
    if (!navigator.geolocation) { setGeoStatus("denied"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeoStatus("ok"); },
      () => setGeoStatus("denied"),
      { timeout: 5000 }
    );
  }, []);

  // 기본 순서: 위치 OK → 거리순, 아니면 랜덤
  const baseOrder = useMemo(() => {
    if (geoStatus === "ok" && userPos) {
      return [...restaurants].sort((a, b) => {
        const da = a.lat && a.lng ? distanceKm(userPos.lat, userPos.lng, a.lat, a.lng) : 9999;
        const db2 = b.lat && b.lng ? distanceKm(userPos.lat, userPos.lng, b.lat, b.lng) : 9999;
        return da - db2;
      });
    }
    if (geoStatus === "denied") return randomOrder.current;
    return restaurants; // pending: 원래 순서
  }, [geoStatus, userPos, restaurants]);

  const filtered = useMemo(() => {
    return baseOrder.filter((r) => {
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
  }, [baseOrder, activeRegion, activeMenu, search]);

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
          <div className="ml-2 flex overflow-hidden rounded-full border border-border-soft bg-bg-secondary text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={["px-2.5 py-1 transition-colors", viewMode === "grid" ? "bg-brand-navy text-white" : "text-text-secondary"].join(" ")}
            >
              목록
            </button>
            <button
              type="button"
              onClick={() => setViewMode("map")}
              className={["px-2.5 py-1 transition-colors", viewMode === "map" ? "bg-brand-navy text-white" : "text-text-secondary"].join(" ")}
            >
              지도
            </button>
          </div>
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

        {/* 결과 카운트 + 위치 상태 */}
        <div className="flex items-center justify-between rounded-xl bg-jeju-green/10 border border-jeju-green/20 px-4 py-2">
          <p className="text-xs font-medium text-text-primary">
            <span className="font-bold text-jeju-green">{filtered.length}개</span>의 도민맛집
            {geoStatus === "ok" && <span className="ml-1.5 text-[10px] text-jeju-green">📍 거리순</span>}
            {geoStatus === "denied" && <span className="ml-1.5 text-[10px] text-text-secondary">🔀 랜덤순</span>}
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

      {/* 지도 뷰 */}
      {viewMode === "map" && (
        <div className="px-4 md:px-0">
          <FoodMap restaurants={filtered} />
        </div>
      )}

      {/* 갤러리 그리드 */}
      {viewMode === "grid" && (
      pageItems.length === 0 ? (
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
                {/* 마이스팟 저장 버튼 */}
                {r.lat && r.lng && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleSpot(`food_${r.id}`, {
                        name: r.title,
                        category: "맛집",
                        lat: r.lat!,
                        lng: r.lng!,
                        address: r.region,
                        source: "food",
                      });
                    }}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-base shadow transition-transform active:scale-90"
                    title={isSpot(`food_${r.id}`) ? "마이스팟에서 제거" : "마이스팟에 저장"}
                  >
                    {isSpot(`food_${r.id}`) ? "⭐" : "☆"}
                  </button>
                )}
              </div>
              <div className="p-2">
                <div className="flex items-center gap-1">
                  <span className="rounded-full bg-brand-orange/10 px-1.5 py-0 text-[7px] font-bold text-brand-orange">
                    {r.menu}
                  </span>
                  <span className="text-[8px] text-text-secondary">📍 {r.region}</span>
                </div>
                <p className="mt-0.5 line-clamp-1 text-xs font-bold text-text-primary group-hover:text-brand-orange transition-colors">
                  {r.title}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[9px] leading-3.5 text-text-secondary">
                  {r.shortDescription}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ))}

      {/* 페이지네이션 (목록 뷰에서만) */}
      {viewMode === "grid" && totalPages > 1 && (
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
