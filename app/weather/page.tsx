import type { Metadata } from "next";
import Link from "next/link";
import { fetchWeather } from "@/lib/weather";

export const revalidate = 600; // 10분

const SITE = "https://funjeju.com";

// 제주 주요 지역 — 대표 좌표
const REGIONS: { name: string; sub: string; lat: number; lng: number }[] = [
  { name: "제주시", sub: "시청·노형·연동", lat: 33.4996, lng: 126.5312 },
  { name: "서귀포시", sub: "서귀포 시내·중앙", lat: 33.2542, lng: 126.5600 },
  { name: "애월", sub: "애월읍·곽지·한담", lat: 33.4628, lng: 126.3097 },
  { name: "성산", sub: "성산일출봉·섭지코지", lat: 33.4587, lng: 126.9425 },
  { name: "중문", sub: "중문관광단지·색달", lat: 33.2447, lng: 126.4120 },
  { name: "한림·협재", sub: "협재해변·한림항", lat: 33.3940, lng: 126.2400 },
  { name: "우도", sub: "우도·종달", lat: 33.5040, lng: 126.9510 },
  { name: "한라산", sub: "어리목·1100고지", lat: 33.3617, lng: 126.5292 },
];

export const metadata: Metadata = {
  title: { absolute: "제주날씨 실시간 — 제주도 지역별 오늘 날씨·기온·바람·물때 | 펀제주" },
  description:
    "제주날씨 지금 바로 확인. 제주시·서귀포·애월·성산·중문·한림 등 제주도 지역별 실시간 기온·바람·강수·물때를 한눈에. 오늘 제주 날씨와 실시간 CCTV까지 펀제주에서.",
  alternates: { canonical: "/weather" },
  keywords: [
    "제주날씨", "제주 날씨", "제주도날씨", "제주도 날씨", "오늘 제주 날씨", "지금 제주 날씨",
    "제주 실시간 날씨", "제주시 날씨", "서귀포 날씨", "애월 날씨", "성산 날씨", "중문 날씨",
    "제주 기온", "제주 바람", "제주 물때", "제주 cctv", "실시간 제주",
  ],
  openGraph: {
    title: "제주날씨 실시간 — 제주도 지역별 오늘 날씨",
    description: "제주시·서귀포·애월·성산·중문 등 지역별 실시간 기온·바람·물때를 한눈에. 펀제주.",
    url: `${SITE}/weather`,
    siteName: "FunJeju",
    locale: "ko_KR",
    type: "website",
  },
};

export default async function WeatherPage() {
  const data = await Promise.all(
    REGIONS.map(async (r) => ({ ...r, w: await fetchWeather(r.lat, r.lng).catch(() => null) })),
  );

  const kst = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", month: "long", day: "numeric" });

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: "지금 제주 날씨는 어떤가요?", acceptedAnswer: { "@type": "Answer", text: "이 페이지에서 제주시·서귀포·애월·성산·중문 등 제주도 지역별 실시간 기온·바람·강수·물때를 10분마다 갱신해 보여드립니다. 각 지역 카드에서 실시간 CCTV로 현재 하늘 상태도 바로 확인할 수 있어요." } },
      { "@type": "Question", name: "제주는 지역마다 날씨가 다른가요?", acceptedAnswer: { "@type": "Answer", text: "네. 한라산을 경계로 제주시(북부)와 서귀포(남부)의 날씨가 자주 다르고, 한라산 고지대는 기온이 크게 낮습니다. 여행 동선의 지역 날씨를 따로 확인하는 게 좋습니다." } },
    ],
  };

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <nav aria-label="breadcrumb" className="pb-3">
        <ol className="flex flex-wrap items-center gap-1 text-xs text-text-secondary">
          <li><Link href="/" className="hover:text-text-primary">홈</Link></li>
          <li>›</li>
          <li className="font-bold text-text-primary">제주날씨</li>
        </ol>
      </nav>

      <header className="mb-5">
        <h1 className="text-2xl font-black text-text-primary">제주날씨 실시간 — 제주도 지역별 오늘 날씨</h1>
        <p className="mt-2 text-sm leading-7 text-text-secondary">
          지금 <strong className="text-text-primary">제주 날씨</strong>를 지역별로 확인하세요. 제주시·서귀포·애월·성산·중문·한림·우도·한라산의 실시간 기온·바람·강수·물때를 10분마다 갱신합니다.
          한라산을 경계로 제주시(북부)와 서귀포(남부) 날씨가 다른 날이 많으니, 여행 동선의 지역을 따로 확인하는 게 좋아요.
        </p>
        <p className="mt-1 text-xs text-text-secondary">📍 기준: {kst} (KST) · Open-Meteo · 10분마다 갱신</p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {data.map((r) => (
          <Link
            key={r.name}
            href="/cctv"
            className="rounded-2xl border border-border-soft bg-bg-card p-4 shadow-card transition-colors hover:border-brand-orange/40"
          >
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-black text-text-primary">{r.name}</p>
              <span className="text-2xl">{r.w?.emoji ?? "🌡️"}</span>
            </div>
            <p className="text-[11px] text-text-secondary">{r.sub}</p>
            {r.w ? (
              <>
                <p className="mt-2 text-2xl font-black text-text-primary">{r.w.temperature}°C</p>
                <p className="text-xs font-semibold text-text-secondary">{r.w.description} · 체감 {r.w.apparentTemp}°</p>
                <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-text-secondary">
                  <span>💨 {r.w.windLabel} {r.w.windSpeed}m/s</span>
                  <span>{r.w.tideEmoji} {r.w.tide}</span>
                  <span>💧 습도 {r.w.humidity}%</span>
                  <span>☔ {r.w.precipitation}mm</span>
                </div>
              </>
            ) : (
              <p className="mt-3 text-xs text-text-secondary">날씨 정보를 가져오는 중…</p>
            )}
            <p className="mt-3 text-[11px] font-bold text-brand-orange">실시간 CCTV로 보기 →</p>
          </Link>
        ))}
      </div>

      <section className="mt-8 space-y-4 rounded-2xl border border-border-soft bg-bg-card p-5 shadow-card">
        <h2 className="text-lg font-black text-text-primary">제주 날씨, 이것만 알면 됩니다</h2>
        <div>
          <h3 className="text-sm font-bold text-text-primary">제주는 지역마다 날씨가 다릅니다</h3>
          <p className="mt-1 text-sm leading-7 text-text-secondary">
            한라산이 가운데를 막고 있어 북부(제주시)와 남부(서귀포)의 날씨가 자주 갈립니다. 제주시가 흐리고 비와도 서귀포·중문은 맑은 경우가 흔해요. 위 지역별 카드로 실제 가실 곳의 날씨를 확인하세요.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-bold text-text-primary">바람·물때도 함께 보세요</h3>
          <p className="mt-1 text-sm leading-7 text-text-secondary">
            제주는 바람의 섬입니다. 해안 액티비티·배편은 풍속을, 물놀이·갯바위 낚시는 물때를 확인해야 합니다. 각 지역 카드에 실시간 풍속과 제주 7물때를 함께 표시했습니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link href="/cctv" className="rounded-full bg-brand-navy px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-navy/90">📷 제주 실시간 CCTV 전체보기 →</Link>
          <Link href="/" className="rounded-full border border-border-soft px-3 py-1.5 text-xs font-bold text-text-secondary hover:bg-bg-secondary">🏝️ 오늘 제주 한눈에 →</Link>
        </div>
      </section>
    </div>
  );
}
