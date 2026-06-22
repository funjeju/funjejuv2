import Link from "next/link";
import type { SpotGame } from "@/types/spot";

/**
 * CCTV 상세 → 최근 틀린그림(소상공인 강제관찰 광고) 배너.
 * CCTV 시청 트래픽을 그 지역 업소 광고(게임)로 흘려보내는 송객 지면.
 * 데스크톱: 돌AI 버튼 아래(사이드바) / 모바일: 영상 바로 아래.
 */
export function RecentGameBanner({ games, className = "" }: { games: SpotGame[]; className?: string }) {
  if (!games.length) return null;
  return (
    <div className={`mx-4 rounded-2xl border border-brand-orange/30 bg-gradient-to-br from-orange-50 to-amber-50 p-4 md:mx-0 ${className}`}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-bold text-brand-orange">🔍 틀린그림찾기 · 최근 게시물</p>
        <Link href="/game/spot" className="text-[11px] font-medium text-brand-orange">더보기 →</Link>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {games.slice(0, 3).map((g) => (
          <Link key={g.id} href={`/game/spot/${g.id}`} className="group overflow-hidden rounded-xl border border-border-soft bg-bg-card transition-transform hover:scale-[1.02]">
            <div className="relative aspect-square bg-bg-secondary">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.variantImage} alt={g.title} className="h-full w-full object-cover" loading="lazy" />
              <span className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white">틀린곳 {g.diffCount}</span>
            </div>
            <p className="line-clamp-1 px-1.5 py-1 text-[11px] font-bold text-text-primary">{g.title}</p>
          </Link>
        ))}
      </div>
      <p className="mt-2 text-center text-[10px] text-text-secondary">눌러서 틀린그림 찾고 보상 받기 🎁</p>
    </div>
  );
}
