import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getContentBySlug } from "@/lib/contents";
import { CardNewsViewer } from "@/components/card/CardNewsViewer";

export const revalidate = 60;
export const dynamicParams = true;

const SITE = "https://funjeju.com";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = await getContentBySlug(slug);
  if (!c) return { title: "카드뉴스를 찾을 수 없습니다 | 펀제주" };
  const url = `${SITE}/card/${slug}`;
  const title = `${c.title.replace(/\n/g, " ")} | 펀제주 카드뉴스`;
  const description = c.subtitle || "제주 카드뉴스 — 펀제주";
  const ogImage = c.cardImages?.[0] ?? `${SITE}/api/og/cardnews?slug=${slug}&i=0`; // 표지 카드(사전렌더 우선)
  return {
    title,
    description,
    keywords: c.keywords,
    alternates: { canonical: url },
    openGraph: { type: "article", url, title, description, siteName: "펀제주", images: [{ url: ogImage, width: 1080, height: 1350, alt: title }] },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
  };
}

export default async function CardNewsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await getContentBySlug(slug);
  if (!c || c.type !== "card_news") notFound();
  // 카드 수: 표지(1) + 본문(sections) + CTA(1)
  const total = 1 + c.sections.length + 1;
  return <CardNewsViewer slug={slug} total={total} title={c.title.replace(/\n/g, " ")} subtitle={c.subtitle} images={c.cardImages} />;
}
