import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getGame } from "@/lib/spot";
import { getSite } from "@/lib/biz/store";
import { SpotGamePlay } from "@/components/spot/SpotGamePlay";
import { GameHomepageCta } from "@/components/spot/GameHomepageCta";
import { ShareButton } from "@/components/common/ShareButton";
import type { MySpotCategory } from "@/types/my-spot";

function toMySpotCategory(cat?: string): MySpotCategory {
  const c = cat ?? "";
  if (/카페|커피|디저트|베이커리|브런치/.test(c)) return "카페";
  if (/숙소|호텔|펜션|게스트|민박|리조트/.test(c)) return "숙소";
  if (/관광|명소|여행|체험|해변|오름/.test(c)) return "여행지";
  return "맛집";
}

export const revalidate = 60;
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const g = await getGame(id);
  if (!g) return { title: "문제를 찾을 수 없습니다 | 펀제주" };
  return {
    title: `${g.title} — 제주 틀린그림찾기 | 펀제주`,
    description: `제주 사진 속 다른 ${g.diffCount}곳을 찾아보세요. 최단시간 랭킹에 도전!`,
    keywords: ["제주 틀린그림찾기", g.title, "제주 게임"],
    alternates: { canonical: `https://funjeju.com/game/spot/${id}` },
  };
}

export default async function SpotPlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const g = await getGame(id);
  if (!g || g.status !== "published") notFound();

  // Firestore Timestamp 등 직렬화
  const game = JSON.parse(JSON.stringify(g));

  // 연결 홈피가 내부 /biz/슬러그면 좌표·업체명을 가져와 마이스팟 찜 가능하게
  let spot: { id: string; name: string; category: MySpotCategory; lat: number; lng: number; address?: string } | null = null;
  if (g.homepageUrl?.startsWith("/biz/")) {
    const slug = g.homepageUrl.split("/biz/")[1]?.split(/[/?#]/)[0];
    if (slug) {
      try {
        const site = await getSite(slug);
        const co = site?.merchantInfo?.coordinates;
        if (site && co?.lat && co?.lng) {
          spot = {
            id: `game_${g.id}`,
            name: site.merchantInfo.name || g.homepageName || g.title,
            category: toMySpotCategory(site.merchantInfo.category),
            lat: co.lat,
            lng: co.lng,
            address: site.merchantInfo.address,
          };
        }
      } catch { /* 좌표 못 가져오면 찜 버튼 없이 CTA만 */ }
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-3 flex items-center justify-between">
        <Link href="/game/spot" className="inline-block text-xs font-medium text-brand-orange">← 게임 갤러리</Link>
        <ShareButton title={`${g.title} — 제주 틀린그림찾기 | 펀제주`} url={`https://funjeju.com/game/spot/${id}`} description={`다른 ${g.diffCount}곳을 찾아보세요!`} />
      </div>
      <SpotGamePlay game={game} />

      {/* 연결 업체 홈페이지 CTA + 마이스팟 찜 — 게임 바로 아래 (게임 → 홈피 유입·재방문 고리) */}
      {g.homepageUrl && (
        <GameHomepageCta homepageUrl={g.homepageUrl} homepageName={g.homepageName} spot={spot} />
      )}
    </div>
  );
}
