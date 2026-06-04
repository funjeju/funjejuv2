import Link from "next/link";
import { mockCctvs } from "@/constants/mock-cctvs";
import { notFound } from "next/navigation";
import { HlsPlayer } from "@/components/cctv/HlsPlayer";
import { fetchWeather } from "@/lib/weather";
import { LiveChat } from "@/components/cctv/LiveChat";

type Props = { params: Promise<{ id: string }> };

export async function generateStaticParams() {
  return mockCctvs.map((c) => ({ id: c.id }));
}

export const revalidate = 600; // 날씨는 10분 캐시 (채팅은 클라이언트 실시간)
export const dynamicParams = true;

export default async function CctvDetailPage({ params }: Props) {
  const { id } = await params;
  const cctv = mockCctvs.find((c) => c.id === id);
  if (!cctv) notFound();

  const nearby = mockCctvs.filter((c) => c.id !== id).slice(0, 3);
  const weather = await fetchWeather(cctv.latitude, cctv.longitude);

  return (
    <div className="mx-auto max-w-screen-xl px-0 md:px-4 md:py-6">
      {/* Back */}
      <div className="px-4 pb-3 md:px-0">
        <Link href="/cctv" className="inline-flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
          ← CCTV 목록
        </Link>
      </div>

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

            {/* 스트림 상태 표시 */}
            <div className="mt-3 flex items-center gap-2">
              {cctv.streamProxyUrl ? (
                <span className="flex items-center gap-1.5 rounded-full bg-jeju-green/10 border border-jeju-green/20 px-3 py-1 text-xs font-semibold text-jeju-green">
                  <span className="h-1.5 w-1.5 rounded-full bg-jeju-green animate-pulse" />
                  스트림 연결됨
                </span>
              ) : (
                <span className="flex items-center gap-1.5 rounded-full bg-gray-100 border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                  스트림 미설정
                </span>
              )}
              {["실시간", cctv.category, cctv.region].map((tag) => (
                <span key={tag} className="rounded-full bg-bg-secondary px-3 py-1 text-xs font-medium text-text-secondary">
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
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-white px-3 py-2.5 shadow-card">
                    <p className="text-[10px] text-text-secondary">날씨</p>
                    <p className="mt-0.5 text-sm font-bold text-text-primary">
                      {weather.emoji} {weather.description}
                    </p>
                    <p className="text-[10px] text-text-secondary">
                      {weather.temperature}°C (체감 {weather.apparentTemp}°)
                    </p>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-2.5 shadow-card">
                    <p className="text-[10px] text-text-secondary">예상 혼잡도</p>
                    <p className="mt-0.5 text-sm font-bold text-text-primary">
                      {weather.congestionEmoji} {weather.congestion}
                    </p>
                    <p className="text-[10px] text-text-secondary">시간·날씨 기반</p>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-2.5 shadow-card">
                    <p className="text-[10px] text-text-secondary">바람</p>
                    <p className="mt-0.5 text-sm font-bold text-text-primary">
                      💨 {weather.windLabel}
                    </p>
                    <p className="text-[10px] text-text-secondary">{weather.windSpeed}m/s</p>
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

          {/* Live Chat (Firestore 실시간) */}
          <div className="mx-4 md:mx-0">
            <LiveChat cctvId={cctv.id} cctvName={cctv.name} />
          </div>
        </div>

        {/* ── 오른쪽: 근처 CCTV ── */}
        <aside className="w-full space-y-3 lg:w-72 lg:shrink-0">
          <p className="px-4 text-sm font-bold text-text-primary md:px-0">📷 근처 CCTV</p>
          {nearby.map((c) => (
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
