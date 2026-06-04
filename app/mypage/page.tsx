"use client";

import Link from "next/link";
import { PageHeader } from "@/components/common/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { useSaved } from "@/hooks/useSaved";
import { mockCctvs } from "@/constants/mock-cctvs";
import { HlsMiniPlayer } from "@/components/cctv/HlsMiniPlayer";
import { BusinessCtaSettings } from "@/components/mypage/BusinessCtaSettings";

const menuItems = [
  { label: "저장한 스팟", href: "/saved",   emoji: "⭐" },
  { label: "내 여행 일정", href: "/trip-ai", emoji: "🗓️" },
  { label: "내 피드",     href: "/feed",    emoji: "📸" },
  { label: "알림 설정",   href: "#",        emoji: "🔔" },
  { label: "앱 설정",     href: "#",        emoji: "⚙️" },
];

const recentActivity = [
  { text: "협재 해변을 저장했어요",            time: "1시간 전", emoji: "⭐" },
  { text: "서부 감성 힐링 코스 일정을 만들었어요", time: "어제",    emoji: "🗓️" },
  { text: "흑돼지 맛집 발견! 피드를 올렸어요",  time: "2일 전",  emoji: "📸" },
];

export default function MyPage() {
  const { user, loading, signInWithGoogle, logout } = useAuth();
  const { savedIds } = useSaved();

  const stats = [
    { label: "저장한 스팟",  value: String(savedIds.size), emoji: "⭐" },
    { label: "작성한 피드",  value: "3",  emoji: "📸" },
    { label: "완성한 일정",  value: "2",  emoji: "🗓️" },
  ];

  // 비로그인 상태
  if (!loading && !user) {
    return (
      <div className="mx-auto max-w-screen-xl px-0 md:px-4 md:py-6">
        <PageHeader title="마이페이지" emoji="👤" />
        <div className="flex flex-col items-center py-20 text-center px-4">
          <div className="text-6xl">🗿</div>
          <h2 className="mt-4 text-lg font-black text-text-primary">로그인이 필요해요</h2>
          <p className="mt-1 text-sm text-text-secondary">저장한 스팟과 여행 일정을 관리하려면 로그인하세요</p>
          <button
            type="button"
            onClick={signInWithGoogle}
            className="mt-6 flex items-center gap-2 rounded-full bg-brand-navy px-6 py-3 text-sm font-bold text-white shadow-soft hover:bg-brand-navy/90 transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google로 시작하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-xl px-0 md:px-4 md:py-6">
      <PageHeader title="마이페이지" emoji="👤" />

      {/* Profile Card */}
      <div className="mx-4 mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-navy to-blue-700 p-5 text-white md:mx-0">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-white/20">
            {user?.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoURL} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-3xl">🗿</span>
            )}
          </div>
          <div>
            <p className="text-lg font-black">{user?.displayName ?? "제주 여행자"}</p>
            <p className="text-sm text-white/70">{user?.email}</p>
            <span className="mt-1 inline-block rounded-full bg-brand-yellow px-2 py-0.5 text-[10px] font-black text-brand-navy">
              🏝️ 제주 탐험가
            </span>
          </div>
          <button
            type="button"
            onClick={logout}
            className="ml-auto rounded-full border border-white/30 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 transition-colors"
          >
            로그아웃
          </button>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 divide-x divide-white/20 rounded-xl bg-white/10">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col items-center py-3">
              <span className="text-xl">{s.emoji}</span>
              <span className="text-lg font-black">{s.value}</span>
              <span className="text-[10px] text-white/70">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Mascot CTA */}
      <div className="mx-4 mb-5 flex items-center gap-3 rounded-2xl border border-brand-yellow/30 bg-brand-yellow/20 px-4 py-3 md:mx-0">
        <span className="text-3xl">🗿</span>
        <div>
          <p className="text-sm font-bold text-text-primary">돌맹이가 일정을 추천해드릴게요!</p>
          <p className="text-[11px] text-text-secondary">저장한 스팟 {savedIds.size}개로 최적 동선 만들기</p>
        </div>
        <Link
          href="/trip-ai"
          className="ml-auto shrink-0 rounded-full bg-brand-orange px-3 py-1.5 text-[11px] font-bold text-white hover:bg-brand-orange/90 transition-colors"
        >
          일정 만들기
        </Link>
      </div>

      {/* 즐겨찾기 CCTV */}
      {(() => {
        const savedCctvs = mockCctvs.filter((c) => savedIds.has(c.id));
        if (savedCctvs.length === 0) return null;
        return (
          <section className="mx-4 mb-5 md:mx-0">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold text-text-primary">
                📷 내 즐겨찾기 CCTV
                <span className="rounded-full bg-brand-orange/10 px-2 py-0.5 text-[10px] font-bold text-brand-orange">
                  {savedCctvs.length}
                </span>
              </h2>
              <Link href="/cctv/multiview" className="text-xs font-medium text-brand-orange">
                4분할로 보기 →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {savedCctvs.map((cctv) => (
                <HlsMiniPlayer
                  key={cctv.id}
                  id={cctv.id}
                  proxyUrl={cctv.streamProxyUrl}
                  name={cctv.name}
                />
              ))}
            </div>
          </section>
        );
      })()}

      {/* 비즈니스 CTA 설정 */}
      <BusinessCtaSettings />

      {/* Menu */}
      <div className="mx-4 overflow-hidden rounded-2xl border border-border-soft bg-bg-card shadow-card md:mx-0">
        {menuItems.map((item, i) => (
          <Link
            key={item.href}
            href={item.href}
            className={["flex items-center gap-3 px-4 py-4 hover:bg-bg-secondary transition-colors", i !== menuItems.length - 1 ? "border-b border-border-soft" : ""].join(" ")}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-bg-secondary text-xl">{item.emoji}</span>
            <span className="flex-1 text-sm font-semibold text-text-primary">{item.label}</span>
            <span className="text-text-secondary">›</span>
          </Link>
        ))}
      </div>

      {/* Recent */}
      <section className="mt-5 px-4 md:px-0">
        <h2 className="mb-3 text-sm font-bold text-text-primary">최근 활동</h2>
        <div className="space-y-2">
          {recentActivity.map((a, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-border-soft bg-bg-card px-4 py-3 shadow-card">
              <span className="text-lg">{a.emoji}</span>
              <p className="flex-1 text-xs font-medium text-text-primary">{a.text}</p>
              <span className="text-[10px] text-text-secondary">{a.time}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
