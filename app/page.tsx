import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { AutoRotateViewer } from "@/components/cctv/AutoRotateViewer";
import { DolmangyiIcon } from "@/components/common/DolmangyiIcon";
import { CctvIcon } from "@/components/common/CctvIcon";
import { CameraIcon } from "@/components/common/CameraIcon";
import { TubeIcon } from "@/components/common/TubeIcon";
import { listPublished } from "@/lib/contents";
import { listGames } from "@/lib/spot";

export const revalidate = 20;

const quickLinks: { href: string; label: string; emoji?: string; icon?: ReactNode; bg: string; color: string }[] = [
  { href: "/cctv",      label: "실시간 CCTV",  icon: <CctvIcon size={26} />,   bg: "bg-blue-50",    color: "text-blue-600"   },
  { href: "/feed",      label: "라이브 피드",   icon: <CameraIcon size={26} />, bg: "bg-yellow-50",  color: "text-yellow-600" },
  { href: "/chat",      label: "도슨트 챗봇",   emoji: "🤖", bg: "bg-purple-50",  color: "text-purple-600" },
  { href: "/trip-ai",   label: "AI 여행 일정", emoji: "🗓️", bg: "bg-green-50",   color: "text-green-600"  },
  { href: "/food",      label: "도민맛집",      emoji: "🍽️", bg: "bg-orange-50",  color: "text-orange-500" },
  { href: "/webzine",   label: "여행 웹진",     emoji: "📖", bg: "bg-pink-50",    color: "text-pink-600"   },
  { href: "/game/spot", label: "틀린그림찾기",  emoji: "🔍", bg: "bg-teal-50",    color: "text-teal-600"   },
  { href: "/youtube",   label: "제주tube",      icon: <TubeIcon size={26} />,   bg: "bg-red-50",     color: "text-red-600"    },
];

export default async function HomePage() {
  const webzines = await listPublished("webzine", 4).catch(() => []);
  const spotGames = await listGames({ publishedOnly: true, limit: 2 }).catch(() => []);
  return (
    <div className="mx-auto max-w-screen-xl px-0 md:px-4 md:py-6">
      <div className="flex gap-5">
        {/* ── Main Column ── */}
        <div className="min-w-0 flex-1 space-y-5">

          {/* Hero Banner — 모바일에선 숨김(메뉴를 위로), PC만 노출 */}
          <section className="relative hidden overflow-hidden rounded-none md:block md:rounded-2xl">
            <div className="relative h-40 bg-gradient-to-r from-sky-300 via-blue-200 to-teal-100 md:h-60">
              {/* 텍스트 — 모바일에선 캐릭터 침범 안 받게 max-w 제한 */}
              <div className="absolute inset-y-0 left-0 flex max-w-[60%] flex-col justify-center px-4 md:max-w-none md:px-12">
                <h1 className="text-lg font-black leading-tight text-gray-800 drop-shadow-sm md:text-4xl">
                  제주, 지금 이 순간을 담다
                </h1>
                <p className="mt-1 text-[11px] leading-snug text-gray-600 md:text-base">
                  실시간 제주, 당신의 여행이 콘텐츠가 되는 곳
                </p>
              </div>
              <div className="absolute right-3 top-3 rounded-full border border-yellow-300 bg-white/80 px-2 py-0.5 text-[10px] font-medium text-yellow-700 backdrop-blur md:right-4 md:top-4 md:px-3 md:py-1 md:text-xs">
                ☀️ 좋은 날씨
              </div>
              {/* 마스코트 — 모바일 작게 */}
              <div className="absolute bottom-0 right-2 flex items-end md:right-12">
                <DolmangyiIcon size={72} className="md:!w-28 md:!h-28" />
              </div>
              <div className="absolute bottom-1 right-20 text-lg md:right-40 md:text-2xl">🌼🌼</div>
            </div>
          </section>

          {/* Quick Links — 모바일 4×2, PC는 한 줄(8열) */}
          <section className="px-4 pt-3 md:px-0 md:pt-0">
            <div className="grid grid-cols-4 gap-2 md:grid-cols-8 md:gap-3">
              {quickLinks.map((link) => (
                <Link key={link.href} href={link.href} className="flex flex-col items-center gap-1.5">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${link.bg} ${link.color} md:h-14 md:w-14`}>
                    {link.icon ?? link.emoji}
                  </div>
                  <span className={`text-center text-[10px] font-medium leading-tight ${link.color} md:text-xs`}>
                    {link.label}
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <AutoRotateViewer />

          {/* 최근 틀린그림찾기 (피드 자리 대체) */}
          {spotGames.length > 0 && (
            <section className="px-4 md:px-0">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-black text-text-primary">🔍 제주 틀린그림찾기</h2>
                <Link href="/game/spot" className="text-xs font-medium text-brand-orange">더보기 →</Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {spotGames.map((g) => (
                  <Link key={g.id} href={`/game/spot/${g.id}`}
                    className="group overflow-hidden rounded-2xl border border-border-soft bg-bg-card shadow-card transition-transform hover:scale-[1.01]">
                    <div className="relative aspect-square bg-bg-secondary">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={g.variantImage} alt={g.title} className="h-full w-full object-cover" loading="lazy" />
                      <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">틀린곳 {g.diffCount}</span>
                    </div>
                    <div className="p-2.5">
                      <p className="line-clamp-1 text-[13px] font-bold text-text-primary">{g.title}</p>
                      <p className="text-[10px] text-text-secondary">플레이 {g.playCount ?? 0}회</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* 최신 웹진 (홈 → 웹진 내부링크 · 발견성) */}
          {webzines.length > 0 && (
            <section className="px-4 md:px-0">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-black text-text-primary">📖 제주 여행 웹진</h2>
                <Link href="/webzine" className="text-xs font-medium text-brand-orange">더보기 →</Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {webzines.map((w) => (
                  <Link key={w.id} href={`/webzine/${w.slug}`}
                    className="group overflow-hidden rounded-2xl border border-border-soft bg-bg-card shadow-card transition-transform hover:scale-[1.01]">
                    {w.coverImage && (
                      <div className="relative aspect-[16/9] bg-bg-secondary">
                        <Image src={w.coverImage} alt={w.title} fill sizes="(max-width:768px) 50vw, 300px" className="object-cover" loading="lazy" />
                      </div>
                    )}
                    <div className="p-3">
                      {w.region && (
                        <span className="text-[10px] font-bold text-brand-navy">📍 {w.region} {w.menu}</span>
                      )}
                      <p className="mt-0.5 line-clamp-2 text-[12px] font-bold text-text-primary">{w.title}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

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
