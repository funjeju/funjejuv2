"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/common/PageHeader";
import { useSaved } from "@/hooks/useSaved";
import { mockCctvs } from "@/constants/mock-cctvs";
import { SaveButton } from "@/components/common/SaveButton";

const DEMO_SPOTS = [
  { id: "hamdeok", name: "협재 해변", region: "제주시 한림읍", category: "해변", emoji: "🏖️", rating: 4.9, reviews: 1240 },
  { id: "seongsan", name: "성산 일출봉", region: "서귀포시 성산읍", category: "오름", emoji: "⛰️", rating: 4.9, reviews: 5430 },
  { id: "aewol", name: "애월 해안도로", region: "제주시 애월읍", category: "드라이브", emoji: "🚗", rating: 4.6, reviews: 670 },
  { id: "jungmun", name: "중문 관광단지", region: "서귀포시 중문동", category: "관광지", emoji: "🌴", rating: 4.7, reviews: 3200 },
  { id: "camellia", name: "카멜리아힐", region: "서귀포시 안덕면", category: "관광지", emoji: "🌸", rating: 4.8, reviews: 980 },
  { id: "osulloc", name: "오설록 티뮤지엄", region: "서귀포시 안덕면", category: "카페", emoji: "🍵", rating: 4.7, reviews: 2100 },
];

const categories = ["전체", "해변", "오름", "카페", "맛집", "관광지", "드라이브"];

export default function SavedPage() {
  const { isSaved } = useSaved();
  const [activeCat, setActiveCat] = useState("전체");

  // CCTV 저장된 것 + 데모 스팟 합쳐서 표시
  const allSpots = [
    ...DEMO_SPOTS,
    ...mockCctvs.map((c) => ({
      id: c.id,
      name: c.name,
      region: c.region,
      category: c.category,
      emoji: "📷",
      rating: 4.5,
      reviews: 500,
    })),
  ];

  const savedSpots = allSpots.filter((s) => isSaved(s.id));
  const filtered = savedSpots.filter((s) => activeCat === "전체" || s.category === activeCat);

  return (
    <div className="mx-auto max-w-screen-xl px-0 md:px-4 md:py-6">
      <PageHeader
        title="저장한 스팟"
        subtitle={`총 ${savedSpots.length}개의 스팟을 저장했어요`}
        emoji="⭐"
        right={
          savedSpots.length > 0 ? (
            <Link
              href="/trip-ai"
              className="rounded-full bg-brand-orange px-4 py-2 text-xs font-bold text-white shadow-soft hover:bg-brand-orange/90 transition-colors"
            >
              일정으로 만들기
            </Link>
          ) : null
        }
      />

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-3 md:px-0">
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

      {/* Empty state */}
      {savedSpots.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center px-4">
          <p className="text-5xl">⭐</p>
          <p className="mt-4 text-base font-bold text-text-primary">아직 저장한 스팟이 없어요</p>
          <p className="mt-1 text-sm text-text-secondary">CCTV·피드에서 ☆ 버튼을 눌러 저장해보세요!</p>
          <Link
            href="/cctv"
            className="mt-4 rounded-full bg-brand-orange px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-orange/90 transition-colors"
          >
            CCTV 둘러보기
          </Link>
        </div>
      ) : (
        <>
          {/* Spots grid */}
          <div className="grid grid-cols-1 gap-3 px-4 md:grid-cols-2 md:px-0 lg:grid-cols-3">
            {filtered.map((spot) => (
              <div
                key={spot.id}
                className="flex gap-4 rounded-2xl border border-border-soft bg-bg-card p-4 shadow-card"
              >
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-bg-secondary text-4xl">
                  {spot.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold text-text-primary">{spot.name}</p>
                      <p className="text-[11px] text-text-secondary">{spot.region}</p>
                    </div>
                    <SaveButton id={spot.id} label={false} />
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="rounded-full bg-bg-secondary px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                      {spot.category}
                    </span>
                    <span className="text-[11px] font-semibold text-brand-yellow">★ {spot.rating}</span>
                    <span className="text-[10px] text-text-secondary">({spot.reviews.toLocaleString()})</span>
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    <Link
                      href={spot.emoji === "📷" ? `/cctv/${spot.id}` : "/trip-ai"}
                      className="rounded-full bg-brand-navy px-3 py-1 text-[11px] font-semibold text-white hover:bg-brand-navy/90 transition-colors"
                    >
                      상세 보기
                    </Link>
                    <Link
                      href="/trip-ai"
                      className="rounded-full border border-border-soft bg-bg-secondary px-3 py-1 text-[11px] font-medium text-text-secondary hover:bg-bg-primary transition-colors"
                    >
                      일정 추가
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="flex flex-col items-center py-12 text-center">
              <p className="text-sm font-bold text-text-primary">해당 카테고리에 저장된 스팟이 없어요</p>
              <button type="button" onClick={() => setActiveCat("전체")} className="mt-2 text-xs text-brand-orange underline">
                전체 보기
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
