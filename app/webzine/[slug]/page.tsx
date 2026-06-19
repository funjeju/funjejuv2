import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/common/PageHeader";
import { getContentBySlug } from "@/lib/contents";
import { loadAllRestaurants } from "@/lib/restaurants";
import { ShareButton } from "@/components/common/ShareButton";
import { KakaoMap } from "@/components/biz/KakaoMap";

const SITE_URL = "https://funjeju.com";
export const revalidate = 3600; // 콘텐츠는 자주 안 바뀜 → ISR Write 절감 (발행 시 revalidatePath로 즉시 갱신)

/** 절대 URL(피드 Storage)이면 그대로, 상대경로면 SITE_URL 접두 */
const absUrl = (src: string) => (/^https?:\/\//.test(src) ? src : `${SITE_URL}${src}`);
export const dynamicParams = true; // 새 발행분도 온디맨드 ISR

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
  if (!c || c.status !== "published") return { title: "웹진을 찾을 수 없습니다 | 펀제주" };
  const url = `${SITE_URL}/webzine/${c.slug}`;
  const desc = (c.intro || c.subtitle).slice(0, 160);
  return {
    title: `${c.title} | 펀제주 여행 웹진`,
    description: desc,
    keywords: c.keywords,
    alternates: { canonical: url },
    openGraph: {
      title: c.title,
      description: desc,
      url,
      type: "article",
      ...(c.coverImage ? { images: [{ url: absUrl(c.coverImage) }] } : {}),
    },
  };
}

export default async function WebzineDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = await getContentBySlug(slug);
  if (!c || c.status !== "published") notFound();

  // 섹션의 restaurantId → 맛집 좌표/주소 매칭 (지도 썸네일·길찾기용). 모듈 캐시라 비용 0.
  const restList = await loadAllRestaurants();
  const restById = new Map(restList.map((r) => [r.id, r]));

  // Article JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: c.title,
    description: c.intro || c.subtitle,
    keywords: c.keywords.join(", "),
    datePublished: c.publishedAt ?? c.createdAt,
    ...(c.coverImage ? { image: absUrl(c.coverImage) } : {}),
    author: { "@type": "Organization", name: "펀제주" },
    publisher: { "@type": "Organization", name: "펀제주" },
    mainEntityOfPage: `${SITE_URL}/webzine/${c.slug}`,
  };

  return (
    <article className="mx-auto max-w-3xl px-0 md:px-4 md:py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {c.coverImage && (
        <div className="relative aspect-[16/9] overflow-hidden bg-bg-secondary md:rounded-2xl">
          <Image src={c.coverImage} alt={c.title} fill sizes="(max-width: 768px) 100vw, 800px" className="object-cover" priority />
        </div>
      )}

      <PageHeader
        title={c.title}
        subtitle={c.subtitle}
        emoji="📖"
        right={<ShareButton title={`${c.title} | 펀제주 여행 웹진`} url={`${SITE_URL}/webzine/${c.slug}`} description={c.subtitle} imageUrl={c.coverImage ? (/^https?:\/\//.test(c.coverImage) ? c.coverImage : `${SITE_URL}${c.coverImage}`) : undefined} />}
      />

      <div className="px-4 md:px-0">
        {c.region && (
          <span className="rounded-full bg-brand-navy/10 px-2.5 py-0.5 text-[11px] font-bold text-brand-navy">
            📍 제주 {c.region} {c.menu}
          </span>
        )}
        {/* 글 시작 — 출처 안내 (실제 도민맛집 DB 기반 AI 작성) */}
        <div className="mt-4 flex gap-2 rounded-2xl border border-brand-navy/20 bg-brand-navy/5 px-4 py-3">
          <span className="text-base">🗿</span>
          <p className="text-[12px] leading-5 text-text-secondary">
            이 글은 <Link href="/food" className="font-bold text-brand-navy underline">펀제주닷컴에 등록된 <b>도민맛집 DB</b></Link>를 기반으로 AI가 작성했습니다.
            실제 검증된 도민 추천 맛집 정보를 바탕으로 하지만, <b className="text-text-primary">방문 전 현재 영업 중인지 꼭 확인</b>해주세요.
          </p>
        </div>

        <p className="mt-3 text-sm leading-7 text-text-primary">{c.intro}</p>

        {/* 맛집 섹션 — 내부링크(트랙 C: 웹진 → 도민맛집) */}
        <div className="mt-6 space-y-6">
          {c.sections.map((s, i) => {
            const rest = s.restaurantId ? restById.get(s.restaurantId) : undefined;
            // 좌표 또는 주소가 있어야 지도 표시 (없으면 잘못된 핀 방지)
            const hasCoord = !!(rest && (rest.lat && rest.lng));
            const hasAddr = !!(rest && rest.address);
            const showMap = hasCoord || hasAddr;
            const mapName = rest?.title || s.heading;
            const dirUrl = hasCoord
              ? `https://map.kakao.com/link/map/${encodeURIComponent(mapName)},${rest!.lat},${rest!.lng}`
              : `https://map.kakao.com/link/search/${encodeURIComponent(rest?.address || mapName)}`;
            return (
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

              {/* 지도 썸네일 + 마킹 (좌표 우선, 없으면 주소 지오코딩) */}
              {showMap && (
                <div className="mt-3 overflow-hidden rounded-xl border border-border-soft">
                  <KakaoMap
                    {...(hasCoord ? { lat: rest!.lat, lng: rest!.lng } : {})}
                    {...(hasAddr ? { address: rest!.address } : {})}
                    placeName={mapName}
                    className="h-36 w-full bg-bg-secondary"
                  />
                  <a
                    href={dirUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1 bg-bg-card py-2 text-[12px] font-bold text-brand-navy hover:bg-bg-secondary transition-colors"
                  >
                    📍 {rest?.address ? rest.address : mapName} · 카카오맵에서 보기 →
                  </a>
                </div>
              )}
            </section>
            );
          })}
        </div>

        {/* 글 끝 — 출처 재안내 */}
        <div className="mt-8 flex gap-2 rounded-2xl border border-brand-orange/30 bg-brand-orange/5 px-4 py-3">
          <span className="text-base">📌</span>
          <p className="text-[12px] leading-5 text-text-secondary">
            본 콘텐츠는 <b className="text-text-primary">펀제주닷컴 도민맛집 데이터베이스</b>를 근거로 AI가 정리한 글입니다.
            메뉴·영업시간·휴무는 변동될 수 있으니, <b className="text-text-primary">찾아가기 전 반드시 현재 영업 여부를 확인</b>하시기 바랍니다.
          </p>
        </div>

        {/* 교차 내부링크 (웹진 → 다른 SEO 자산) */}
        <nav className="mt-8 grid grid-cols-3 gap-2 pb-8">
          <Link href="/webzine" className="rounded-2xl border border-border-soft bg-bg-card py-3 text-center text-[12px] font-semibold text-text-primary hover:bg-bg-secondary transition-colors">
            📖 웹진 더보기
          </Link>
          <Link href="/food" className="rounded-2xl border border-border-soft bg-bg-card py-3 text-center text-[12px] font-semibold text-text-primary hover:bg-bg-secondary transition-colors">
            🍽️ 도민맛집
          </Link>
          <Link href="/guide" className="rounded-2xl border border-border-soft bg-bg-card py-3 text-center text-[12px] font-semibold text-text-primary hover:bg-bg-secondary transition-colors">
            📚 이용 가이드
          </Link>
        </nav>
      </div>
    </article>
  );
}
