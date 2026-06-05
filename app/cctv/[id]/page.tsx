import type { Metadata } from "next";
import Link from "next/link";
import { mockCctvs } from "@/constants/mock-cctvs";
import { notFound } from "next/navigation";
import { HlsPlayer } from "@/components/cctv/HlsPlayer";
import { fetchWeather } from "@/lib/weather";
import { LiveChat } from "@/components/cctv/LiveChat";
import { getCctvSeo } from "@/constants/cctv-seo";

type Props = { params: Promise<{ id: string }> };

const SITE_URL = "https://funjeju.com";

// SSG — 빌드 시 모든 CCTV 정적 생성 (SEO 최적화)
export async function generateStaticParams() {
  return mockCctvs.map((c) => ({ id: c.id }));
}

// 10분마다 재생성 (날씨 갱신)
export const revalidate = 600;

// 동적 SEO 메타데이터
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const cctv = mockCctvs.find((c) => c.id === id);
  if (!cctv) return { title: "CCTV 정보 없음 | FunJeju" };

  const seo = getCctvSeo(id, cctv.name, cctv.region, cctv.category, cctv.description);
  const cleanName = cctv.name.replace(/\s+/g, "");

  // 핵심 SEO 타이틀 (60자 이내 권장)
  const title = `${cctv.name} 실시간 CCTV - ${cctv.region} ${cctv.category} 라이브캠`;

  // 메타 디스크립션 (155자 이내)
  const description = `${cleanName} 실시간 라이브 영상! ${cctv.description} 지금 ${cctv.name}의 날씨, 파도, 혼잡도를 라이브로 확인하세요. 제주 ${cctv.region} ${cctv.category} 실시간 CCTV.`;

  const url = `${SITE_URL}/cctv/${id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "FunJeju",
      locale: "ko_KR",
      type: "website",
      images: [{
        url: `${SITE_URL}/og-cctv.png`,
        width: 1200,
        height: 630,
        alt: `${cctv.name} 실시간 CCTV`,
      }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    keywords: [...seo.keywords, ...seo.longTailKeywords],
  };
}

export default async function CctvDetailPage({ params }: Props) {
  const { id } = await params;
  const cctv = mockCctvs.find((c) => c.id === id);
  if (!cctv) notFound();

  const seo = getCctvSeo(id, cctv.name, cctv.region, cctv.category, cctv.description);
  const nearby = mockCctvs.filter((c) => c.id !== id && c.region === cctv.region).slice(0, 3);
  // 같은 지역에 다른 CCTV가 없으면 전체에서 가져옴
  const finalNearby = nearby.length >= 3
    ? nearby
    : [...nearby, ...mockCctvs.filter((c) => c.id !== id && !nearby.includes(c)).slice(0, 3 - nearby.length)];

  const weather = await fetchWeather(cctv.latitude, cctv.longitude);

  // JSON-LD: TouristAttraction (관광지 구조화 데이터)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: cctv.name,
    description: seo.intro,
    image: `${SITE_URL}/og-cctv.png`,
    address: {
      "@type": "PostalAddress",
      addressLocality: cctv.region,
      addressRegion: "제주특별자치도",
      addressCountry: "KR",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: cctv.latitude,
      longitude: cctv.longitude,
    },
    url: `${SITE_URL}/cctv/${id}`,
    isAccessibleForFree: true,
  };

  // 브레드크럼 (검색 결과에 경로 표시)
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "홈", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "실시간 CCTV", item: `${SITE_URL}/cctv` },
      { "@type": "ListItem", position: 3, name: cctv.region, item: `${SITE_URL}/cctv/region/${encodeURIComponent(cctv.region)}` },
      { "@type": "ListItem", position: 4, name: cctv.name, item: `${SITE_URL}/cctv/${id}` },
    ],
  };

  return (
    <div className="mx-auto max-w-screen-xl px-0 md:px-4 md:py-6">
      {/* JSON-LD 구조화 데이터 (SEO) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      {/* Breadcrumb 시각적 표시 */}
      <nav aria-label="breadcrumb" className="px-4 pb-3 md:px-0">
        <ol className="flex flex-wrap items-center gap-1 text-xs text-text-secondary">
          <li><Link href="/" className="hover:text-text-primary">홈</Link></li>
          <li>›</li>
          <li><Link href="/cctv" className="hover:text-text-primary">실시간 CCTV</Link></li>
          <li>›</li>
          <li>
            <Link href={`/cctv/region/${encodeURIComponent(cctv.region)}`} className="hover:text-text-primary">
              {cctv.region}
            </Link>
          </li>
          <li>›</li>
          <li className="font-bold text-text-primary">{cctv.name}</li>
        </ol>
      </nav>

      <div className="flex flex-col gap-5 lg:flex-row">
        {/* ── 왼쪽: 플레이어 + 정보 ── */}
        <div className="min-w-0 flex-1 space-y-4">

          {/* HLS 플레이어 */}
          <HlsPlayer proxyUrl={cctv.streamProxyUrl} label={cctv.name} />

          {/* Info */}
          <div className="px-4 md:px-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-ocean-blue">{cctv.region} · {cctv.category}</p>
                <h1 className="mt-0.5 text-xl font-black text-text-primary">{cctv.name}</h1>
                <p className="mt-1 text-sm leading-6 text-text-secondary">{cctv.description}</p>
              </div>
              <div className="flex shrink-0 flex-col items-center gap-1 rounded-2xl border border-border-soft bg-bg-card px-4 py-3 shadow-card">
                <span className="text-xl">⭐</span>
                <span className="text-[10px] font-semibold text-text-secondary">저장</span>
              </div>
            </div>

            {/* 스트림 상태 + 태그 — 모바일 overflow-x-auto */}
            <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1">
              {cctv.streamProxyUrl ? (
                <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-jeju-green/10 border border-jeju-green/20 px-2.5 py-1 text-[11px] font-semibold text-jeju-green">
                  <span className="h-1.5 w-1.5 rounded-full bg-jeju-green animate-pulse" />
                  연결됨
                </span>
              ) : (
                <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-gray-100 border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                  미설정
                </span>
              )}
              {["실시간", cctv.category, cctv.region].map((tag) => (
                <span key={tag} className="shrink-0 rounded-full bg-bg-secondary px-2.5 py-1 text-[11px] font-medium text-text-secondary">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* 실시간 날씨 */}
          <div className="mx-4 rounded-2xl border border-brand-navy/20 bg-brand-navy/5 p-4 md:mx-0">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold text-brand-navy">🌡️ 현장 실시간 정보</p>
              <p className="text-[10px] text-text-secondary">
                Open-Meteo · 10분마다 갱신
              </p>
            </div>
            {weather ? (
              <>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-white px-2 py-2 shadow-card">
                    <p className="text-[9px] text-text-secondary">날씨</p>
                    <p className="mt-0.5 text-xs font-bold text-text-primary leading-tight">
                      {weather.emoji} {weather.description}
                    </p>
                    <p className="text-[9px] text-text-secondary">
                      {weather.temperature}°C
                    </p>
                  </div>
                  <div className="rounded-xl bg-white px-2 py-2 shadow-card">
                    <p className="text-[9px] text-text-secondary">혼잡도</p>
                    <p className="mt-0.5 text-xs font-bold text-text-primary leading-tight">
                      {weather.congestionEmoji} {weather.congestion}
                    </p>
                    <p className="text-[9px] text-text-secondary">시간·날씨</p>
                  </div>
                  <div className="rounded-xl bg-white px-2 py-2 shadow-card">
                    <p className="text-[9px] text-text-secondary">바람</p>
                    <p className="mt-0.5 text-xs font-bold text-text-primary leading-tight">
                      💨 {weather.windLabel}
                    </p>
                    <p className="text-[9px] text-text-secondary">{weather.windSpeed}m/s</p>
                  </div>
                </div>
                {weather.precipitation > 0 && (
                  <p className="mt-2 rounded-lg bg-blue-100 px-3 py-1.5 text-center text-[11px] font-semibold text-blue-700">
                    ☔ 강수량 {weather.precipitation}mm — 우산 챙기세요!
                  </p>
                )}
              </>
            ) : (
              <p className="text-center text-xs text-text-secondary py-3">
                날씨 정보를 가져올 수 없어요
              </p>
            )}
          </div>

          {/* ─── SEO 본문 콘텐츠 (검색 엔진 최적화) ─── */}
          <article className="mx-4 space-y-4 rounded-2xl border border-border-soft bg-bg-card p-5 shadow-card md:mx-0">
            <h2 className="text-base font-black text-text-primary">
              {cctv.name} 실시간 라이브캠 안내
            </h2>
            <p className="text-sm leading-7 text-text-primary">{seo.intro}</p>

            {seo.bestTime && (
              <div className="rounded-xl bg-bg-secondary p-3">
                <p className="text-[11px] font-bold text-text-secondary">⏰ 추천 시간대</p>
                <p className="mt-1 text-sm text-text-primary">{seo.bestTime}</p>
              </div>
            )}

            {seo.tips.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold text-text-secondary">💡 방문 팁</p>
                <ul className="space-y-1">
                  {seo.tips.map((tip, i) => (
                    <li key={i} className="text-xs leading-6 text-text-primary">
                      • {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {seo.nearby.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold text-text-secondary">📍 주변 명소</p>
                <div className="flex flex-wrap gap-1.5">
                  {seo.nearby.map((place) => (
                    <span
                      key={place}
                      className="rounded-full bg-brand-orange/10 px-2.5 py-1 text-[11px] font-medium text-brand-orange"
                    >
                      {place}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 키워드 푸터 (SEO 보강용, 자연스럽게 배치) */}
            <div className="border-t border-border-soft pt-3">
              <p className="text-[10px] text-text-secondary leading-5">
                <strong>이 페이지에서 확인 가능한 정보:</strong>{" "}
                {cctv.name} 실시간 영상, {cctv.region} 날씨, {cctv.category} 혼잡도,
                파도·바람 상태, 일출·일몰 시간대 풍경.{" "}
                <Link
                  href={`/cctv/region/${encodeURIComponent(cctv.region)}`}
                  className="text-brand-orange hover:underline"
                >
                  {cctv.region} 다른 CCTV 보기 →
                </Link>
              </p>
            </div>
          </article>

          {/* Live Chat (Firestore 실시간) */}
          <div className="mx-4 md:mx-0">
            <LiveChat cctvId={cctv.id} cctvName={cctv.name} />
          </div>
        </div>

        {/* ── 오른쪽: 근처 CCTV ── */}
        <aside className="w-full space-y-3 lg:w-72 lg:shrink-0">
          <p className="px-4 text-sm font-bold text-text-primary md:px-0">📷 {cctv.region} CCTV</p>
          {finalNearby.map((c) => (
            <Link
              key={c.id}
              href={`/cctv/${c.id}`}
              className="flex gap-3 overflow-hidden rounded-2xl border border-border-soft bg-bg-card p-3 shadow-card hover:border-brand-orange/30 transition-colors mx-4 md:mx-0"
            >
              <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-2xl">
                🏝️
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-ocean-blue">{c.region}</p>
                <p className="text-xs font-bold text-text-primary">{c.name}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  {c.streamProxyUrl ? (
                    <span className="flex items-center gap-1 text-[10px] text-live-red font-semibold">
                      <span className="h-1.5 w-1.5 rounded-full bg-live-red animate-pulse" />
                      LIVE
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-400">준비 중</span>
                  )}
                </div>
              </div>
            </Link>
          ))}

          {/* AI 챗봇 CTA */}
          <div className="mx-4 rounded-2xl bg-gradient-to-br from-brand-navy to-blue-600 p-4 text-white md:mx-0">
            <p className="text-xs font-bold">🗿 돌맹이에게 물어보기</p>
            <p className="mt-1 text-[11px] text-white/80">이 장소 주변 맛집·카페·코스를 AI가 추천해드려요</p>
            <Link
              href="/chat"
              className="mt-3 block rounded-xl bg-white/20 py-2 text-center text-xs font-bold hover:bg-white/30 transition-colors"
            >
              채팅 시작하기 →
            </Link>
          </div>

          {/* Worker 설정 안내 (스트림 미설정 시) */}
          {!cctv.streamProxyUrl && (
            <div className="mx-4 rounded-2xl border border-dashed border-border-soft bg-bg-secondary p-4 md:mx-0">
              <p className="text-xs font-bold text-text-primary">📡 스트림 연결 방법</p>
              <ol className="mt-2 space-y-1 text-[11px] text-text-secondary list-decimal list-inside">
                <li>Cloudflare Worker 배포</li>
                <li>KV에 CCTV 원본 URL 등록</li>
                <li>.env에 WORKER_URL 설정</li>
              </ol>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
