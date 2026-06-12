import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/common/PageHeader";
import { getContentBySlug, listPublished } from "@/lib/contents";

const SITE_URL = "https://funjeju.com";
export const revalidate = 1800;
export const dynamicParams = true;

export async function generateStaticParams() {
  const items = await listPublished("briefing", 100);
  return items.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = await getContentBySlug(slug);
  if (!c || c.status !== "published") return { title: "브리핑을 찾을 수 없습니다 | 펀제주" };
  const url = `${SITE_URL}/daily/${c.slug}`;
  const desc = (c.intro || c.subtitle).slice(0, 160);
  return {
    title: `${c.title} | AI데일리제주`,
    description: desc,
    keywords: c.keywords,
    alternates: { canonical: url },
    openGraph: { title: c.title, description: desc, url, type: "article", ...(c.coverImage ? { images: [{ url: `${SITE_URL}${c.coverImage}` }] } : {}) },
  };
}

export default async function DailyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = await getContentBySlug(slug);
  if (!c || c.status !== "published") notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: c.title,
    description: c.intro || c.subtitle,
    keywords: c.keywords.join(", "),
    datePublished: c.publishedAt ?? c.createdAt,
    ...(c.coverImage ? { image: `${SITE_URL}${c.coverImage}` } : {}),
    author: { "@type": "Organization", name: "펀제주" },
    publisher: { "@type": "Organization", name: "펀제주" },
    mainEntityOfPage: `${SITE_URL}/daily/${c.slug}`,
  };

  return (
    <article className="mx-auto max-w-3xl px-0 md:px-4 md:py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {c.coverImage && (
        <div className="relative aspect-[16/9] overflow-hidden bg-bg-secondary md:rounded-2xl">
          <Image src={c.coverImage} alt={c.title} fill sizes="(max-width:768px) 100vw, 800px" className="object-cover" priority />
        </div>
      )}

      <PageHeader title={c.title} subtitle={c.subtitle} emoji="🌅" />

      <div className="px-4 md:px-0">
        <p className="mt-1 text-sm leading-7 text-text-primary">{c.intro}</p>

        <div className="mt-6 space-y-6">
          {c.sections.map((s, i) => (
            <section key={i} className="rounded-2xl border border-border-soft bg-bg-card p-4 shadow-card">
              <div className="flex gap-3">
                {s.image && (
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-bg-secondary">
                    <Image src={s.image} alt={s.heading} fill sizes="80px" className="object-cover" loading="lazy" />
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="text-sm font-black text-text-primary">{s.heading}</h2>
                  <p className="mt-1 text-[13px] leading-6 text-text-secondary">{s.body}</p>
                  {s.restaurantId && (
                    <Link href={`/food/${s.restaurantId}`} className="mt-1.5 inline-block text-[12px] font-bold text-brand-orange">
                      맛집 상세 보기 →
                    </Link>
                  )}
                </div>
              </div>
            </section>
          ))}
        </div>

        <nav className="mt-8 grid grid-cols-3 gap-2 pb-8">
          <Link href="/daily" className="rounded-2xl border border-border-soft bg-bg-card py-3 text-center text-[12px] font-semibold text-text-primary hover:bg-bg-secondary transition-colors">🌅 데일리 더보기</Link>
          <Link href="/webzine" className="rounded-2xl border border-border-soft bg-bg-card py-3 text-center text-[12px] font-semibold text-text-primary hover:bg-bg-secondary transition-colors">📖 제주 웹진</Link>
          <Link href="/food" className="rounded-2xl border border-border-soft bg-bg-card py-3 text-center text-[12px] font-semibold text-text-primary hover:bg-bg-secondary transition-colors">🍽️ 도민맛집</Link>
        </nav>
      </div>
    </article>
  );
}
