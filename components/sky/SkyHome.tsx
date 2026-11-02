"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SKY_CAMERAS, skyCameraSub, type SkyCamera, type SkyGroup } from "@/lib/sky/cameras";
import { JEJU_ISLANDS, JEJU_OUTLINE, JEJU_VIEWBOX } from "@/lib/sky/outline";
import { openWatch, watchUrl } from "@/lib/sky/watch";
import { PROMO_CONTACT, PROMO_MAILTO } from "@/lib/sky/contact";

const LOOK: Record<SkyGroup, { core: string; glow: string }> = {
  J: { core: "#EAF2FF", glow: "0 0 6px 2px rgba(150,190,255,.85), 0 0 18px 6px rgba(110,150,255,.30)" },
  S: { core: "#EAF2FF", glow: "0 0 6px 2px rgba(150,190,255,.85), 0 0 18px 6px rgba(110,150,255,.30)" },
  H: { core: "#FFF1D6", glow: "0 0 6px 2px rgba(255,210,140,.85), 0 0 20px 7px rgba(255,180,90,.30)" },
  A: { core: "#FFE1A0", glow: "0 0 6px 2px rgba(255,190,90,.90), 0 0 20px 7px rgba(255,170,60,.32)" },
};

type Filter = "all" | "J" | "S" | "H";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "J", label: "제주시" },
  { key: "S", label: "서귀포" },
  { key: "H", label: "한라산" },
];
const inFilter = (c: SkyCamera, f: Filter) =>
  f === "all" || (f === "J" ? c.group === "J" || c.group === "A" : c.group === f);

/** 배경 별 — 결정적 난수라 서버/클라이언트 렌더가 같다 */
function makeBackgroundStars(n: number) {
  let seed = 7;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  return Array.from({ length: n }, () => ({
    x: rnd() * 100, y: rnd() * 100, s: rnd() > 0.88 ? 2 : 1, o: 0.15 + rnd() * 0.55, d: rnd() * 7,
  }));
}

function canHover() {
  return typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches;
}

export function SkyHome() {
  // 미리보기는 기본으로 띄우지 않는다. 별에 올린 동안만 보이고, 벗어나거나 빈 곳을 누르거나 ESC면 닫힌다.
  const [focusId, setFocusId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const bg = useMemo(() => makeBackgroundStars(150), []);
  const focus = focusId ? SKY_CAMERAS.find((c) => c.id === focusId) ?? null : null;
  const cards = SKY_CAMERAS.filter((c) => inFilter(c, filter));
  const count = (f: Filter) => SKY_CAMERAS.filter((c) => inFilter(c, f)).length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFocusId(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onStar = (c: SkyCamera) => {
    // 마우스 환경: 올리면 미리보기, 누르면 새 창. 터치 환경: 첫 탭은 미리보기, 같은 별 두 번째 탭에 새 창
    if (canHover() || focusId === c.id) openWatch(c);
    else setFocusId(c.id);
  };
  const leaveStar = (c: SkyCamera) => {
    if (canHover()) setFocusId((cur) => (cur === c.id ? null : cur));
  };
  const onMapTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (canHover()) { setFocusId(null); return; }
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    let best: SkyCamera | null = null;
    let bestDist = Infinity;
    for (const c of SKY_CAMERAS) {
      const d = Math.hypot((c.x / 100) * r.width - px, (c.y / 100) * r.height - py);
      if (d < bestDist) { bestDist = d; best = c; }
    }
    if (!best || bestDist > 36) { setFocusId(null); return; }
    if (focusId === best.id) openWatch(best);
    else setFocusId(best.id);
  };

  const cardPos = !focus ? "" :
    focus.x > 55
      ? focus.y > 60 ? "translate(calc(-100% - 24px), calc(-100% + 40px))" : "translate(calc(-100% - 24px), -30%)"
      : focus.y > 60 ? "translate(24px, calc(-100% + 40px))" : "translate(24px, -30%)";

  return (
    <div
      className="sky-root relative flex min-h-screen flex-col overflow-hidden text-[#E8EEFF]"
      style={{
        backgroundColor: "#03050A",
        backgroundImage:
          "radial-gradient(ellipse 60% 45% at 72% 18%, rgba(64,86,190,0.20), transparent 70%), radial-gradient(ellipse 50% 40% at 12% 70%, rgba(30,110,150,0.13), transparent 70%)",
      }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[1300px]">
        {/* 성능: 배경 별은 대부분 고정, 일곱 개 중 하나만 반짝인다 */}
        {bg.map((b, i) => (
          <span
            key={i}
            className={`absolute rounded-full bg-white ${i % 7 === 0 ? "sky-bgtw" : ""}`}
            style={{ left: `${b.x}%`, top: `${b.y}%`, width: b.s, height: b.s, opacity: b.o, animationDelay: `${b.d}s` }}
          />
        ))}
      </div>

      <header className="relative flex flex-wrap items-center justify-between gap-4 px-5 py-6 md:px-14">
        <div className="flex items-center gap-4">
          <span className="sky-serif text-[22px] font-extrabold tracking-[0.24em] text-[#F4F6FF]">FUNJEJU</span>
          <span className="hidden h-[18px] w-px bg-[#2A3350] sm:block" />
          <span className="hidden text-[13px] tracking-[0.08em] text-[#93A0C4] sm:inline">제주 실시간 CCTV</span>
        </div>
        <nav aria-label="주 메뉴" className="flex flex-wrap gap-6 text-sm font-medium">
          <a href="#sky" className="text-white">별자리 지도</a>
          <a href="#cams" className="text-[#93A0C4] hover:text-white">카메라 목록</a>
          <a href="https://www.youtube.com/@funjeju" className="text-[#93A0C4] hover:text-white">유튜브 채널</a>
        </nav>
        <div className="sky-mono hidden items-center gap-2.5 text-xs tracking-[0.14em] text-[#93A0C4] lg:flex">
          <span className="sky-pulse h-2 w-2 rounded-full bg-[#7CF0C8]" />
          {SKY_CAMERAS.length} CAMERAS ON AIR
        </div>
      </header>

      <section id="sky" className="relative flex flex-col gap-10 px-5 pt-10 md:px-14 md:pt-14">
        <div className="flex flex-wrap items-end justify-between gap-10">
          <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-6">
            <p className="sky-mono text-xs tracking-[0.32em] text-[#8FB4FF]">33.38°N · 126.53°E · LIVE</p>
            <h1 className="sky-serif text-5xl font-extrabold leading-[1.08] tracking-[-0.02em] text-[#F6F8FF] md:text-[84px]">
              제주를 비추는<br />{SKY_CAMERAS.length}개의 별.
            </h1>
            <p className="max-w-[520px] text-base leading-[1.8] text-[#B7C2E2] md:text-[17px]">
              별 하나가 카메라 하나입니다. 별을 누르면 지금 그 바다와 하늘이 새 창에 뜹니다.
            </p>
          </div>
          {/* 업소 홍보 — 별자리 흐름을 방해하지 않게 차분한 테두리 버튼, 메일 주소는 바로 보이게 */}
          <div className="flex flex-[0_1_420px] flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <span className="text-xs tracking-[0.14em] text-[#C9B98F]">뷰맛집 사장님께</span>
            <Link
              href="/promo"
              className="flex min-h-12 items-center justify-between gap-3 rounded-full border border-[rgba(255,214,140,0.45)] px-5 py-2.5 text-[15px] font-medium text-[#FFE2A8] [word-break:keep-all] hover:bg-[rgba(255,214,140,0.08)]"
            >
              <span>CCTV 설치하고 우리 업소 홍보하기</span>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 11h13M12 5l6 6-6 6" /></svg>
            </Link>
            <a href={PROMO_MAILTO} className="flex items-center gap-2.5 px-1 text-[15px] text-[#E8EEFF] hover:text-white">
              <MailIcon />
              <span className="sky-mono tracking-[0.02em]">{PROMO_CONTACT.email}</span>
            </a>
            <span className="px-1 text-xs leading-[1.7] text-[#8E97B5]">장비와 위치는 사장님이, 365일 24시간 송출은 펀제주가 책임집니다.</span>
          </div>
        </div>

        {/* 마우스: 빈 곳을 누르면 미리보기 닫힘. 터치: 누른 곳에서 가장 가까운 별을 고른다(별이 촘촘해도 손가락으로 집기 쉽게) */}
        <div
          role="presentation"
          onClick={onMapTap}
          className="relative mx-auto w-full max-w-[1328px]"
          style={{ aspectRatio: "1000 / 543" }}
        >
          {/* 성능: 정적 그림 / 숨 쉬는 해안선(별도 레이어 opacity 애니메이션 → GPU 합성) / 빛줄기(블러 필터 없이 굵은 반투명 선으로 번짐 표현) */}
          <svg viewBox={JEJU_VIEWBOX} aria-hidden="true" className="absolute inset-0 h-full w-full overflow-visible">
            {[[70, 40, 0.1], [150, 88, 0.07], [250, 150, 0.05]].map(([rx, ry, o]) => (
              <ellipse key={rx} cx="465" cy="300" rx={rx} ry={ry} fill="none" stroke="#8FB4FF" strokeOpacity={o} strokeDasharray="2 6" />
            ))}
            <path d={JEJU_OUTLINE} fill="#5B7CFF" fillOpacity="0.03" stroke="#A9C0FF" strokeOpacity="0.18" strokeWidth="1.1" strokeLinejoin="round" />
            <path d={JEJU_ISLANDS} fill="#5B7CFF" fillOpacity="0.03" stroke="#A9C0FF" strokeOpacity="0.18" strokeWidth="0.9" />
            <rect x="74" y="18" width="62" height="58" rx="10" fill="none" stroke="#8FB4FF" strokeOpacity="0.22" strokeDasharray="3 5" />
          </svg>
          <svg viewBox={JEJU_VIEWBOX} aria-hidden="true" className="sky-breathe-layer absolute inset-0 h-full w-full overflow-visible">
            <path d={JEJU_OUTLINE} fill="none" stroke="#A9C0FF" strokeOpacity="0.6" strokeWidth="1.1" strokeLinejoin="round" />
            <path d={JEJU_ISLANDS} fill="none" stroke="#A9C0FF" strokeOpacity="0.6" strokeWidth="0.9" />
          </svg>
          <svg viewBox={JEJU_VIEWBOX} aria-hidden="true" className="absolute inset-0 h-full w-full overflow-visible">
            <path className="sky-comet" d={JEJU_OUTLINE} pathLength={1000} fill="none" stroke="#9FC0FF" strokeOpacity="0.28" strokeWidth="7" strokeLinecap="round" strokeDasharray="70 930" />
            <path className="sky-comet" d={JEJU_OUTLINE} pathLength={1000} fill="none" stroke="#E6EEFF" strokeWidth="2" strokeLinecap="round" strokeDasharray="70 930" />
          </svg>

          <span className="sky-mono absolute left-[7.4%] top-[15.4%] hidden text-[10px] tracking-[0.18em] text-[#7E8BB0] sm:block">추자도 · 45km N</span>

          {SKY_CAMERAS.map((c, i) => {
            const isFocus = c.id === focus?.id;
            // 모바일은 별을 크게, 데스크톱은 작게
            const sizeClass = c.label || isFocus ? "h-[8px] w-[8px] md:h-[5px] md:w-[5px]" : "h-[6px] w-[6px] md:h-[3.5px] md:w-[3.5px]";
            return (
              <div key={c.id}>
                <button
                  type="button"
                  aria-label={`${c.name} 카메라 열기`}
                  onMouseEnter={() => setFocusId(c.id)}
                  onMouseLeave={() => leaveStar(c)}
                  onFocus={() => setFocusId(c.id)}
                  onBlur={() => leaveStar(c)}
                  onClick={(e) => {
                    // 터치에서는 지도(onMapTap)가 가장 가까운 별을 고른다. 키보드(detail 0)·마우스는 이 별을 바로 연다
                    if (!canHover() && e.detail !== 0) return;
                    e.stopPropagation();
                    onStar(c);
                  }}
                  className="absolute z-[2] flex h-[22px] w-[22px] md:h-[14px] md:w-[14px] -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center"
                  style={{ left: `${c.x}%`, top: `${c.y}%` }}
                >
                  <span
                    className={`sky-tw block rounded-full ${sizeClass}`}
                    style={{
                      background: LOOK[c.group].core, boxShadow: LOOK[c.group].glow,
                      animationDelay: `${((i * 0.37) % 3.4).toFixed(2)}s`, animationDuration: `${(2.6 + (i % 5) * 0.55).toFixed(2)}s`,
                    }}
                  />
                </button>
                {c.label && (
                  <span
                    className="pointer-events-none absolute hidden whitespace-nowrap text-[11px] tracking-[0.04em] text-[#C3CEEE] md:block"
                    style={{
                      left: `${c.x}%`, top: `${c.y}%`, textShadow: "0 0 8px #03050A",
                      transform: c.x > 80 ? "translate(calc(-100% - 10px), -50%)" : "translate(10px, -50%)",
                    }}
                  >
                    {c.name}
                  </span>
                )}
              </div>
            );
          })}

          {focus && (
            <>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute z-[3] h-[30px] w-[30px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(255,214,140,0.85)]"
                style={{ left: `${focus.x}%`, top: `${focus.y}%`, boxShadow: "0 0 22px rgba(255,214,140,0.45)" }}
              />
              {/* 마우스를 가로채지 않는 미리보기 — 카드 밑에 가려진 옆 별에도 바로 올릴 수 있다 */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute z-[4] hidden w-[288px] overflow-hidden rounded-2xl border border-[rgba(169,192,255,0.28)] bg-[rgba(8,12,24,0.92)] shadow-[0_24px_60px_rgba(0,0,0,0.6)] md:block"
                style={{ left: `${focus.x}%`, top: `${focus.y}%`, transform: cardPos }}
              >
                <FocusCard cam={focus} preview />
              </div>
            </>
          )}
        </div>

        <div className="mx-auto -mt-4 hidden w-full max-w-[1328px] flex-wrap gap-5 text-[11px] tracking-[0.08em] text-[#93A0C4] sm:flex">
          <Legend color="#EAF2FF" glow="rgba(150,190,255,0.8)" text={`해안 · 포구 ${SKY_CAMERAS.filter((c) => c.group === "J" || c.group === "S").length}`} />
          <Legend color="#FFF1D6" glow="rgba(255,210,140,0.8)" text="한라산 5" />
          <Legend color="#FFE1A0" glow="rgba(255,190,90,0.8)" text="공항 1" />
          <span className="text-[#6F7BA0]">별에 마우스를 올리면 미리보기, 누르면 새 창 · 빈 곳을 누르거나 ESC로 닫기</span>
        </div>

        {focus ? (
          <div className="relative overflow-hidden rounded-2xl border border-[rgba(169,192,255,0.28)] bg-[rgba(8,12,24,0.92)] md:hidden">
            <FocusCard cam={focus} />
            <button
              type="button"
              aria-label="미리보기 닫기"
              onClick={() => setFocusId(null)}
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(3,5,10,0.72)] text-[#E8EEFF]"
            >
              <svg aria-hidden="true" width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 2l10 10M12 2L2 12" /></svg>
            </button>
          </div>
        ) : (
          <p className="text-center text-xs text-[#6F7BA0] md:hidden">별을 누르면 미리보기, 한 번 더 누르면 새 창이 열립니다</p>
        )}
      </section>

      <section id="cams" className="relative flex flex-col gap-8 px-5 pb-24 pt-24 md:px-14 md:pt-[120px]">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="flex flex-col gap-3">
            <p className="sky-mono text-xs tracking-[0.3em] text-[#8FB4FF]">ALL CAMERAS</p>
            <h2 className="sky-serif text-3xl font-extrabold text-[#F6F8FF] md:text-[40px]">지금 보이는 풍경</h2>
          </div>
          <div role="group" aria-label="지역 필터" className="flex flex-wrap gap-2.5">
            {FILTERS.map((f) => {
              const on = filter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setFilter(f.key)}
                  className={`h-11 rounded-full border px-5 text-sm font-medium ${on ? "border-[#F6F8FF] bg-[#F6F8FF] text-[#03050A]" : "border-[#2A3350] text-[#C3CEEE] hover:border-[#4A5578]"}`}
                >
                  {f.label} {count(f.key)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))" }}>
          {cards.map((c, i) => (
            <a
              key={c.id}
              href={watchUrl(c)}
              target={`funjeju_cctv_${c.id}`}
              onClick={(e) => { e.preventDefault(); openWatch(c); }}
              className="group relative block overflow-hidden rounded-2xl border border-[#1A2238] bg-[#0A0F1E] text-white"
              style={{ aspectRatio: "16 / 10" }}
            >
              {c.thumb ? (
                <Image
                  src={`/sky/cams/${c.id}.jpg`}
                  alt={`${c.name} 카메라 최근 화면`}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 25vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
              ) : (
                <div
                  className="sky-mono absolute inset-0 flex items-center justify-center text-[11px] tracking-[0.2em] text-[#5D6A8E]"
                  style={{ backgroundImage: "radial-gradient(circle at 30% 30%, rgba(143,180,255,0.10), transparent 60%)" }}
                >
                  화면 준비 중
                </div>
              )}
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{ background: "linear-gradient(180deg, rgba(3,5,10,0.35) 0%, rgba(3,5,10,0) 30%, rgba(3,5,10,0) 50%, rgba(3,5,10,0.86) 100%)" }}
              />
              <span className="sky-mono absolute left-3.5 top-3.5 flex items-center gap-1.5 rounded-full bg-[rgba(3,5,10,0.6)] px-2.5 py-1 text-[10px] tracking-[0.14em]">
                <span className={`h-1.5 w-1.5 rounded-full ${c.thumb ? "bg-[#7CF0C8]" : "bg-[#5D6A8E]"}`} />LIVE
              </span>
              <span className="sky-mono absolute right-4 top-[15px] text-[11px] tracking-[0.12em] text-white/70">{String(i + 1).padStart(2, "0")}</span>
              <div className="absolute inset-x-[18px] bottom-4 flex items-end justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className="sky-serif text-2xl font-extrabold leading-tight" style={{ textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}>{c.name}</span>
                  <span className="text-xs tracking-[0.04em] text-[rgba(232,238,255,0.82)]">{skyCameraSub(c)}</span>
                </div>
                <span className="text-xs text-[rgba(232,238,255,0.9)]">↗</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      <footer className="relative mt-auto flex flex-wrap justify-between gap-4 border-t border-[#141B2E] px-5 pb-11 pt-9 text-xs leading-[1.8] text-[#6F7BA0] md:px-14">
        <span>영상 제공 · 제주특별자치도 · 제주시 · 서귀포시 재난안전대책본부 · 한국공항공사</span>
        <span>펀제주 유튜브 @funjeju · 카드 사진은 각 카메라의 최근 캡처입니다</span>
      </footer>
    </div>
  );
}

function FocusCard({ cam, preview }: { cam: SkyCamera; preview?: boolean }) {
  return (
    <>
      <div className="relative bg-[#0B1020]" style={{ aspectRatio: "16 / 9" }}>
        {cam.thumb && (
          <Image src={`/sky/cams/${cam.id}.jpg`} alt={`${cam.name} 카메라 최근 화면`} fill sizes="288px" className="object-cover" />
        )}
        <span className="sky-mono absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-[rgba(3,5,10,0.72)] px-2.5 py-1 text-[10px] tracking-[0.14em]">
          <span className="sky-pulse h-1.5 w-1.5 rounded-full bg-[#7CF0C8]" />LIVE
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-3.5">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="sky-serif truncate text-[19px] font-extrabold text-[#F6F8FF]">{cam.name}</span>
          <span className="truncate text-xs text-[#93A0C4]">{skyCameraSub(cam)}</span>
        </div>
        {preview ? (
          <span className="shrink-0 text-[11px] text-[#93A0C4]">클릭하면 새 창 ↗</span>
        ) : (
          <button
            type="button"
            onClick={() => openWatch(cam)}
            className="inline-flex h-9 shrink-0 items-center rounded-full border border-[#A9C0FF] px-3.5 text-xs text-[#E8EEFF] hover:bg-white/5"
          >
            영상 보기 ↗
          </button>
        )}
      </div>
    </>
  );
}

function MailIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFE2A8" strokeWidth="1.6">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M4 7l8 6 8-6" />
    </svg>
  );
}

function Legend({ color, glow, text }: { color: string; glow: string; text: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px 2px ${glow}` }} />
      {text}
    </span>
  );
}
