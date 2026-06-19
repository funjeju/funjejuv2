import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/common/PageHeader";
import { listTopics } from "@/lib/acrostic";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "제주 삼행시 짓기 — 좋아요로 우승 도전 | 펀제주",
  description: "제주 가게·메뉴 이름으로 삼행시를 짓고 좋아요를 받아 우승에 도전하세요.",
  keywords: ["제주 삼행시", "삼행시 짓기", "제주 게임"],
  alternates: { canonical: "https://www.funjeju.com/game/acrostic" },
};

export default async function AcrosticGalleryPage() {
  const topics = await listTopics({ publishedOnly: true });

  return (
    <div className="mx-auto max-w-5xl px-0 md:px-4 md:py-6">
      <PageHeader title="제주 삼행시 짓기" subtitle="가게·메뉴 이름으로 삼행시 짓고 좋아요로 우승!" emoji="✍️" />

      {topics.length === 0 ? (
        <p className="px-4 py-16 text-center text-sm text-text-secondary md:px-0">곧 첫 주제가 올라옵니다.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4 sm:grid-cols-3 md:px-0">
          {topics.map((t) => {
            const closed = !!t.endsAt && Date.now() > t.endsAt;
            return (
              <Link key={t.id} href={`/game/acrostic/${t.id}`} className="group overflow-hidden rounded-2xl border border-border-soft bg-bg-card shadow-card transition-transform hover:scale-[1.02]">
                <div className="relative aspect-square bg-bg-secondary">
                  {t.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.image} alt={t.word} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-brand-navy">
                      <span className="text-3xl font-black tracking-widest text-white">{t.word}</span>
                    </div>
                  )}
                  <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">{closed ? "마감" : `✍️ ${t.entryCount ?? 0}`}</span>
                </div>
                <div className="p-2.5">
                  <p className="line-clamp-1 text-[13px] font-bold text-text-primary">{t.businessName || t.word} 삼행시</p>
                  <p className="text-[10px] text-text-secondary">주제: {t.word}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
