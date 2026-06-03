import Link from "next/link";
import { mockCctvs } from "@/constants/mock-cctvs";
import { notFound } from "next/navigation";
import { HlsPlayer } from "@/components/cctv/HlsPlayer";

type Props = { params: Promise<{ id: string }> };

const relatedComments = [
  { user: "jeju_lover", text: "바다 색깔 오늘 너무 예쁘다!", time: "3분 전", emoji: "🌊" },
  { user: "travel_mom", text: "혼잡도 어떤가요? 주차 괜찮을까요?", time: "8분 전", emoji: "🚗" },
  { user: "surf_boy", text: "파도 좋아 보이는데 서핑 하기 좋겠다", time: "15분 전", emoji: "🏄" },
  { user: "photo_jeju", text: "노을 시간대 진짜 예쁠 것 같아요", time: "22분 전", emoji: "📸" },
];

export async function generateStaticParams() {
  return mockCctvs.map((c) => ({ id: c.id }));
}

export default async function CctvDetailPage({ params }: Props) {
  const { id } = await params;
  const cctv = mockCctvs.find((c) => c.id === id);
  if (!cctv) notFound();

  const nearby = mockCctvs.filter((c) => c.id !== id).slice(0, 3);

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

          {/* AI 날씨/혼잡도 요약 */}
          <div className="mx-4 rounded-2xl border border-brand-navy/20 bg-brand-navy/5 p-4 md:mx-0">
            <p className="mb-2 text-xs font-bold text-brand-navy">🤖 AI 현장 요약</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: "날씨", value: "☀️ 맑음", sub: "23°C" },
                { label: "혼잡도", value: "🟡 보통", sub: "적당함" },
                { label: "바람", value: "💨 약풍", sub: "2m/s" },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-white px-3 py-2.5 shadow-card">
                  <p className="text-[10px] text-text-secondary">{item.label}</p>
                  <p className="mt-0.5 text-sm font-bold text-text-primary">{item.value}</p>
                  <p className="text-[10px] text-text-secondary">{item.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Live Chat */}
          <div className="mx-4 rounded-2xl border border-border-soft bg-bg-card shadow-card md:mx-0">
            <div className="border-b border-border-soft px-4 py-3">
              <p className="text-sm font-bold text-text-primary">💬 실시간 채팅</p>
            </div>
            <div className="space-y-2 p-3">
              {relatedComments.map((c, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bg-secondary text-sm">
                    {c.emoji}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-brand-navy">{c.user}</span>
                    <span className="ml-1 text-[10px] text-text-secondary">{c.time}</span>
                    <p className="text-xs text-text-primary">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border-soft px-3 py-2.5">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="채팅 참여하기..."
                  className="flex-1 rounded-full border border-border-soft bg-bg-secondary px-3 py-1.5 text-xs outline-none placeholder:text-text-secondary"
                />
                <button type="button" className="rounded-full bg-brand-navy px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-navy/90 transition-colors">
                  전송
                </button>
              </div>
            </div>
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
