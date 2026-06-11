"use client";

import { useState } from "react";
import type { BookedAccommodation } from "@/types/trip";

const KAKAO_REST_KEY = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY;

type LodgingResult = {
  name: string;
  address: string;
  category: string;
  lat: number;
  lng: number;
};

function inJeju(lat: number, lng: number): boolean {
  return lat >= 33.1 && lat <= 33.65 && lng >= 126.1 && lng <= 127.0;
}

/** 카카오 로컬 숙박(AD5) 검색 — 제주 범위 한정 */
async function searchLodging(query: string): Promise<LodgingResult[]> {
  if (!KAKAO_REST_KEY) return [];
  const run = async (withCategory: boolean) => {
    const params = new URLSearchParams({
      query: `제주 ${query}`,
      size: "7",
      rect: "126.1,33.1,127.0,33.65", // 제주 BBOX
    });
    if (withCategory) params.set("category_group_code", "AD5");
    const res = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?${params}`, {
      headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      documents?: Array<{ place_name: string; road_address_name?: string; address_name?: string; category_name?: string; x: string; y: string }>;
    };
    return (data.documents ?? [])
      .map((d) => ({
        name: d.place_name,
        address: d.road_address_name || d.address_name || "",
        category: (d.category_name ?? "").split(">").pop()?.trim() ?? "",
        lat: Number(d.y),
        lng: Number(d.x),
      }))
      .filter((d) => inJeju(d.lat, d.lng));
  };
  try {
    // 숙박 카테고리 우선, 없으면 전체 검색 (풀빌라 등 분류가 다른 경우)
    const byCategory = await run(true);
    if (byCategory.length > 0) return byCategory;
    return await run(false);
  } catch {
    return [];
  }
}

type Props = {
  totalNights: number;
  value: BookedAccommodation[];
  onChange: (next: BookedAccommodation[]) => void;
};

export function AccommodationPicker({ totalNights, value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LodgingResult[] | null>(null);
  const [searching, setSearching] = useState(false);

  const assignedNights = value.reduce((s, a) => s + a.nights, 0);
  const remaining = totalNights - assignedNights;

  async function handleSearch() {
    const q = query.trim();
    if (!q || searching) return;
    setSearching(true);
    setResults(null);
    const found = await searchLodging(q);
    setResults(found);
    setSearching(false);
  }

  function addAccommodation(acc: Omit<BookedAccommodation, "nights">) {
    if (value.some((v) => v.name === acc.name)) { setResults(null); setQuery(""); return; }
    onChange([...value, { ...acc, nights: Math.max(1, Math.min(remaining, totalNights)) || 1 }]);
    setResults(null);
    setQuery("");
  }

  function updateNights(index: number, nights: number) {
    onChange(value.map((a, i) => (i === index ? { ...a, nights } : a)));
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      {/* 확정된 숙소 목록 */}
      {value.map((acc, i) => (
        <div key={`${acc.name}-${i}`} className="rounded-xl border border-brand-orange/30 bg-brand-orange/5 p-3">
          <div className="flex items-start gap-2">
            <span className="text-lg">🏨</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-text-primary">{acc.name}</p>
              {acc.address ? (
                <p className="mt-0.5 truncate text-[10px] text-text-secondary">{acc.address}</p>
              ) : (
                <p className="mt-0.5 text-[10px] text-text-secondary/70">직접 입력 — 위치는 AI가 추정해요</p>
              )}
            </div>
            <button type="button" onClick={() => remove(i)} className="shrink-0 text-xs text-text-secondary hover:text-live-red" aria-label="숙소 삭제">✕</button>
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-[10px] font-medium text-text-secondary">숙박:</span>
            {Array.from({ length: totalNights }, (_, n) => n + 1).map((n) => {
              const otherNights = assignedNights - acc.nights;
              const selectable = otherNights + n <= totalNights;
              return (
                <button
                  key={n}
                  type="button"
                  disabled={!selectable}
                  onClick={() => updateNights(i, n)}
                  className={[
                    "rounded-full px-2.5 py-1 text-[10px] font-bold transition-colors",
                    acc.nights === n
                      ? "bg-brand-orange text-white"
                      : selectable
                        ? "bg-bg-card border border-border-soft text-text-secondary hover:border-brand-orange"
                        : "bg-bg-secondary text-text-secondary/40 cursor-not-allowed",
                  ].join(" ")}
                >
                  {n}박
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* 배정 현황 */}
      {value.length > 0 && (
        <p className={["text-[11px] font-semibold", remaining === 0 ? "text-jeju-green" : remaining < 0 ? "text-live-red" : "text-text-secondary"].join(" ")}>
          {remaining === 0
            ? `✓ 총 ${totalNights}박 모두 배정 완료!`
            : remaining > 0
              ? `총 ${totalNights}박 중 ${assignedNights}박 배정 — 남은 ${remaining}박은 다음 단계에서 정해요`
              : `⚠ 배정된 박수(${assignedNights}박)가 전체 여행(${totalNights}박)보다 많아요`}
        </p>
      )}

      {/* 검색 입력 */}
      {remaining > 0 && (
        <div>
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearch(); } }}
              placeholder="숙소 이름 검색 (예: 신라스테이)"
              className="flex-1 rounded-xl border border-border-soft bg-bg-secondary px-3 py-2 text-xs outline-none focus:border-brand-orange"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={!query.trim() || searching}
              className="shrink-0 rounded-xl bg-brand-navy px-4 py-2 text-xs font-bold text-white hover:bg-brand-navy/90 disabled:opacity-40 transition-colors"
            >
              {searching ? "검색 중..." : "🔍 검색"}
            </button>
          </div>

          {/* 검색 결과 */}
          {results !== null && (
            <div className="mt-2 overflow-hidden rounded-xl border border-border-soft bg-bg-card">
              {results.length === 0 ? (
                <div className="p-3">
                  <p className="text-[11px] text-text-secondary">검색 결과가 없어요.</p>
                  <button
                    type="button"
                    onClick={() => addAccommodation({ name: query.trim() })}
                    className="mt-2 rounded-full border border-border-soft px-3 py-1.5 text-[10px] font-semibold text-text-secondary hover:border-brand-orange hover:text-brand-orange transition-colors"
                  >
                    &ldquo;{query.trim()}&rdquo; 이름 그대로 추가하기
                  </button>
                </div>
              ) : (
                results.map((r) => (
                  <button
                    key={`${r.name}-${r.lat}`}
                    type="button"
                    onClick={() => addAccommodation(r)}
                    className="flex w-full items-center gap-2 border-b border-border-soft px-3 py-2.5 text-left last:border-b-0 hover:bg-brand-orange/5 transition-colors"
                  >
                    <span className="text-base">🏨</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold text-text-primary">{r.name}</span>
                      <span className="block truncate text-[10px] text-text-secondary">{r.address}</span>
                    </span>
                    {r.category && (
                      <span className="shrink-0 rounded-full bg-bg-secondary px-2 py-0.5 text-[9px] text-text-secondary">{r.category}</span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
