import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPassage } from "@/lib/typing";
import { resolveGameSpot } from "@/lib/game-biz-link";
import { TypingPlay } from "@/components/typing/TypingPlay";
import { GameHomepageCta } from "@/components/spot/GameHomepageCta";
import { ShareButton } from "@/components/common/ShareButton";

export const revalidate = 30;
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = await getPassage(id);
  if (!p) return { title: "지문을 찾을 수 없습니다 | 펀제주" };
  return {
    title: `타자연습 — ${p.businessName ?? "제주 매장"} | 펀제주`,
    description: p.text.slice(0, 80),
    alternates: { canonical: `https://funjeju.com/game/typing/${id}` },
  };
}

export default async function TypingPlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getPassage(id);
  if (!p) notFound(); // draft도 직접 URL로는 검수 가능(갤러리엔 발행분만 노출)

  const passage = JSON.parse(JSON.stringify(p));
  const spot = await resolveGameSpot({
    spotId: `typing_${p.id}`,
    homepageUrl: p.homepageUrl,
    homepageName: p.homepageName,
    fallbackName: p.businessName || "이 가게",
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-3 flex items-center justify-between">
        <Link href="/game/typing" className="inline-block text-xs font-medium text-brand-orange">← 타자 목록</Link>
        <ShareButton title={`타자연습 — ${p.businessName ?? "제주"} | 펀제주`} url={`https://funjeju.com/game/typing/${id}`} description="제주 매장 타자연습 + 주간순위!" />
      </div>

      <TypingPlay passage={passage} />

      {p.homepageUrl && (
        <GameHomepageCta homepageUrl={p.homepageUrl} homepageName={p.homepageName} spot={spot} />
      )}
    </div>
  );
}
