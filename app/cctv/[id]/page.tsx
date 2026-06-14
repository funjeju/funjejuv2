import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HlsPlayer } from "@/components/cctv/HlsPlayer";
import { VurixLaunch } from "@/components/cctv/VurixLaunch";
import { isVurixId } from "@/constants/vurix";
import { YoutubePlayer } from "@/components/cctv/YoutubePlayer";
import { BetaPlanNotice } from "@/components/common/BetaPlanNotice";
import { fetchWeather } from "@/lib/weather";
import { LiveChat } from "@/components/cctv/LiveChat";
import { DolmangyiIcon } from "@/components/common/DolmangyiIcon";
import { getCctvSeo } from "@/constants/cctv-seo";
import { getCctvById, getNearbyCctvs } from "@/lib/firestore-cctv-server";
import { mockCctvs } from "@/constants/mock-cctvs";
import { CctvDetailActions } from "@/components/cctv/CctvDetailActions";

type Props = { params: Promise<{ id: string }> };

const SITE_URL    = "https://funjeju.com";
// Worker 우선, 없으면 Lightsail fallback
const PROXY_BASE  = process.env.NEXT_PUBLIC_WORKER_URL || process.env.NEXT_PUBLIC_PROXY_URL || "";

// 빌드 시 mockCctvs 기반으로 정적 생성 + 새 ID는 ISR로 동적 처리
export async function generateStaticParams() {
  return mockCctvs.map((c) => ({ id: c.id }));
}

// 새 ID 동적 생성 허용 (404 안 나게)
export const dynamicParams = true;
// 60초마다 재검증 (Firestore 변경 반영)
export const revalidate = 60;

// Firestore → fallback mock 순서로 조회
async function loadCctv(id: string) {
  const fromFirestore = await getCctvById(id);
  if (fromFirestore) return fromFirestore;
  // Firestore에 없으면 mock에서 fallback
  const mock = mockCctvs.find((c) => c.id === id);
  if (mock) {
    return {
      id: mock.id, name: mock.name, region: mock.region,
      direction: mock.direction, category: mock.category,
      originUrl: "", youtubeId: mock.youtubeId,
      active: true, description: mock.description,
      lat: mock.latitude, lng: mock.longitude,
    };
  }
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const cctv = await loadCctv(id);
  if (!cctv) return { title: "CCTV 정보 없음 | FunJeju" };

  const seo = getCctvSeo(id, cctv.name, cctv.region, cctv.category, cctv.description);
  const cleanName = cctv.name.replace(/\s+/g, "");
  const title = `${cctv.name} 실시간 CCTV - ${cctv.region} ${cctv.category} 라이브캠`;
  const description = `${cleanName} 실시간 라이브 영상! ${cctv.description} 지금 ${cctv.name}의 날씨, 파도, 물때를 라이브로 확인하세요.`;
  const url = `${SITE_URL}/cctv/${id}`;

  return {
    title, description,
    alternates: { canonical: url },
    openGraph: {
      title, description, url, siteName: "FunJeju", locale: "ko_KR", type: "website",
      images: [{ url: `${SITE_URL}/og-cctv.png`, width: 1200, height: 630, alt: `${cctv.name} 실시간 CCTV` }],
    },
    twitter: { card: "summary_large_image", title, description },
    keywords: [...seo.keywords, ...seo.longTailKeywords],
  };
}

export default async function CctvDetailPage({ params }: Props) {
  const { id } = await params;
  const cctv = await loadCctv(id);
  if (!cctv) notFound();

  const streamProxyUrl = cctv.youtubeId
    ? null
    : (PROXY_BASE ? `${PROXY_BASE}/cctv/${cctv.id}` : null);

  const seo = getCctvSeo(id, cctv.name, cctv.region, cctv.category, cctv.description);

  // 같은 지역 + 부족하면 mock에서 보충
  const nearbyFromDb = await getNearbyCctvs(cctv.region, cctv.id, 3);
  let finalNearby: typeof nearbyFromDb = nearbyFromDb;
  if (nearbyFromDb.length < 3) {
    const extra = mockCctvs
      .filter((c) => c.id !== id && c.region === cctv.region && !nearbyFromDb.some((n) => n.id === c.id))
      .slice(0, 3 - nearbyFromDb.length)
      .map((m) => ({
        id: m.id, name: m.name, region: m.region,
        direction: m.direction, category: m.category,
        originUrl: "", youtubeId: m.youtubeId,
        active: true, description: m.description,
        lat: m.latitude, lng: m.longitude,
      }));
    finalNearby = [...nearbyFromDb, ...extra];
  }

  const weather = cctv.lat && cctv.lng ? await fetchWeather(cctv.lat, cctv.lng) : null;

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
    geo: cctv.lat && cctv.lng ? {
      "@type": "GeoCoordinates",
      latitude: cctv.lat,
      longitude: cctv.lng,
    } : undefined,
    url: `${SITE_URL}/cctv/${id}`,
    isAccessibleForFree: true,
  };

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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

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
        <div className="min-w-0 flex-1 space-y-4">

          {/* 플레이어 — YouTube / vurix(원본 새창) / HLS */}
          {cctv.youtubeId ? (
            <YoutubePlayer youtubeId={cctv.youtubeId} title={cctv.name} />
          ) : isVurixId(cctv.id) ? (
            <VurixLaunch id={cctv.id} name={cctv.name} />
          ) : (
            <HlsPlayer
              proxyUrl={streamProxyUrl}
              label={cctv.name}
              cctvId={cctv.id}
              cctvName={cctv.name}
            />
          )}

          {/* 베타 안내 — 정식 오픈 시 요금제 적용 */}
          {!cctv.youtubeId && (
            <div className="px-4 md:px-0">
              <BetaPlanNotice />
            </div>
          )}

          <div className="px-4 md:px-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-ocean-blue">{cctv.region} · {cctv.category}</p>
                <h1 className="mt-0.5 text-xl font-black text-text-primary">{cctv.name}</h1>
                <p className="mt-1 text-sm leading-6 text-text-secondary">{cctv.description}</p>
              </div>
              <CctvDetailActions
                cctvId={cctv.id}
                cctvName={cctv.name}
                description={cctv.description}
              />
            </div>

            <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1">
              {cctv.youtubeId ? (
                <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-red-100 border border-red-200 px-2.5 py-1 text-[11px] font-semibold text-red-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
                  YouTube 라이브
                </span>
              ) : streamProxyUrl ? (
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
              <p className="text-[10px] text-text-secondary">Open-Meteo · 10분마다 갱신</p>
            </div>
            {weather ? (
              <>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-white px-2 py-2 shadow-card">
                    <p className="text-[9px] text-text-secondary">날씨</p>
                    <p className="mt-0.5 text-xs font-bold text-text-primary leading-tight">
                      {weather.emoji} {weather.description}
                    </p>
                    <p className="text-[9px] text-text-secondary">{weather.temperature}°C</p>
                  </div>
                  <div className="rounded-xl bg-white px-2 py-2 shadow-card">
                    <p className="text-[9px] text-text-secondary">물때</p>
                    <p className="mt-0.5 text-xs font-bold text-text-primary leading-tight">
                      {weather.tideEmoji} {weather.tide}
                    </p>
                    <p className="text-[9px] text-text-secondary">{weather.tideDetail}</p>
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

          {/* SEO 콘텐츠 */}
          <article className="mx-4 space-y-4 rounded-2xl border border-border-soft bg-bg-card p-5 shadow-card md:mx-0">
            <h2 className="text-base font-black text-text-primary">{cctv.name} 실시간 라이브캠 안내</h2>
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
                    <li key={i} className="text-xs leading-6 text-text-primary">• {tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {seo.nearby.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold text-text-secondary">📍 주변 명소</p>
                <div className="flex flex-wrap gap-1.5">
                  {seo.nearby.map((place) => (
                    <span key={place} className="rounded-full bg-brand-orange/10 px-2.5 py-1 text-[11px] font-medium text-brand-orange">
                      {place}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-border-soft pt-3">
              <p className="text-[10px] text-text-secondary leading-5">
                <strong>이 페이지에서 확인 가능한 정보:</strong>{" "}
                {cctv.name} 실시간 영상, {cctv.region} 날씨, {cctv.category} 물때,
                파도·바람 상태, 일출·일몰 시간대 풍경.{" "}
                <Link href={`/cctv/region/${encodeURIComponent(cctv.region)}`} className="text-brand-orange hover:underline">
                  {cctv.region} 다른 CCTV 보기 →
                </Link>
              </p>
            </div>
          </article>

          <div className="mx-4 md:mx-0">
            <LiveChat cctvId={cctv.id} cctvName={cctv.name} />
          </div>
        </div>

        <aside className="w-full space-y-3 lg:w-72 lg:shrink-0">
          <p className="px-4 text-sm font-bold text-text-primary md:px-0">📷 {cctv.region} CCTV</p>
          {finalNearby.map((c) => (
            <Link
              key={c.id}
              href={`/cctv/${c.id}`}
              className="flex gap-3 overflow-hidden rounded-2xl border border-border-soft bg-bg-card p-3 shadow-card hover:border-brand-orange/30 transition-colors mx-4 md:mx-0"
            >
              <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-2xl">
                {c.youtubeId ? "▶" : "🏝️"}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-ocean-blue">{c.region}</p>
                <p className="text-xs font-bold text-text-primary">{c.name}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  {c.youtubeId ? (
                    <span className="flex items-center gap-1 text-[10px] text-red-600 font-semibold">
                      ▶ YouTube
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] text-live-red font-semibold">
                      <span className="h-1.5 w-1.5 rounded-full bg-live-red animate-pulse" />
                      LIVE
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}

          <div className="mx-4 rounded-2xl bg-gradient-to-br from-brand-navy to-blue-600 p-4 text-white md:mx-0">
            <p className="flex items-center gap-1.5 text-xs font-bold"><DolmangyiIcon size={20} /> 돌맹이에게 물어보기</p>
            <p className="mt-1 text-[11px] text-white/80">이 장소 주변 맛집·카페·코스를 AI가 추천해드려요</p>
            <Link href="/chat" className="mt-3 block rounded-xl bg-white/20 py-2 text-center text-xs font-bold hover:bg-white/30 transition-colors">
              채팅 시작하기 →
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
