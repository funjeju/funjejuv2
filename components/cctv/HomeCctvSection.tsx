"use client";

import Link from "next/link";
import { useCctvFavorite } from "@/hooks/useCctvFavorite";
import { usePublicCctvs } from "@/hooks/usePublicCctvs";
import { CctvList } from "@/components/cctv/CctvList";

export function HomeCctvSection() {
  const { favoriteIds } = useCctvFavorite();
  const { cctvs, loading, error } = usePublicCctvs();
  const visible = error || loading ? [] : cctvs;

  // 즐겨찾기한 CCTV가 있으면 우선 표시, 없으면 기본 첫 2개
  const savedCctvs = visible.filter((c) => favoriteIds.has(c.id));
  const displayCctvs = savedCctvs.length > 0 ? savedCctvs.slice(0, 4) : visible.slice(0, 2);
  const isPersonalized = savedCctvs.length > 0;

  return (
    <section className="px-4 md:px-0">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-text-primary md:text-lg">
          {isPersonalized ? (
            <>내 즐겨찾기 CCTV <span className="text-brand-orange">⭐</span></>
          ) : (
            "제주 CCTV"
          )}
        </h2>
        <Link href="/cctv" className="text-xs font-medium text-brand-orange">
          전체보기 →
        </Link>
      </div>

      {/* TV-shaped container */}
      <div className="relative rounded-2xl border-4 border-jeju-green bg-jeju-green/10 p-3">
        <div className="absolute -top-4 left-1/2 flex -translate-x-1/2 gap-4 text-xl text-jeju-green">
          <span className="-rotate-12 inline-block">📡</span>
        </div>

        {loading ? <p role="status" className="p-4 text-sm">공개 카메라를 확인하고 있어요.</p>
          : error ? <p role="status" className="p-4 text-sm">카메라 목록을 불러올 수 없습니다.</p>
          : displayCctvs.length ? <CctvList cctvs={displayCctvs} />
          : <p role="status" className="p-4 text-sm">지금 공개 가능한 카메라가 없어요.</p>}

        {isPersonalized && savedCctvs.length > 4 && (
          <p className="mt-2 text-center text-[11px] text-text-secondary">
            저장한 CCTV {savedCctvs.length}개 중 4개 표시
          </p>
        )}

        <Link
          href={isPersonalized ? "/mypage" : "/cctv"}
          className="mt-3 flex w-full items-center justify-between rounded-xl border border-jeju-green/30 bg-white px-4 py-2.5 text-sm font-semibold text-text-primary hover:bg-jeju-green/5 transition-colors"
        >
          <span className="text-sm">〈</span>
          <span>{isPersonalized ? "내 즐겨찾기 모두 보기" : "전체 CCTV 보기"}</span>
          <span className="text-sm">〉</span>
        </Link>
      </div>
    </section>
  );
}
