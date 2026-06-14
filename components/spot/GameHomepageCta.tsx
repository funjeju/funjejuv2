"use client";

import { useMySpot } from "@/hooks/useMySpot";
import type { MySpotCategory } from "@/types/my-spot";

type GameSpot = {
  id: string;
  name: string;
  category: MySpotCategory;
  lat: number;
  lng: number;
  address?: string;
};

/** 틀린그림찾기 게임 아래: 연결 업체 홈페이지 CTA + 마이스팟 찜하기 */
export function GameHomepageCta({
  homepageUrl,
  homepageName,
  spot,
}: {
  homepageUrl: string;
  homepageName?: string;
  spot?: GameSpot | null;
}) {
  const { isSpot, toggle } = useMySpot();
  const saved = spot ? isSpot(spot.id) : false;
  const external = !homepageUrl.startsWith("/");

  return (
    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
      <a
        href={homepageUrl}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-navy py-3.5 text-sm font-bold !text-white shadow-soft transition-colors hover:bg-brand-navy/90"
      >
        🏠 {homepageName || "이 가게"} 홈페이지 보러가기 →
      </a>
      {spot && (
        <button
          type="button"
          onClick={() =>
            toggle(spot.id, {
              name: spot.name,
              category: spot.category,
              lat: spot.lat,
              lng: spot.lng,
              address: spot.address,
              source: "game",
            })
          }
          className={[
            "flex shrink-0 items-center justify-center gap-1.5 rounded-2xl border px-4 py-3.5 text-sm font-bold transition-colors",
            saved
              ? "border-brand-orange bg-brand-orange/10 text-brand-orange"
              : "border-border-soft bg-bg-card text-text-secondary hover:border-brand-orange/50 hover:text-brand-orange",
          ].join(" ")}
          title={saved ? "마이스팟에서 빼기" : "마이스팟에 저장"}
        >
          {saved ? "⭐ 찜함" : "☆ 마이스팟 찜"}
        </button>
      )}
    </div>
  );
}
