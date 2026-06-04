import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  getRestaurant,
  loadRestaurantSummaries,
  stripHtml,
  parseOptions,
  formatHours,
  getAllIds,
} from "@/lib/restaurants";

type Props = { params: Promise<{ id: string }> };

const SITE_URL = "https://funjeju.com";

// SSG — 빌드 시 모든 상세 페이지 정적 생성
export async function generateStaticParams() {
  const ids = await getAllIds();
  return ids.map((id) => ({ id }));
}

// 24시간마다 재생성 (ISR)
export const revalidate = 86400;

// 동적 SEO 메타데이터
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const r = await getRestaurant(id);
  if (!r) return { title: "맛집 정보 없음 | FunJeju" };

  const desc = stripHtml(r.content, 155);
  const title = `${r.title} - ${r.region} ${r.menu} | FunJeju 도민맛집`;
  const ogImage = r.images?.[0]
    ? `${SITE_URL}/restaurant-images/${r.images[0]}`
    : `${SITE_URL}/og-default.png`;
  const url = `${SITE_URL}/food/${id}`;

  return {
    title,
    description: desc,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: desc,
      url,
      siteName: "FunJeju",
      images: [{ url: ogImage, width: 1200, height: 630, alt: r.title }],
      locale: "ko_KR",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: [ogImage],
    },
    keywords: [r.region, r.menu, r.title, "제주 맛집", "도민맛집", "펀제주"],
  };
}

export default async function FoodDetailPage({ params }: Props) {
  const { id } = await params;
  const r = await getRestaurant(id);
  if (!r) notFound();

  // 같은 지역 다른 맛집 (관련 추천)
  const all = await loadRestaurantSummaries();
  const related = all
    .filter((x) => x.region === r.region && x.id !== r.id)
    .slice(0, 6);

  const options = parseOptions(r.options);
  const hours = formatHours(r.hours);
  const isFunjejuCertified = options.includes("펀제주인증");

  // JSON-LD 구조화 데이터 (Restaurant schema)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: r.title,
    description: stripHtml(r.content, 200),
    image: r.images.map((img) => `${SITE_URL}/restaurant-images/${img}`),
    address: {
      "@type": "PostalAddress",
      addressLocality: r.region,
      addressRegion: "제주특별자치도",
      addressCountry: "KR",
    },
    servesCuisine: r.menu,
    url: `${SITE_URL}/food/${id}`,
    ...(hours && { openingHours: hours }),
  };

  return (
    <article className="mx-auto max-w-3xl px-0 md:px-4 md:py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Back */}
      <div className="px-4 pb-3 md:px-0">
        <Link href="/food" className="inline-flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
          ← 도민맛집 목록
        </Link>
      </div>

      {/* 메인 이미지 */}
      {r.images?.[0] && (
        <div className="relative aspect-[16/10] overflow-hidden bg-bg-secondary md:rounded-2xl">
          <Image
            src={`/restaurant-images/${r.images[0]}`}
            alt={r.title}
            fill
            sizes="(max-width: 768px) 100vw, 800px"
            className="object-cover"
            priority
          />
          {isFunjejuCertified && (
            <span className="absolute left-4 top-4 rounded-full bg-brand-orange px-3 py-1.5 text-xs font-bold text-white shadow-soft">
              ✓ 펀제주 인증 맛집
            </span>
          )}
        </div>
      )}

      {/* 헤더 */}
      <header className="px-4 pt-4 md:px-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-brand-orange/10 px-2.5 py-0.5 text-[10px] font-bold text-brand-orange">
            {r.menu}
          </span>
          <span className="rounded-full bg-brand-navy/10 px-2.5 py-0.5 text-[10px] font-bold text-brand-navy">
            📍 {r.region}
          </span>
        </div>
        <h1 className="mt-2 text-2xl font-black text-text-primary md:text-3xl">
          {r.title}
        </h1>
        {hours && (
          <p className="mt-2 text-sm text-text-secondary">⏰ {hours}</p>
        )}
        {r.prices && (
          <p className="mt-1 text-sm text-text-secondary">💰 {r.prices}</p>
        )}
      </header>

      {/* 옵션 */}
      {options.length > 0 && (
        <section className="mx-4 mt-4 rounded-2xl border border-border-soft bg-bg-card p-4 shadow-card md:mx-0">
          <p className="mb-2 text-xs font-bold text-text-secondary">편의시설 · 옵션</p>
          <div className="flex flex-wrap gap-1.5">
            {options.map((opt) => (
              <span
                key={opt}
                className={[
                  "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                  opt === "펀제주인증"
                    ? "bg-brand-orange/10 text-brand-orange"
                    : "bg-bg-secondary text-text-secondary",
                ].join(" ")}
              >
                {opt}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* 본문 */}
      <section className="prose prose-sm mx-4 mt-5 max-w-none rounded-2xl border border-border-soft bg-bg-card p-5 shadow-card md:mx-0">
        <div
          className="text-sm leading-7 text-text-primary [&_p]:mb-3 [&_img]:my-3 [&_img]:rounded-xl"
          dangerouslySetInnerHTML={{
            __html: r.content
              .replace(/rnrn/g, "<br/><br/>")
              .replace(/style="[^"]*"/g, ""),
          }}
        />
      </section>

      {/* 이미지 갤러리 */}
      {r.images.length > 1 && (
        <section className="mt-5 px-4 md:px-0">
          <p className="mb-3 text-sm font-bold text-text-primary">📷 사진</p>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {r.images.slice(1).map((img, i) => (
              <div key={img} className="relative aspect-square overflow-hidden rounded-xl bg-bg-secondary">
                <Image
                  src={`/restaurant-images/${img}`}
                  alt={`${r.title} 사진 ${i + 2}`}
                  fill
                  sizes="(max-width: 768px) 50vw, 33vw"
                  className="object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 관련 맛집 */}
      {related.length > 0 && (
        <section className="mt-8 px-4 md:px-0">
          <p className="mb-3 text-sm font-bold text-text-primary">
            📍 {r.region} 다른 맛집
          </p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {related.map((x) => (
              <Link
                key={x.id}
                href={`/food/${x.id}`}
                className="group overflow-hidden rounded-xl border border-border-soft bg-bg-card shadow-card transition-transform hover:scale-[1.02]"
              >
                <div className="relative aspect-square bg-bg-secondary">
                  {x.thumbnail && (
                    <Image
                      src={x.thumbnail}
                      alt={x.title}
                      fill
                      sizes="(max-width: 768px) 50vw, 33vw"
                      className="object-cover"
                      loading="lazy"
                    />
                  )}
                </div>
                <div className="p-2">
                  <span className="text-[9px] font-bold text-brand-orange">{x.menu}</span>
                  <p className="line-clamp-1 text-xs font-bold text-text-primary">{x.title}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 하단 CTA */}
      <div className="mt-8 px-4 pb-8 md:px-0">
        <Link
          href="/food"
          className="block w-full rounded-2xl border border-border-soft bg-bg-card py-3 text-center text-sm font-semibold text-text-primary hover:bg-bg-secondary transition-colors"
        >
          ← 도민맛집 목록으로 돌아가기
        </Link>
      </div>
    </article>
  );
}
