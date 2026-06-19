import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTopic } from "@/lib/acrostic";
import { resolveGameSpot } from "@/lib/game-biz-link";
import { AcrosticPlay } from "@/components/acrostic/AcrosticPlay";
import { GameHomepageCta } from "@/components/spot/GameHomepageCta";
import { ShareButton } from "@/components/common/ShareButton";

export const revalidate = 30;
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const t = await getTopic(id);
  if (!t) return { title: "주제를 찾을 수 없습니다 | 펀제주" };
  return {
    title: `${t.word} 삼행시 — 제주 ${t.businessName ?? ""} | 펀제주`,
    description: `'${t.word}'로 삼행시를 짓고 좋아요로 우승에 도전하세요!`,
    alternates: { canonical: `https://www.funjeju.com/game/acrostic/${id}` },
  };
}

export default async function AcrosticPlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTopic(id);
  if (!t) notFound(); // draft도 직접 URL로는 검수 가능(갤러리엔 발행분만 노출)

  const topic = JSON.parse(JSON.stringify(t));
  const spot = await resolveGameSpot({
    spotId: `acrostic_${t.id}`,
    homepageUrl: t.homepageUrl,
    homepageName: t.homepageName,
    fallbackName: t.businessName || t.word,
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-3 flex items-center justify-between">
        <Link href="/game/acrostic" className="inline-block text-xs font-medium text-brand-orange">← 삼행시 목록</Link>
        <ShareButton title={`${t.word} 삼행시 | 펀제주`} url={`https://www.funjeju.com/game/acrostic/${id}`} description={`'${t.word}'로 삼행시 짓기!`} />
      </div>

      <AcrosticPlay topic={topic} />

      {t.homepageUrl && (
        <GameHomepageCta homepageUrl={t.homepageUrl} homepageName={t.homepageName} spot={spot} />
      )}
    </div>
  );
}
