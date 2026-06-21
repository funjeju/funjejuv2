import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getContentBySlug } from "@/lib/contents";
import { BriefingArticle } from "@/components/daily/BriefingArticle";

const SITE_URL = "https://funjeju.com";
export const revalidate = 3600;
export const dynamicParams = true;

/** 절대 URL(Storage)이면 그대로, 상대경로면 SITE_URL 접두 */
function absUrl(src: string): string {
  return /^https?:\/\//.test(src) ? src : `${SITE_URL}${src}`;
}

// 빌드 때 prerender 안 함 → 첫 요청 시 생성·캐시 (빌드 CPU 절감, 색인 동일)
export async function generateStaticParams() {
  return [];
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
    openGraph: { title: c.title, description: desc, url, type: "article", ...(c.coverImage ? { images: [{ url: absUrl(c.coverImage) }] } : {}) },
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
    dateModified: c.publishedAt ?? c.createdAt, // 신선도 신호 (GEO)
    inLanguage: "ko",
    ...(c.coverImage ? { image: absUrl(c.coverImage) } : {}),
    author: { "@type": "Organization", name: "펀제주" },
    publisher: { "@type": "Organization", name: "펀제주" },
    mainEntityOfPage: `${SITE_URL}/daily/${c.slug}`,
  };

  return (
    <article className="mx-auto max-w-3xl px-0 md:px-4 md:py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <BriefingArticle content={c} />
    </article>
  );
}
