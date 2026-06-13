"use client";

import { useState } from "react";
import Link from "next/link";
import { mockCctvs } from "@/constants/mock-cctvs";
import { CctvFavoriteButton } from "@/components/common/CctvFavoriteButton";

const RECENT = ["협재 해변", "흑돼지 맛집", "성산 일출봉", "애월 카페"];
const POPULAR = ["한라산 트래킹", "오설록", "카멜리아힐", "함덕 해수욕장", "중문 해변", "서귀포 야시장"];

export default function SearchPage() {
  const [query, setQuery] = useState("");

  const results = query.trim()
    ? mockCctvs.filter(
        (c) =>
          c.name.includes(query) ||
          c.region.includes(query) ||
          c.category.includes(query) ||
          c.description.includes(query)
      )
    : [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-5 md:py-6">
      {/* Search input */}
      <div className="flex items-center gap-3 rounded-2xl border border-border-soft bg-bg-card px-4 py-3 shadow-card focus-within:border-brand-orange transition-colors">
        <span className="text-xl text-text-secondary">🔍</span>
        <input
          autoFocus
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="제주에서 무엇을 찾고 있나요?"
          className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-secondary outline-none"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} className="text-text-secondary hover:text-text-primary">
            ✕
          </button>
        )}
      </div>

      {/* Results */}
      {query.trim() ? (
        <div className="mt-5">
          <p className="mb-3 text-sm font-bold text-text-primary">
            &ldquo;{query}&rdquo; 검색 결과 <span className="text-brand-orange">{results.length}개</span>
          </p>
          {results.length > 0 ? (
            <div className="space-y-2">
              {results.map((c) => (
                <div key={c.id} className="flex gap-3 rounded-2xl border border-border-soft bg-bg-card p-3 shadow-card">
                  <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-xl bg-gray-800 text-2xl">
                    🏝️
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-ocean-blue">{c.region} · CCTV</p>
                    <p className="text-sm font-bold text-text-primary">{c.name}</p>
                    <p className="line-clamp-1 text-xs text-text-secondary">{c.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Link href={`/cctv/${c.id}`} className="rounded-full bg-brand-navy px-3 py-1 text-[11px] font-bold text-white hover:bg-brand-navy/90 transition-colors">
                      보기
                    </Link>
                    <CctvFavoriteButton id={c.id} label={false} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-16 text-center">
              <p className="text-4xl">🔍</p>
              <p className="mt-3 text-sm font-bold text-text-primary">검색 결과가 없어요</p>
              <p className="mt-1 text-xs text-text-secondary">다른 키워드로 검색해보세요</p>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Recent */}
          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-text-primary">최근 검색어</p>
              <button type="button" className="text-xs text-text-secondary hover:text-text-primary">전체 삭제</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {RECENT.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setQuery(r)}
                  className="rounded-full border border-border-soft bg-bg-card px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-bg-secondary transition-colors"
                >
                  🕐 {r}
                </button>
              ))}
            </div>
          </div>

          {/* Popular */}
          <div className="mt-6">
            <p className="mb-3 text-sm font-bold text-text-primary">🔥 지금 인기 검색어</p>
            <div className="space-y-2">
              {POPULAR.map((p, i) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setQuery(p)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-bg-secondary transition-colors"
                >
                  <span className={["w-5 text-center text-sm font-black", i < 3 ? "text-brand-orange" : "text-text-secondary"].join(" ")}>
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium text-text-primary">{p}</span>
                  {i < 3 && <span className="ml-auto text-[10px] text-live-red font-semibold">HOT</span>}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
