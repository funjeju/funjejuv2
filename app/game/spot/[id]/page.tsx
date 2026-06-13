import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getGame } from "@/lib/spot";
import { SpotGamePlay } from "@/components/spot/SpotGamePlay";
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-3 flex items-center justify-between">
        <Link href="/game/spot" className="inline-block text-xs font-medium text-brand-orange">← 게임 갤러리</Link>
        <ShareButton title={`${g.title} — 제주 틀린그림찾기 | 펀제주`} url={`https://funjeju.com/game/spot/${id}`} description={`다른 ${g.diffCount}곳을 찾아보세요!`} />
      </div>
      <SpotGamePlay game={game} />
    </div>
  );
}
