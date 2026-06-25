import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getGame } from "@/lib/spot";
import { resolveGameSpot } from "@/lib/game-biz-link";
import { SpotGamePlay } from "@/components/spot/SpotGamePlay";
import { GameHomepageCta } from "@/components/spot/GameHomepageCta";
import { ShareButton } from "@/components/common/ShareButton";

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
  const url = `https://funjeju.com/game/spot/${id}`;
  const title = `${g.title} — 제주 틀린그림찾기 | 펀제주`;
  const description = `제주 사진 속 다른 ${g.diffCount}곳을 찾아보세요. 최단시간 랭킹에 도전!`;
  // 카톡/페북 미리보기용 og:image — 문제 원본 사진(절대 URL)
  const image = g.origImage?.startsWith("http") ? g.origImage : undefined;
  return {
    title,
    description,
    keywords: ["제주 틀린그림찾기", g.title, "제주 게임"],
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      siteName: "펀제주",
      ...(image ? { images: [{ url: image, width: 1200, height: 630, alt: g.title }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
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

  // 연결 홈피가 내부 /biz/슬러그면 좌표·업체명을 가져와 마이스팟 찜 가능하게 (공용 모듈)
  const spot = await resolveGameSpot({
    spotId: `game_${g.id}`,
    homepageUrl: g.homepageUrl,
    homepageName: g.homepageName,
    fallbackName: g.title,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
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
