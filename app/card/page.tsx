import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/common/PageHeader";
import { listPublished } from "@/lib/contents";

export const revalidate = 60;

const SITE = "https://funjeju.com";

export const metadata: Metadata = {
  title: "제주 카드뉴스 — 한눈에 보는 제주 | 펀제주",
  description: "제주 맛집·실시간 날씨·여행 소식을 카드뉴스로. 인스타·스레드에 바로 저장하세요. 펀제주가 만드는 제주 카드뉴스.",
  alternates: { canonical: `${SITE}/card` },
  keywords: ["제주 카드뉴스", "제주 여행 카드뉴스", "제주 맛집 카드", "제주 날씨 카드뉴스", "펀제주"],
  openGraph: {
    type: "website",
    url: `${SITE}/card`,
    title: "제주 카드뉴스 — 한눈에 보는 제주",
    description: "제주 맛집·실시간 날씨·여행 소식을 카드뉴스로",
    siteName: "펀제주",
  },
};

export default async function CardNewsListPage() {
  const items = await listPublished("card_news", 60);

  return (
    <div className="mx-auto max-w-screen-lg px-4 py-6">
      <PageHeader title="제주 카드뉴스" subtitle="맛집·실시간 날씨·여행 소식을 카드로 — 저장해서 인스타·스레드에" emoji="🃏" />

      {items.length === 0 ? (
        <p className="mt-10 text-center text-sm text-text-secondary">곧 카드뉴스가 올라옵니다.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {items.map((c) => (
            <Link key={c.id} href={`/card/${c.slug}`}
              className="group relative block aspect-[4/5] overflow-hidden rounded-2xl border border-border-soft bg-brand-navy shadow-card">
              {c.coverImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.coverImage} alt={c.title.replace(/\n/g, " ")} className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-3">
                <p className="whitespace-pre-line text-sm font-black leading-tight text-white drop-shadow">{c.title}</p>
                {c.subtitle && <p className="mt-1 line-clamp-1 text-[11px] text-white/80">{c.subtitle}</p>}
              </div>
              <span className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white">🃏 {1 + (c.sections?.length ?? 0) + 1}장</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
