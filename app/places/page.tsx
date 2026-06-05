"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { PlaceCard, type PlaceCardData } from "@/components/places/PlaceCard";
import { PlacesMap } from "@/components/places/PlacesMap";
import {
  CATEGORIES,
  CATEGORY_GROUPS,
  REGIONS,
  getRegionsByCity,
} from "@/constants/places-meta";

type ViewMode = "list" | "map";

export default function PlacesPage() {
  const [places,   setPlaces]   = useState<PlaceCardData[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // 필터
  const [category, setCategory] = useState<string>("");
  const [region,   setRegion]   = useState<string>("");
  const [q,        setQ]        = useState<string>("");
  const [qInput,   setQInput]   = useState<string>("");
  const [withPets, setWithPets] = useState(false);
  const [withKids, setWithKids] = useState(false);
  const [regionPanelOpen, setRegionPanelOpen] = useState(false);

  // 검색 실행
  const fetchPlaces = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const sp = new URLSearchParams();
      if (category) sp.set("category", category);
      if (region)   sp.set("region",   region);
      if (q)        sp.set("q",        q);
      if (withPets) sp.set("withPets", "true");
      if (withKids) sp.set("withKids", "true");
      sp.set("pageSize", "60");

      const res = await fetch(`/api/places/search?${sp}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "검색 실패");
      setPlaces(data.places ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  }, [category, region, q, withPets, withKids]);

  // 필터 변경 시 자동 재검색
  useEffect(() => { fetchPlaces(); }, [fetchPlaces]);

  function handleSearch() { setQ(qInput.trim()); }
  function resetFilters() {
    setCategory(""); setRegion(""); setQ(""); setQInput("");
    setWithPets(false); setWithKids(false);
  }

  const hasFilter = !!(category || region || q || withPets || withKids);

  return (
    <div className="mx-auto max-w-screen-xl px-0 md:px-4 md:py-6">
      <PageHeader
        title="제주 탐색"
        subtitle="5,981곳의 관광지·맛집·숙소를 한눈에"
        emoji="🧭"
        right={
          <div className="flex overflow-hidden rounded-full border border-border-soft bg-bg-card text-xs font-semibold shadow-card">
            <button type="button" onClick={() => setViewMode("list")}
              className={["px-3 py-1.5 transition-colors", viewMode === "list" ? "bg-brand-navy text-white" : "text-text-secondary"].join(" ")}>
              📋 목록
            </button>
            <button type="button" onClick={() => setViewMode("map")}
              className={["px-3 py-1.5 transition-colors", viewMode === "map" ? "bg-brand-navy text-white" : "text-text-secondary"].join(" ")}>
              🗺️ 지도
            </button>
          </div>
        }
      />

      {/* 검색바 */}
      <div className="mx-4 mb-3 md:mx-0">
        <div className="flex gap-2 rounded-full border border-border-soft bg-bg-card px-4 py-2 shadow-card">
          <span className="text-text-secondary">🔍</span>
          <input
            type="text"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="장소·태그·지역 검색 (예: 한라산, 노을, 카페)"
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-secondary outline-none"
          />
          <button type="button" onClick={handleSearch}
            className="rounded-full bg-brand-orange px-3 py-1 text-xs font-bold text-white hover:bg-brand-orange/90 transition-colors">
            검색
          </button>
        </div>
      </div>

      {/* 카테고리 필터 — 그룹별 */}
      <div className="mx-4 mb-3 md:mx-0">
        <p className="mb-1.5 text-[11px] font-bold text-text-secondary">🏷️ 카테고리</p>
        <div className="space-y-1.5">
          {/* 전체 + 그룹별 */}
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => setCategory("")}
              className={["rounded-full px-3 py-1 text-[11px] font-bold transition-colors",
                !category ? "bg-text-primary text-white" : "border border-border-soft bg-bg-card text-text-secondary"].join(" ")}>
              전체
            </button>
            {CATEGORY_GROUPS.map((group) => {
              const groupCats = CATEGORIES.filter((c) => c.group === group);
              const isInGroup = groupCats.some((c) => c.id === category);
              return (
                <details key={group} className="inline-block">
                  <summary className={[
                    "cursor-pointer list-none rounded-full px-3 py-1 text-[11px] font-bold transition-colors",
                    isInGroup ? "bg-brand-orange text-white" : "border border-border-soft bg-bg-card text-text-secondary hover:border-brand-orange/40",
                  ].join(" ")}>
                    {group} ▾
                  </summary>
                  <div className="absolute z-10 mt-1 flex flex-wrap gap-1 rounded-xl border border-border-soft bg-bg-card p-2 shadow-soft max-w-[280px]">
                    {groupCats.map((c) => (
                      <button key={c.id} type="button"
                        onClick={() => setCategory(category === c.id ? "" : c.id)}
                        className={[
                          "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                          category === c.id
                            ? "bg-brand-orange text-white"
                            : "bg-bg-secondary text-text-secondary hover:bg-border-soft",
                        ].join(" ")}>
                        {c.emoji} {c.label}
                      </button>
                    ))}
                  </div>
                </details>
              );
            })}
          </div>

          {/* 선택된 카테고리 표시 */}
          {category && (
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-text-secondary">선택:</span>
              <span className="rounded-full bg-brand-orange/10 px-2 py-0.5 font-bold text-brand-orange">
                {CATEGORIES.find((c) => c.id === category)?.emoji} {CATEGORIES.find((c) => c.id === category)?.label}
                <button type="button" onClick={() => setCategory("")} className="ml-1">✕</button>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 지역 + 속성 필터 */}
      <div className="mx-4 mb-3 md:mx-0">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[11px] font-bold text-text-secondary">📍 지역 · 속성</p>
          <button type="button" onClick={() => setRegionPanelOpen((v) => !v)}
            className="text-[10px] font-semibold text-brand-orange hover:underline">
            {regionPanelOpen ? "접기" : "지역 전체 보기"}
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => setRegion("")}
            className={["rounded-full px-3 py-1 text-[11px] font-semibold transition-colors",
              !region ? "bg-brand-navy text-white" : "border border-border-soft bg-bg-card text-text-secondary"].join(" ")}>
            전체 지역
          </button>
          <button type="button"
            onClick={() => setWithPets((v) => !v)}
            className={["rounded-full px-3 py-1 text-[11px] font-semibold transition-colors",
              withPets ? "bg-amber-500 text-white" : "border border-border-soft bg-bg-card text-text-secondary"].join(" ")}>
            🐶 반려동물
          </button>
          <button type="button"
            onClick={() => setWithKids((v) => !v)}
            className={["rounded-full px-3 py-1 text-[11px] font-semibold transition-colors",
              withKids ? "bg-blue-500 text-white" : "border border-border-soft bg-bg-card text-text-secondary"].join(" ")}>
            👨‍👩‍👧 아이 동반
          </button>
        </div>

        {regionPanelOpen && (
          <div className="mt-2 rounded-2xl border border-border-soft bg-bg-card p-3 shadow-card space-y-2">
            {(["제주시", "서귀포시"] as const).map((city) => (
              <div key={city}>
                <p className="mb-1 text-[10px] font-bold text-brand-navy">{city}</p>
                <div className="flex flex-wrap gap-1">
                  {getRegionsByCity(city).map((r) => (
                    <button key={r.id} type="button"
                      onClick={() => setRegion(region === r.id ? "" : r.id)}
                      className={["rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors",
                        region === r.id ? "bg-brand-orange text-white" : "bg-bg-secondary text-text-secondary hover:bg-border-soft"].join(" ")}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 결과 + 초기화 */}
      <div className="mx-4 mb-4 flex items-center justify-between rounded-xl bg-jeju-green/10 border border-jeju-green/20 px-3 py-2 md:mx-0">
        <p className="text-[11px] font-medium text-text-primary">
          {loading ? "검색 중..." : (
            <>
              <span className="font-bold text-jeju-green">{places.length}곳</span>
              {(category || region || q) && (
                <span className="ml-1 text-text-secondary">
                  {region && REGIONS.find((r) => r.id === region)?.label + " · "}
                  {category && CATEGORIES.find((c) => c.id === category)?.label}
                  {q && `"${q}"`}
                </span>
              )}
            </>
          )}
        </p>
        {hasFilter && (
          <button type="button" onClick={resetFilters}
            className="text-[10px] font-semibold text-brand-orange hover:underline">
            필터 초기화
          </button>
        )}
      </div>

      {/* 결과 영역 */}
      {viewMode === "map" ? (
        <div className="mx-4 md:mx-0">
          <PlacesMap places={places} category={category} />
        </div>
      ) : loading ? (
        <div className="px-4 md:px-0">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] animate-pulse rounded-2xl bg-bg-secondary" />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center py-20 text-center px-4">
          <p className="text-4xl">⚠️</p>
          <p className="mt-3 text-sm font-bold text-text-primary">오류가 발생했어요</p>
          <p className="mt-1 text-xs text-text-secondary">{error}</p>
        </div>
      ) : places.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center px-4">
          <p className="text-4xl">🔍</p>
          <p className="mt-3 text-sm font-bold text-text-primary">조건에 맞는 장소가 없어요</p>
          <button type="button" onClick={resetFilters}
            className="mt-3 text-xs text-brand-orange underline">
            필터 초기화
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 px-4 sm:grid-cols-2 md:px-0 lg:grid-cols-3 xl:grid-cols-4">
          {places.map((p) => (
            <PlaceCard key={p.id} place={p} />
          ))}
        </div>
      )}
    </div>
  );
}
