import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/common/PageHeader";
import { CctvList } from "@/components/cctv/CctvList";
import { mockCctvs } from "@/constants/mock-cctvs";

type Props = { params: Promise<{ region: string }> };

const SITE_URL = "https://funjeju.com";

// 전체 지역 정적 생성
export async function generateStaticParams() {
  const regions = [...new Set(mockCctvs.map((c) => c.region))];
  return regions.map((region) => ({ region: encodeURIComponent(region) }));
}

export const revalidate = 86400;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { region: encoded } = await params;
  const region = decodeURIComponent(encoded);
  const cctvs = mockCctvs.filter((c) => c.region === region);
  if (cctvs.length === 0) return { title: "지역 정보 없음 | FunJeju" };

  const title = `${region} 실시간 CCTV ${cctvs.length}곳 - 제주 라이브캠 | FunJeju`;
  const description = `${region}의 실시간 CCTV ${cctvs.length}개 한눈에 보기. ${cctvs.slice(0, 5).map((c) => c.name).join(", ")} 등 ${region} 라이브캠으로 지금 제주 날씨와 현장을 확인하세요.`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/cctv/region/${encoded}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/cctv/region/${encoded}`,
      type: "website",
      locale: "ko_KR",
    },
    keywords: [
      `${region} 실시간`,
      `${region} CCTV`,
      `${region} 라이브캠`,
      `${region} 날씨`,
      `${region} 여행`,
      `제주 ${region}`,
      `제주도 ${region}`,
      ...cctvs.map((c) => `${c.name} 실시간`),
      ...cctvs.map((c) => `${c.name} CCTV`),
    ],
  };
}

export default async function RegionPage({ params }: Props) {
  const { region: encoded } = await params;
  const region = decodeURIComponent(encoded);
  const cctvs = mockCctvs.filter((c) => c.region === region);
  if (cctvs.length === 0) notFound();

  const categories = [...new Set(cctvs.map((c) => c.category))];

  // JSON-LD: ItemList
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${region} 실시간 CCTV`,
    description: `${region}의 모든 실시간 CCTV 목록`,
    numberOfItems: cctvs.length,
    itemListElement: cctvs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      url: `${SITE_URL}/cctv/${c.id}`,
    })),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "홈", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "실시간 CCTV", item: `${SITE_URL}/cctv` },
      { "@type": "ListItem", position: 3, name: region, item: `${SITE_URL}/cctv/region/${encoded}` },
    ],
  };

  return (
    <div className="mx-auto max-w-screen-xl px-0 md:px-4 md:py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <nav aria-label="breadcrumb" className="px-4 pb-3 md:px-0">
        <ol className="flex items-center gap-1 text-xs text-text-secondary">
          <li><Link href="/" className="hover:text-text-primary">홈</Link></li>
          <li>›</li>
          <li><Link href="/cctv" className="hover:text-text-primary">실시간 CCTV</Link></li>
          <li>›</li>
          <li className="font-bold text-text-primary">{region}</li>
        </ol>
      </nav>

      <PageHeader
        title={`${region} 실시간 CCTV`}
        subtitle={`${region}의 ${cctvs.length}개 CCTV를 한눈에`}
        emoji="📷"
        right={
          <Link href="/cctv" className="text-xs font-medium text-brand-orange">
            전체 지역 →
          </Link>
        }
      />

      {/* SEO 본문 */}
      <section className="mx-4 mb-5 rounded-2xl border border-brand-navy/20 bg-brand-navy/5 p-4 md:mx-0">
        <h2 className="text-sm font-black text-text-primary">
          {region} 라이브캠 안내
        </h2>
        <p className="mt-2 text-xs leading-6 text-text-primary">
          {region}의 {cctvs.length}개 실시간 CCTV를 통해 지금 이 순간의 {region} 모습을 확인하세요.
          {" "}{categories.join(", ")} 등 다양한 카테고리의 라이브 영상을 제공합니다.
          여행 전 날씨와 물때를 미리 체크할 수 있어 효율적인 일정 계획이 가능합니다.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <span
              key={cat}
              className="rounded-full bg-brand-navy/10 px-2.5 py-0.5 text-[10px] font-semibold text-brand-navy"
            >
              {cat} {cctvs.filter((c) => c.category === cat).length}곳
            </span>
          ))}
        </div>
      </section>

      <div className="px-4 md:px-0">
        <CctvList cctvs={cctvs} />
      </div>

      {/* 인근 지역 추천 */}
      <section className="mt-8 mx-4 rounded-2xl bg-bg-secondary p-4 md:mx-0">
        <h3 className="mb-3 text-sm font-bold text-text-primary">🗺️ 다른 지역 CCTV</h3>
        <div className="flex flex-wrap gap-1.5">
          {[...new Set(mockCctvs.map((c) => c.region))]
            .filter((r) => r !== region)
            .map((r) => (
              <Link
                key={r}
                href={`/cctv/region/${encodeURIComponent(r)}`}
                className="rounded-full border border-border-soft bg-bg-card px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-bg-primary hover:text-brand-orange transition-colors"
              >
                {r}
              </Link>
            ))}
        </div>
      </section>
    </div>
  );
}
