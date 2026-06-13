import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/common/PageHeader";
import { listGames } from "@/lib/spot";

// 새 문제·플레이 횟수가 바로 반영되도록 매 요청 렌더 (Firestore 단순 조회라 가벼움)
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "제주 틀린그림찾기 — 제주 사진으로 즐기는 게임 | 펀제주",
  description: "제주 풍경·맛집 사진으로 만든 틀린그림찾기. 가장 빠른 시간에 도전하고 랭킹에 이름을 올려보세요.",
  keywords: ["제주 틀린그림찾기", "제주 게임", "제주 사진", "틀린그림찾기"],
  alternates: { canonical: "https://funjeju.com/game/spot" },
};

export default async function SpotGalleryPage() {
  const games = await listGames({ publishedOnly: true, limit: 60 });

  return (
    <div className="mx-auto max-w-5xl px-0 md:px-4 md:py-6">
      <PageHeader title="제주 틀린그림찾기" subtitle="제주 사진 속 다른 곳을 찾아보세요" emoji="🔍" />

      {games.length === 0 ? (
        <p className="px-4 py-16 text-center text-sm text-text-secondary md:px-0">곧 첫 문제가 올라옵니다.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4 sm:grid-cols-3 md:px-0">
          {games.map((g) => (
            <Link key={g.id} href={`/game/spot/${g.id}`} className="group overflow-hidden rounded-2xl border border-border-soft bg-bg-card shadow-card transition-transform hover:scale-[1.02]">
              <div className="relative aspect-square bg-bg-secondary">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.variantImage} alt={g.title} className="h-full w-full object-cover" loading="lazy" />
                <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">틀린곳 {g.diffCount}</span>
              </div>
              <div className="p-2.5">
                <p className="line-clamp-1 text-[13px] font-bold text-text-primary">{g.title}</p>
                <p className="text-[10px] text-text-secondary">플레이 {g.playCount ?? 0}회</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
