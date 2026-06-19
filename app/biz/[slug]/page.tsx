import { notFound } from "next/navigation";
import { cache } from "react";
import type { Metadata } from "next";
import { getSite as getSiteRaw } from "@/lib/biz/store";
import { PublicSite } from "@/components/biz/PublicSite";
import { buildLocalBusinessJsonLd } from "@/lib/biz/jsonld";
import type { SiteSchema } from "@/lib/biz/types";

const SITE_URL = "https://www.funjeju.com";
export const runtime = "nodejs";
// 매 요청 신선하게 읽는다. ISR이 "생성 직후 빈 결과 404"를 캐시해버리는 문제를 원천 차단.
export const dynamic = "force-dynamic";

function toPlain<T>(data: unknown): T {
  return JSON.parse(JSON.stringify(data)) as T;
}

// 발행된 사이트만 노출. React cache로 metadata·page 중복 호출 1회화.
const getSite = cache(async (slug: string): Promise<SiteSchema | null> => {
  try {
    const s = await getSiteRaw(slug);
    return s && s.published ? toPlain<SiteSchema>(s) : null;
  } catch (e) {
    console.error("[biz site] read failed:", e);
    return null;
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const site = await getSite(slug);
  if (!site) return { title: "홈페이지를 찾을 수 없습니다 | 펀제주" };

  const m = site.merchantInfo;
  const url = `${SITE_URL}/biz/${slug}`;
  const region = m.address?.split(/\s+/)[1] || "제주";
  // 제주·지역·업종 키워드를 타이틀에 (funjeju 도메인 SEO 유기결합)
  const title = m.category ? `${m.name} - 제주 ${region} ${m.category} | 펀제주` : `${m.name} | 펀제주`;
  const description = m.description || `${m.name}${m.address ? ` · ${m.address}` : ""}`;
  const images = site.contentAssets.heroImage ? [site.contentAssets.heroImage] : [];

  return {
    title,
    description,
    keywords: [m.name, m.category, `제주 ${m.category}`, `${region} ${m.category}`, region, "제주", "펀제주"].filter(Boolean) as string[],
    alternates: { canonical: url },
    openGraph: { type: "website", locale: "ko_KR", url, title, description, siteName: m.name, images },
    twitter: { card: images.length ? "summary_large_image" : "summary", title, description, images },
  };
}

export default async function BizSitePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const site = await getSite(slug);
  if (!site) notFound();

  const url = `${SITE_URL}/biz/${slug}`;
  const jsonLd = buildLocalBusinessJsonLd(site, url);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PublicSite site={site} />
    </>
  );
}
