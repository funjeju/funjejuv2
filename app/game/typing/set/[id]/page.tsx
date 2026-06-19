import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSet, getSetPassages } from "@/lib/typing";
import { resolveGameSpot } from "@/lib/game-biz-link";
import { TypingSetPlay } from "@/components/typing/TypingSetPlay";
import { GameHomepageCta } from "@/components/spot/GameHomepageCta";
import { ShareButton } from "@/components/common/ShareButton";

export const revalidate = 30;
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const s = await getSet(id);
  if (!s) return { title: "세트를 찾을 수 없습니다 | 펀제주" };
  return {
    title: `타자연습 세트 — ${s.title} | 펀제주`,
    description: `${s.passageIds.length}개 지문 연속 타자 + 평균 타수 랭킹`,
    alternates: { canonical: `https://funjeju.com/game/typing/set/${id}` },
  };
}

export default async function TypingSetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSet(id);
  if (!s) notFound();
  const passages = await getSetPassages(s);
  if (passages.length < 2) notFound();

  const set = JSON.parse(JSON.stringify(s));
  const plainPassages = JSON.parse(JSON.stringify(passages));
  const spot = await resolveGameSpot({
    spotId: `typingset_${s.id}`,
    homepageUrl: s.homepageUrl,
    homepageName: s.homepageName,
    fallbackName: s.businessName || s.title,
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-3 flex items-center justify-between">
        <Link href="/game/typing" className="inline-block text-xs font-medium text-brand-orange">← 타자 목록</Link>
        <ShareButton title={`타자연습 세트 — ${s.title} | 펀제주`} url={`https://funjeju.com/game/typing/set/${id}`} description="제주 매장 타자 세트 + 평균 타수 랭킹!" />
      </div>

      <TypingSetPlay set={set} passages={plainPassages} />

      {s.homepageUrl && (
        <GameHomepageCta homepageUrl={s.homepageUrl} homepageName={s.homepageName} spot={spot} />
      )}
    </div>
  );
}
