"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/common/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { listMySpots, deleteMySpot } from "@/lib/my-spots";
import { CATEGORY_EMOJI, MY_SPOT_CATEGORIES, type MySpot, type MySpotCategory } from "@/types/my-spot";
import { ShareButton } from "@/components/common/ShareButton";

const SOURCE_LABEL: Record<MySpot["source"], string> = {
  search: "검색",
  jejutube: "▶ 제주tube",
  feed: "📸 피드",
  food: "🍴 맛집",
};

const categories = ["전체", ...MY_SPOT_CATEGORIES] as const;

export default function SavedPage() {
  const { user, signInWithGoogle } = useAuth();
  const [spots, setSpots] = useState<MySpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState<MySpotCategory | "전체">("전체");

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    listMySpots(user.uid).then((s) => { setSpots(s); setLoading(false); });
  }, [user]);

  async function handleDelete(id: string) {
    if (!user) return;
    setSpots((prev) => prev.filter((s) => s.id !== id));
    await deleteMySpot(user.uid, id).catch(() => {});
  }

  const filtered = activeCat === "전체" ? spots : spots.filter((s) => s.category === activeCat);

  if (!user) {
    return (
      <div className="mx-auto max-w-screen-xl px-0 md:px-4 md:py-6">
        <PageHeader title="마이스팟" subtitle="저장한 스팟을 관리하세요" emoji="📍" />
        <div className="flex flex-col items-center py-20 text-center px-4">
          <p className="text-5xl">📍</p>
          <p className="mt-4 text-base font-bold text-text-primary">로그인이 필요해요</p>
          <button
            type="button"
            onClick={signInWithGoogle}
            className="mt-4 rounded-full bg-brand-navy px-6 py-3 text-sm font-bold text-white"
          >
            Google로 시작하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-xl px-0 md:px-4 md:py-6">
      <PageHeader
        title="마이스팟"
        subtitle={`총 ${spots.length}개의 스팟을 저장했어요`}
        emoji="📍"
        right={
          spots.length > 0 ? (
            <Link
              href="/trip-ai"
              className="rounded-full bg-brand-orange px-4 py-2 text-xs font-bold text-white shadow-soft hover:bg-brand-orange/90 transition-colors"
            >
              일정으로 만들기
            </Link>
          ) : null
        }
      />

      {/* 카테고리 필터 */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-3 md:px-0">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCat(cat)}
            className={[
              "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
              activeCat === cat
                ? "bg-brand-orange text-white"
                : "border border-border-soft bg-bg-card text-text-secondary hover:bg-bg-secondary",
            ].join(" ")}
          >
            {cat === "전체" ? "전체" : `${CATEGORY_EMOJI[cat]} ${cat}`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-orange/30 border-t-brand-orange" />
        </div>
      ) : spots.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center px-4">
          <p className="text-5xl">📍</p>
          <p className="mt-4 text-base font-bold text-text-primary">아직 저장한 스팟이 없어요</p>
          <p className="mt-1 text-sm text-text-secondary">피드·도민맛집·제주tube에서 ⭐ 버튼을 눌러 저장해보세요!</p>
          <Link
            href="/food"
            className="mt-4 rounded-full bg-brand-orange px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-orange/90 transition-colors"
          >
            도민맛집 둘러보기
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 px-4 md:grid-cols-2 md:px-0 lg:grid-cols-3">
            {filtered.map((spot) => (
              <div
                key={spot.id}
                className="flex gap-4 rounded-2xl border border-border-soft bg-bg-card p-4 shadow-card"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-bg-secondary text-3xl">
                  {CATEGORY_EMOJI[spot.category]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-text-primary">{spot.name}</p>
                      {spot.address && (
                        <p className="truncate text-[11px] text-text-secondary">{spot.address}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(spot.id)}
                      className="shrink-0 text-xs text-text-secondary hover:text-live-red transition-colors"
                      aria-label="삭제"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-bg-secondary px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                      {CATEGORY_EMOJI[spot.category]} {spot.category}
                    </span>
                    <span className="rounded-full bg-bg-secondary px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                      {SOURCE_LABEL[spot.source]}
                    </span>
                    <span className="text-[10px] text-text-secondary">
                      {spot.direction}쪽
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <a
                      href={`https://map.kakao.com/link/map/${encodeURIComponent(spot.name)},${spot.lat},${spot.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full bg-brand-navy px-3 py-1 text-[11px] font-semibold !text-white hover:bg-brand-navy/90 transition-colors"
                    >
                      지도 보기
                    </a>
                    <ShareButton
                      title={`${spot.name} — 제주 스팟 | FunJeju`}
                      url={`https://map.kakao.com/link/map/${encodeURIComponent(spot.name)},${spot.lat},${spot.lng}`}
                      description={spot.address}
                      compact
                    />
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
