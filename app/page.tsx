import Link from "next/link";
import { AutoRotateViewer } from "@/components/cctv/AutoRotateViewer";
import { HomeFeedSection } from "@/components/feed/HomeFeedSection";
import { DolmangyiIcon } from "@/components/common/DolmangyiIcon";

const quickLinks = [
  { href: "/cctv",    label: "실시간 CCTV",    emoji: "📷", bg: "bg-blue-50",   color: "text-blue-600"   },
  { href: "/feed",    label: "라이브 피드",     emoji: "🖼️", bg: "bg-yellow-50", color: "text-yellow-600" },
  { href: "/chat",    label: "AI 도슨트 챗봇", emoji: "🤖", bg: "bg-purple-50", color: "text-purple-600" },
  { href: "/trip-ai", label: "AI 여행 일정",   emoji: "🗓️", bg: "bg-green-50",  color: "text-green-600"  },
  { href: "/food",    label: "도민맛집",        emoji: "🍽️", bg: "bg-orange-50", color: "text-orange-500" },
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
              <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-12">
                <h1 className="text-2xl font-black text-gray-800 drop-shadow-sm md:text-4xl">
                  제주, 지금 이 순간을 담다
                </h1>
                <p className="mt-1 text-sm text-gray-600 md:text-base">
                  실시간 제주, 당신의 여행이 콘텐츠가 되는 곳
                </p>
              </div>
              <div className="absolute right-4 top-4 rounded-full border border-yellow-300 bg-white/80 px-3 py-1 text-xs font-medium text-yellow-700 backdrop-blur">
                오늘도 좋은 날씨! ☀️
              </div>
              {/* 마스코트 */}
              <div className="absolute bottom-0 right-6 flex items-end md:right-12">
                <DolmangyiIcon size={96} className="md:!w-28 md:!h-28" />
              </div>
              <div className="absolute bottom-2 right-28 text-2xl md:right-40">🌼🌼</div>
            </div>
          </section>

          {/* Quick Links */}
          <section className="px-4 md:px-0">
            <div className="grid grid-cols-5 gap-2 md:gap-3">
              {quickLinks.map((link) => (
                <Link key={link.href} href={link.href} className="flex flex-col items-center gap-1.5">
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

          <AutoRotateViewer />
          <HomeFeedSection />

          {/* 모바일 마스코트 배너 */}
          <section className="mx-4 mb-4 overflow-hidden rounded-2xl bg-gradient-to-r from-brand-yellow/20 to-brand-orange/10 p-4 md:hidden">
            <div className="flex items-start gap-3">
              <DolmangyiIcon size={48} className="shrink-0" />
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  안녕! 나는 제주 여행 AI 도슨트야 😎
                </p>
                <p className="text-xs text-text-secondary">지금 어디야? 내가 딱 맞는 여행을 추천해줄게!</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {["지금 날씨에 좋은 코스", "아이랑 가기 좋은 곳", "비 오는 날 추천 장소", "혼자 여행 코스 추천"].map((t) => (
                <button key={t} type="button"
                  className="shrink-0 rounded-full bg-white/80 px-3 py-1.5 text-[11px] font-medium text-text-primary shadow-card hover:bg-white transition-colors">
                  {t}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* ── Right Sidebar ── */}
        <aside className="hidden w-72 shrink-0 space-y-4 lg:block">

          {/* AI Chatbot */}
          <div className="rounded-2xl border border-border-soft bg-bg-card p-4 shadow-card">
            <div className="mb-3 flex items-center gap-2">
              <DolmangyiIcon size={24} />
              <h3 className="text-sm font-bold text-text-primary">AI 도슨트 챗봇</h3>
            </div>
            <div className="flex gap-2 items-start">
              <DolmangyiIcon size={28} className="shrink-0 mt-0.5" />
              <div className="rounded-xl rounded-tl-none bg-bg-secondary p-2.5 text-xs leading-relaxed text-text-secondary">
                안녕! 나는 제주 여행 AI 도슨트야! 😎<br />
                지금 어디야? 딱 맞는 여행을 추천해줄게!
              </div>
            </div>
            <Link
              href="/chat"
              className="mt-3 block w-full rounded-xl bg-brand-orange py-2.5 text-center text-xs font-bold text-white hover:bg-brand-orange/90 transition-colors"
            >
              새로운 대화 시작 💬
            </Link>
          </div>

          {/* AI Trip Planner CTA */}
          <div className="rounded-2xl bg-gradient-to-br from-brand-navy to-blue-600 p-4 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold">AI 여행 일정 만들기</h3>
                <p className="mt-1 text-[11px] text-white/80 leading-relaxed">
                  나만의 맞춤 여행 일정을<br />AI가 설계해드려요!
                </p>
                <Link href="/trip-ai"
                  className="mt-3 inline-block rounded-lg bg-brand-yellow px-3 py-1.5 text-xs font-bold text-brand-navy hover:bg-brand-yellow/90 transition-colors">
                  일정 만들기 →
                </Link>
              </div>
              <DolmangyiIcon size={56} className="shrink-0" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
