import Link from "next/link";
import { HomeCctvSection } from "@/components/cctv/HomeCctvSection";

const quickLinks = [
  { href: "/cctv", label: "실시간 CCTV", emoji: "📷", bg: "bg-blue-50", color: "text-blue-600" },
  { href: "/feed", label: "라이브 피드", emoji: "🖼️", bg: "bg-yellow-50", color: "text-yellow-600" },
  { href: "/chat", label: "AI 도슨트 챗봇", emoji: "🤖", bg: "bg-purple-50", color: "text-purple-600" },
  { href: "/youtube", label: "유튜브 요약", emoji: "▶️", bg: "bg-red-50", color: "text-red-500" },
  { href: "/trip-ai", label: "AI 여행 일정", emoji: "🗓️", bg: "bg-green-50", color: "text-green-600" },
  { href: "/saved", label: "저장한 스팟", emoji: "⭐", bg: "bg-orange-50", color: "text-orange-500" },
];

const liveFeedMock = [
  { id: 1, text: "오늘 삼산 드라이브 최고였어요!", user: "jeju_love_0", time: "2시간 전", likes: 128, emoji: "🌊" },
  { id: 2, text: "바다 보며 커피 한잔 ☕", user: "cafe_jeju", time: "3시간 전", likes: 97, emoji: "☕" },
  { id: 3, text: "흑돼지 진짜 맛집 발견!", user: "yum_jeju", time: "4시간 전", likes: 153, emoji: "🍖" },
  { id: 4, text: "협재 바다색 미쳤다..💙", user: "beach_day", time: "5시간 전", likes: 209, emoji: "🏖️" },
  { id: 5, text: "귤이 주렁주렁 🍊", user: "orange_jeju", time: "6시간 전", likes: 87, emoji: "🍊" },
  { id: 6, text: "제주 바람은 늘 좋다", user: "slow_moment", time: "7시간 전", likes: 75, emoji: "🌿" },
  { id: 7, text: "노을 찰칵 인생샷..📸", user: "film_jeju", time: "8시간 전", likes: 112, emoji: "🌅" },
  { id: 8, text: "오션뷰 점심 최고!", user: "delicious_jeju", time: "8시간 전", likes: 66, emoji: "🍱" },
];

const hotSpots = [
  { rank: 1, name: "협재 해변", sub: "바다 · 제주시 한림읍", emoji: "🏖️" },
  { rank: 2, name: "카멜리아힐", sub: "관광지 · 서귀포시 안덕면", emoji: "🌸" },
  { rank: 3, name: "오설록 티뮤지엄", sub: "카페 · 서귀포시 안덕면", emoji: "🍵" },
];

const youtubeRecs = [
  { title: "제주 서쪽 감성 여행", duration: "3:25", spots: 12 },
  { title: "제주 오름 BEST 5", duration: "4:11", spots: 8 },
];

const chatSuggestions = [
  { label: "근처 카페 추천", emoji: "☕" },
  { label: "노을 맛집 알려줘", emoji: "🌅" },
  { label: "비 오는 날 코스", emoji: "🌧️" },
  { label: "아이와 함께", emoji: "👨‍👩‍👧" },
  { label: "핫플 찾기", emoji: "🔥" },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-screen-xl px-0 md:px-4 md:py-6">
      <div className="flex gap-5">
        {/* ── Main Column ── */}
        <div className="min-w-0 flex-1 space-y-5">

          {/* Hero Banner */}
          <section className="relative overflow-hidden rounded-none md:rounded-2xl">
            <div className="relative h-48 bg-gradient-to-r from-sky-300 via-blue-200 to-teal-100 md:h-60">
              {/* Overlay text */}
              <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-12">
                <h1 className="text-2xl font-black text-gray-800 drop-shadow-sm md:text-4xl">
                  제주, 지금 이 순간을 담다
                </h1>
                <p className="mt-1 text-sm text-gray-600 md:text-base">
                  실시간 제주, 당신의 여행이 콘텐츠가 되는 곳
                </p>
              </div>
              {/* Weather badge */}
              <div className="absolute right-4 top-4 rounded-full border border-yellow-300 bg-white/80 px-3 py-1 text-xs font-medium text-yellow-700 backdrop-blur">
                오늘도 좋은 날씨! ☀️
              </div>
              {/* Mascot area */}
              <div className="absolute bottom-0 right-6 flex items-end gap-1 md:right-12">
                <div className="flex h-24 w-24 items-end justify-center text-6xl md:h-32 md:w-32 md:text-7xl">
                  🗿
                </div>
              </div>
              {/* Decorative flowers */}
              <div className="absolute bottom-2 right-28 text-2xl md:right-40">🌼🌼</div>
            </div>
          </section>

          {/* Quick Links */}
          <section className="px-4 md:px-0">
            <div className="grid grid-cols-6 gap-2 md:gap-3">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex flex-col items-center gap-1.5"
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${link.bg} md:h-14 md:w-14`}>
                    {link.emoji}
                  </div>
                  <span className={`text-center text-[10px] font-medium leading-tight ${link.color} md:text-xs`}>
                    {link.label}
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {/* CCTV Section */}
          <HomeCctvSection />

          {/* Live Feed */}
          <section className="px-4 md:px-0">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-text-primary md:text-lg">
                라이브 피드 <span className="text-brand-yellow">✨</span>
              </h2>
            </div>

            {/* Filter tabs */}
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {["전체", "자연", "카페", "맛집", "액티비티"].map((tab, i) => (
                <button
                  key={tab}
                  type="button"
                  className={[
                    "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                    i === 0
                      ? "bg-text-primary text-white"
                      : "border border-border-soft bg-bg-card text-text-secondary hover:bg-bg-secondary",
                  ].join(" ")}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {liveFeedMock.map((post) => (
                <div
                  key={post.id}
                  className="overflow-hidden rounded-xl border border-border-soft bg-bg-card shadow-card"
                >
                  <div className="flex aspect-square items-center justify-center bg-gradient-to-br from-sky-100 to-teal-50 text-4xl">
                    {post.emoji}
                  </div>
                  <div className="p-2.5">
                    <p className="line-clamp-2 text-xs font-medium text-text-primary">{post.text}</p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <div className="h-4 w-4 rounded-full bg-brand-orange/20 text-center text-[8px] leading-4">
                          {post.user[0].toUpperCase()}
                        </div>
                        <span className="text-[10px] text-text-secondary">{post.time}</span>
                      </div>
                      <span className="text-[10px] text-text-secondary">❤️ {post.likes}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="mt-4 w-full rounded-full border border-border-soft bg-bg-card py-3 text-sm font-semibold text-text-secondary hover:bg-bg-secondary transition-colors"
            >
              더 많은 피드 보기 ∨
            </button>
          </section>

          {/* Bottom mascot banner (mobile) */}
          <section className="mx-4 mb-4 overflow-hidden rounded-2xl bg-gradient-to-r from-brand-yellow/20 to-brand-orange/10 p-4 md:hidden">
            <div className="flex items-start gap-3">
              <div className="text-4xl">🗿</div>
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  안녕! 나는 제주 여행 친구 &apos;돌맹이&apos;야😎
                </p>
                <p className="text-xs text-text-secondary">지금 어디야? 내가 딱 맞는 여행을 추천해줄게!</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {["지금 날씨에 좋은 코스", "아이랑 가기 좋은 곳", "비 오는 날 추천 장소", "혼자 여행 코스 추천"].map((t) => (
                <button
                  key={t}
                  type="button"
                  className="shrink-0 rounded-full bg-white/80 px-3 py-1.5 text-[11px] font-medium text-text-primary shadow-card hover:bg-white transition-colors"
                >
                  {t}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* ── Right Sidebar (desktop only) ── */}
        <aside className="hidden w-72 shrink-0 space-y-4 lg:block">

          {/* AI Chatbot */}
          <div className="rounded-2xl border border-border-soft bg-bg-card p-4 shadow-card">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-lg">🤖</span>
              <h3 className="text-sm font-bold text-text-primary">AI 도슨트 챗봇</h3>
            </div>
            <div className="space-y-2">
              <div className="flex gap-2 text-xs text-text-secondary">
                <span className="text-xl">🗿</span>
                <div className="rounded-xl rounded-tl-none bg-bg-secondary p-2.5 text-xs leading-relaxed">
                  안녕! 나는 제주 여행 친구 &apos;돌맹이&apos;야! 😎<br />
                  지금 어디야? 내가 딱 맞는 여행을 추천해줄게!
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              {chatSuggestions.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  className="rounded-lg border border-border-soft bg-bg-primary px-2 py-1.5 text-left text-[11px] font-medium text-text-secondary hover:bg-bg-secondary transition-colors"
                >
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="mt-3 w-full rounded-xl bg-brand-navy py-2.5 text-xs font-semibold text-white hover:bg-brand-navy/90 transition-colors"
            >
              새로운 대화 시작 💬
            </button>
          </div>

          {/* Today's Recommended Course */}
          <div className="rounded-2xl border border-border-soft bg-bg-card p-4 shadow-card">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-primary">오늘의 추천 코스</h3>
            </div>
            <p className="mb-2 text-[10px] text-brand-orange font-medium">🤖 AI 맞춤 추천</p>
            <div className="rounded-xl bg-bg-secondary p-3">
              <p className="text-sm font-bold text-text-primary">한라산 둘레길 힐링 코스</p>
              <p className="mt-1 text-[11px] text-text-secondary leading-relaxed">
                난이도 하 · 소요시간 3시간<br />
                자연을 바라보며 관기 좋은 코스
              </p>
              <button
                type="button"
                className="mt-2 w-full rounded-lg bg-brand-orange py-1.5 text-xs font-semibold text-white hover:bg-brand-orange/90 transition-colors"
              >
                코스 자세히 보기
              </button>
            </div>
          </div>

          {/* Hot Spots TOP 3 */}
          <div className="rounded-2xl border border-border-soft bg-bg-card p-4 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-primary">찜한 스팟 TOP 3</h3>
              <Link href="/saved" className="text-[11px] font-medium text-brand-orange">전체보기 →</Link>
            </div>
            <div className="space-y-2.5">
              {hotSpots.map((spot) => (
                <div key={spot.rank} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-orange text-xs font-bold text-white">
                    {spot.rank}
                  </span>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bg-secondary text-xl">
                    {spot.emoji}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-text-primary">{spot.name}</p>
                    <p className="text-[10px] text-text-secondary truncate">{spot.sub}</p>
                  </div>
                  <span className="ml-auto text-sm text-red-400">♡</span>
                </div>
              ))}
            </div>
          </div>

          {/* YouTube Recs */}
          <div className="rounded-2xl border border-border-soft bg-bg-card p-4 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-primary">유튜브 요약 추천</h3>
              <Link href="/youtube" className="text-[11px] font-medium text-brand-orange">전체보기 →</Link>
            </div>
            <div className="space-y-2.5">
              {youtubeRecs.map((v) => (
                <div key={v.title} className="flex gap-3">
                  <div className="flex h-12 w-20 shrink-0 items-center justify-center rounded-lg bg-gray-900 text-xl text-white">
                    ▶
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-text-primary">{v.title}</p>
                    <p className="text-[10px] text-text-secondary">
                      {v.duration} · 스팟 {v.spots}개
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Trip Planner CTA */}
          <div className="rounded-2xl bg-gradient-to-br from-brand-navy to-blue-600 p-4 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold">AI 여행 일정 만들기</h3>
                <p className="mt-1 text-[11px] text-white/80 leading-relaxed">
                  나만의 맞춤 여행 일정을<br />AI가 설계해드려요!
                </p>
                <Link
                  href="/trip-ai"
                  className="mt-3 inline-block rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-brand-navy hover:bg-white/90 transition-colors"
                >
                  일정 만들기
                </Link>
              </div>
              <span className="text-4xl">🗿</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
