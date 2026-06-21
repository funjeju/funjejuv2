import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/common/PageHeader";
import { listPublished } from "@/lib/contents";
import type { Content } from "@/types/content";

export const revalidate = 60;

const SITE = "https://funjeju.com";

export const metadata: Metadata = {
  title: "제주 매거진 — 데일리 소식·여행 웹진·카드뉴스 | 펀제주",
  description: "오늘의 제주 소식(AI데일리제주), 도민맛집·여행 웹진, 카드뉴스를 한곳에. 매일 갱신되는 제주 콘텐츠.",
  alternates: { canonical: `${SITE}/magazine` },
  keywords: ["제주 매거진", "제주 소식", "제주 여행 웹진", "제주 카드뉴스", "AI데일리제주", "펀제주"],
  openGraph: { type: "website", url: `${SITE}/magazine`, title: "제주 매거진 — 한곳에서 보는 제주 콘텐츠", description: "데일리 소식·여행 웹진·카드뉴스", siteName: "펀제주" },
};

function SectionHead({ id, emoji, title, more }: { id: string; emoji: string; title: string; more: string }) {
  return (
    <div id={id} className="mb-3 mt-8 flex items-end justify-between scroll-mt-20">
      <h2 className="text-lg font-black text-text-primary">{emoji} {title}</h2>
      <Link href={more} className="text-xs font-bold text-brand-orange">더보기 →</Link>
    </div>
  );
}

const TABS = [
  { id: "daily", label: "🌅 AI데일리제주" },
  { id: "webzine", label: "📰 여행 웹진" },
  { id: "card", label: "🃏 카드뉴스" },
];

export default async function MagazinePage() {
  const [briefings, webzines, cards] = await Promise.all([
    listPublished("briefing", 2).catch(() => [] as Content[]),
    listPublished("webzine", 6).catch(() => [] as Content[]),
    listPublished("card_news", 8).catch(() => [] as Content[]),
  ]);

  return (
    <div className="mx-auto max-w-screen-lg px-4 py-6">
      <PageHeader title="제주 매거진" subtitle="오늘의 소식 · 여행 웹진 · 카드뉴스를 한곳에" emoji="📖" />

      {/* 최상단 3섹션 퀵메뉴 (모바일 포함, 앵커 이동) */}
      <div className="sticky top-0 z-10 -mx-4 mt-2 flex gap-2 overflow-x-auto bg-bg-primary/90 px-4 py-2 backdrop-blur">
        {TABS.map((t) => (
          <a key={t.id} href={`#${t.id}`} className="shrink-0 rounded-full border border-border-soft bg-bg-card px-3 py-1.5 text-xs font-bold text-text-primary hover:bg-brand-navy hover:text-white">{t.label}</a>
        ))}
      </div>

      {/* AI데일리제주 */}
      {briefings.length > 0 && (
        <>
          <SectionHead id="daily" emoji="🌅" title="AI데일리제주" more="/daily" />
          <div className="grid gap-3 sm:grid-cols-2">
            {briefings.map((b) => (
              <Link key={b.id} href={`/daily/${b.slug}`} className="block overflow-hidden rounded-2xl border border-border-soft bg-bg-card shadow-card hover:border-brand-navy">
                {b.coverImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.coverImage} alt={b.title} className="h-36 w-full object-cover" loading="lazy" />
                )}
                <div className="p-3">
                  <p className="text-sm font-bold text-text-primary">{b.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{b.subtitle || b.intro}</p>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* 여행 웹진 */}
      {webzines.length > 0 && (
        <>
          <SectionHead id="webzine" emoji="📰" title="여행 웹진" more="/webzine" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {webzines.map((w) => (
              <Link key={w.id} href={`/webzine/${w.slug}`} className="block overflow-hidden rounded-2xl border border-border-soft bg-bg-card shadow-card hover:border-brand-navy">
                {w.coverImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={w.coverImage} alt={w.title} className="aspect-video w-full object-cover" loading="lazy" />
                )}
                <p className="line-clamp-2 p-2.5 text-[13px] font-bold leading-snug text-text-primary">{w.title}</p>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* 카드뉴스 */}
      <SectionHead id="card" emoji="🃏" title="카드뉴스" more="/card" />
      {cards.length === 0 ? (
        <p className="text-sm text-text-secondary">곧 카드뉴스가 올라옵니다. <Link href="/card" className="font-bold text-brand-orange">제주도청 소식 보기 →</Link></p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {cards.map((c) => (
            <Link key={c.id} href={`/card/${c.slug}`} className="group relative block aspect-square overflow-hidden rounded-2xl border border-border-soft bg-brand-navy shadow-card">
              {c.coverImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.coverImage} alt={c.title.replace(/\n/g, " ")} className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <p className="absolute inset-x-0 bottom-0 whitespace-pre-line p-2.5 text-sm font-black leading-tight text-white drop-shadow">{c.title}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
