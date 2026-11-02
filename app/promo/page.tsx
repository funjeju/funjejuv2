import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { JEJU_OUTLINE, JEJU_VIEWBOX } from "@/lib/sky/outline";
import { SkyFonts } from "@/components/sky/SkyFonts";
import { PROMO_CONTACT, PROMO_MAILTO } from "@/lib/sky/contact";

export const metadata: Metadata = {
  title: { absolute: "CCTV 설치하고 우리 업소 홍보하기 | 펀제주" },
  description:
    "뷰맛집은 쉬지 않습니다. 가게의 풍경을 365일 24시간 펀제주 유튜브와 funjeju.com으로 생중계해 드립니다. 장비는 사장님이, 송출은 펀제주가.",
  alternates: { canonical: "/promo" },
  openGraph: {
    title: "뷰맛집은 쉬지 않습니다 | 펀제주 CCTV 홍보",
    description: "가게의 풍경을 365일 24시간 생중계. 장비는 사장님이, 송출은 펀제주가.",
    url: "https://funjeju.com/promo",
    images: [{ url: "https://funjeju.com/sky/promo/udo-sunset.jpg", width: 1280, height: 720 }],
  },
};

// 상담 연락처는 lib/sky/contact.ts 한 곳에서 관리한다(메인 화면과 공용).
const CONTACT = PROMO_CONTACT;
const LIVE_CASE_URL = "https://www.youtube.com/watch?v=bc2Icv1PVVI";

const STATS = [
  { value: "1.19만", label: "펀제주 유튜브 구독자" },
  { value: "346", label: "채널에 쌓인 제주 영상" },
  { value: "53", label: "funjeju.com 실시간 카메라" },
  { value: "언론", label: "태풍 힌남노 중계 영상을 채널A 등 주요 언론에 제공" },
];

const OWNER_TASKS = ["카메라 달 자리 내어주기", "카메라 장비 구입과 설치", "가게의 전기와 인터넷 연결"];
const FUNJEJU_TASKS = ["뷰 포인트 컨설팅", "유튜브 라이브 · funjeju.com 송출 세팅", "24시간 송출 관리와 장애 복구", "업소 배너 제작과 노출"];

const MOMENTS = [
  { src: "/sky/promo/seongsan-moon.jpg", alt: "달이 떠오른 성산일출봉", title: "달이 뜬 성산일출봉", note: "밤 8시 49분, 아무도 찍으러 가지 않은 시간" },
  { src: "/sky/promo/meteor.jpg", alt: "펀제주 실시간 CCTV에 잡힌 유성우", title: "CCTV에 잡힌 유성우", note: "조회 2.8천, 채널 인기 영상" },
  { src: "/sky/promo/chagwido-sunset.jpg", alt: "차귀도 일몰", title: "차귀도 일몰", note: "매일 다른 색으로 저무는 서쪽 바다" },
  { src: "/sky/promo/baengnokdam-thaw.jpg", alt: "얼음이 녹으며 드러나는 한라산 백록담", title: "녹아내리는 백록담", note: "계절이 바뀌는 그 며칠" },
];

const FAQ = [
  { q: "어떤 카메라를 사야 하나요?", a: "상담 때 가게 위치와 뷰에 맞는 장비를 안내해 드립니다." },
  { q: "인터넷은 따로 필요한가요?", a: "가게의 인터넷 회선을 사용합니다. 송출 설정은 펀제주가 마칩니다." },
  { q: "송출이 끊기면요?", a: "펀제주가 24시간 지켜보고 복구합니다. 송출에 관한 기술적 책임은 펀제주에 있습니다." },
  { q: "비용은 어떻게 되나요?", a: "가게 상황에 맞춰 상담 때 안내해 드립니다." },
];

const GOLD = "linear-gradient(180deg, #FFD978, #F4B54A)";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <span className="sky-mono text-xs tracking-[0.3em] text-[#FFD58A]">{children}</span>;
}

function MailIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFE2A8" strokeWidth="1.6">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M4 7l8 6 8-6" />
    </svg>
  );
}

function Arrow() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 11h13M12 5l6 6-6 6" />
    </svg>
  );
}

export default function PromoPage() {
  return (
    <>
      <SkyFonts />
      <div className="sky-root flex min-h-screen flex-col bg-[#03050A] text-[#E8EEFF]">
        <header className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/5 bg-[rgba(3,5,10,0.55)] px-5 py-5 md:px-14">
          <Link href="/" className="flex items-center gap-4">
            <span className="sky-serif text-[21px] font-extrabold tracking-[0.24em] text-[#F4F6FF]">FUNJEJU</span>
            <span className="text-[13px] text-[#93A0C4]">← CCTV 별자리 지도</span>
          </Link>
          <a href="#apply" className="inline-flex h-11 items-center rounded-full border border-[rgba(255,206,120,0.6)] px-5 text-sm font-medium text-[#FFD978]">
            설치 상담 신청
          </a>
        </header>

        {/* HERO */}
        <section className="relative -mt-[89px] flex min-h-[780px] items-center overflow-hidden">
          <Image src="/sky/promo/udo-sunset.jpg" alt="펀제주 실시간 CCTV에 잡힌 우도 하늘 일몰" fill priority sizes="100vw" className="object-cover" />
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ background: "linear-gradient(90deg, rgba(3,5,10,0.92) 0%, rgba(3,5,10,0.62) 42%, rgba(3,5,10,0.08) 78%), linear-gradient(0deg, rgba(3,5,10,1) 0%, rgba(3,5,10,0) 28%)" }}
          />
          <div className="relative flex max-w-[760px] flex-col gap-7 px-5 pb-28 pt-40 md:px-14">
            <span className="sky-mono flex items-center gap-2 self-start rounded-full border border-white/15 bg-[rgba(3,5,10,0.55)] px-3 py-1.5 text-[11px] tracking-[0.18em]">
              <span className="sky-pulse h-[7px] w-[7px] rounded-full bg-[#7CF0C8]" />LIVE · 우도 하늘, 펀제주 CCTV
            </span>
            <h1 className="sky-serif text-[56px] font-extrabold leading-[1.06] tracking-[-0.02em] text-white md:text-[92px]">
              뷰맛집은<br />쉬지 않습니다.
            </h1>
            <p className="max-w-[560px] text-[17px] leading-[1.8] text-[#E3E8F6] md:text-[19px]">
              사장님 가게에서 보이는 그 풍경이, 365일 24시간 제주를 사랑하는 사람들에게 생중계됩니다.
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              <a href="#apply" className="sky-cta inline-flex h-16 items-center gap-3.5 rounded-full px-7 text-lg font-bold text-[#1A1204]" style={{ background: GOLD }}>
                설치 상담 신청하기 <Arrow />
              </a>
              <a href={LIVE_CASE_URL} className="inline-flex h-16 items-center rounded-full border border-white/40 px-6 text-base text-white">
                실제 송출 화면 보기
              </a>
            </div>
            <a href={PROMO_MAILTO} className="flex items-center gap-3 self-start rounded-2xl border border-[rgba(255,214,140,0.35)] bg-[rgba(3,5,10,0.55)] px-5 py-3.5">
              <MailIcon />
              <span className="flex flex-col">
                <span className="text-xs tracking-[0.12em] text-[#C9B98F]">메일로 바로 문의</span>
                <span className="sky-mono text-lg tracking-[0.02em] text-[#FFE2A8] md:text-xl">{CONTACT.email}</span>
              </span>
            </a>
          </div>
        </section>

        {/* STATS */}
        <section aria-label="펀제주 실적" className="px-5 pb-24 pt-10 md:px-14">
          <div className="grid border-y border-[#1A2238]" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            {STATS.map((s) => (
              <div key={s.label} className="flex flex-col gap-2 border-[#1A2238] px-7 py-8 [&:not(:last-child)]:border-b md:[&:not(:last-child)]:border-b-0 md:[&:not(:last-child)]:border-r">
                <span className="sky-serif text-[52px] font-extrabold text-[#F6F8FF]">{s.value}</span>
                <span className="text-sm leading-relaxed text-[#93A0C4]">{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="flex justify-center px-5 pb-28 pt-10 md:px-14">
          <p className="sky-serif max-w-[980px] text-center text-[30px] font-bold leading-[1.5] text-[#F6F8FF] md:text-[44px]">
            광고 사진은 한 순간을 보여줍니다.<br />
            <span className="text-[#FFD978]">CCTV는 모든 순간을 보여줍니다.</span>
          </p>
        </section>

        {/* HOW IT WORKS */}
        <section className="flex flex-col gap-10 px-5 pb-28 md:px-14">
          <div className="flex flex-col gap-3">
            <Eyebrow>HOW IT WORKS</Eyebrow>
            <h2 className="sky-serif text-4xl font-extrabold text-[#F6F8FF] md:text-5xl">세 걸음이면 별이 됩니다</h2>
          </div>
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
            <Step
              visual={
                <div className="relative h-full w-full" style={{ backgroundColor: "#060A16", backgroundImage: "radial-gradient(ellipse 70% 60% at 50% 100%, rgba(64,86,190,0.25), transparent 70%)" }}>
                  <svg viewBox="0 0 320 200" aria-hidden="true" className="absolute inset-0 h-full w-full">
                    <path d="M160 168 L40 40 A170 170 0 0 1 280 40 Z" fill="rgba(255,214,120,0.08)" stroke="#FFD978" strokeOpacity="0.55" strokeDasharray="4 6" />
                    <path d="M70 70 A130 130 0 0 1 250 70" fill="none" stroke="#FFD978" strokeOpacity="0.25" />
                    <path d="M100 104 A85 85 0 0 1 220 104" fill="none" stroke="#FFD978" strokeOpacity="0.18" />
                    <rect x="146" y="160" width="28" height="18" rx="4" fill="#0B1020" stroke="#FFD978" />
                    <circle cx="160" cy="169" r="4" fill="#FFD978" />
                    <circle cx="112" cy="58" r="2" fill="#EAF2FF" /><circle cx="208" cy="48" r="1.6" fill="#EAF2FF" /><circle cx="248" cy="88" r="1.2" fill="#EAF2FF" />
                  </svg>
                  <span className="sky-mono absolute left-[18px] top-4 text-[11px] tracking-[0.16em] text-[#FFD58A]">VIEW POINT</span>
                </div>
              }
              tag="STEP 1 · 함께" title="뷰 포인트 상의"
              body="가게에서 가장 아름다운 방향과 설치 위치를 펀제주가 함께 보고 정합니다."
            />
            <Step
              visual={<Image src="/sky/promo/install-hyeopjae.jpg" alt="펀제주 CCTV 협재 비선루 설치 과정" fill sizes="(max-width: 1000px) 100vw, 33vw" className="object-cover" />}
              tag="STEP 2 · 사장님" title="장비 · 설치"
              body="카메라 장비와 설치는 업소에서 맡습니다. 어떤 장비가 맞는지는 펀제주가 안내합니다."
            />
            <Step
              gold
              visual={
                <>
                  <Image src="/sky/promo/incafe-onthebeach.jpg" alt="펀제주 유튜브로 송출 중인 카페 앞 바다" fill sizes="(max-width: 1000px) 100vw, 33vw" className="object-cover" />
                  <span className="sky-mono absolute left-3.5 top-3.5 flex items-center gap-1.5 rounded-full bg-[rgba(3,5,10,0.7)] px-2.5 py-1 text-[10px] tracking-[0.16em]">
                    <span className="sky-pulse h-1.5 w-1.5 rounded-full bg-[#FF5A5A]" />ON AIR 24/7
                  </span>
                </>
              }
              tag="STEP 3 · 펀제주" title="365일 24시간 송출"
              body="유튜브 라이브와 funjeju.com 송출, 끊김 대응까지. 기술은 전부 펀제주가 책임집니다."
            />
          </div>
        </section>

        {/* ROLES */}
        <section className="px-5 pb-28 md:px-14">
          <div className="grid overflow-hidden rounded-3xl border border-[#1A2238]" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
            <div className="flex flex-col gap-5 p-8 md:p-11">
              <span className="text-[13px] tracking-[0.16em] text-[#93A0C4]">사장님이 하실 일</span>
              <ol className="flex flex-col gap-4 text-[17px] leading-relaxed">
                {OWNER_TASKS.map((t, i) => (
                  <li key={t} className="flex gap-3.5"><span className="text-[#93A0C4]">0{i + 1}</span>{t}</li>
                ))}
              </ol>
            </div>
            <div className="flex flex-col gap-5 p-8 md:p-11" style={{ backgroundImage: "radial-gradient(ellipse 80% 80% at 100% 0%, rgba(255,196,92,0.10), transparent 70%)" }}>
              <span className="text-[13px] tracking-[0.16em] text-[#FFD58A]">펀제주가 책임질 일</span>
              <ol className="flex flex-col gap-4 text-[17px] leading-relaxed text-white">
                {FUNJEJU_TASKS.map((t, i) => (
                  <li key={t} className="flex gap-3.5"><span className="text-[#FFD58A]">0{i + 1}</span>{t}</li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* EXPOSURE */}
        <section className="flex flex-col gap-10 px-5 pb-28 md:px-14">
          <div className="flex flex-col gap-3">
            <Eyebrow>EXPOSURE</Eyebrow>
            <h2 className="sky-serif text-4xl font-extrabold text-[#F6F8FF] md:text-5xl">우리 가게는 이렇게 보입니다</h2>
          </div>
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
            <Exposure title="영상 위 업소 배너" body="라이브 화면 아래에 업소명과 위치, 한 줄 소개가 늘 함께 나갑니다.">
              <Image src="/sky/promo/incafe-onthebeach.jpg" alt="라이브 화면 하단 업소 배너 예시" fill sizes="(max-width: 1000px) 100vw, 33vw" className="object-cover" />
              <div className="absolute inset-x-3 bottom-3 flex items-center gap-3 rounded-xl border border-[rgba(255,206,120,0.45)] bg-[rgba(3,5,10,0.82)] px-3.5 py-2.5">
                <span className="flex h-[34px] w-[34px] items-center justify-center rounded-lg bg-[#FFD978] text-sm font-extrabold text-[#1A1204]">IN</span>
                <div className="flex flex-col">
                  <span className="text-[13px] font-bold text-white">인카페 온더비치</span>
                  <span className="text-[11px] text-[#C9D2EC]">구좌읍 한동리 · 바다 앞 카페</span>
                </div>
              </div>
            </Exposure>
            <Exposure title="funjeju.com의 별 하나" body="제주 별자리 지도에 금색 별로 뜨고, 카드에서 가게로 바로 연결됩니다.">
              <div className="absolute inset-0" style={{ backgroundColor: "#03050A", backgroundImage: "radial-gradient(ellipse 70% 60% at 70% 20%, rgba(64,86,190,0.25), transparent 70%)" }} />
              <svg viewBox={JEJU_VIEWBOX} aria-hidden="true" className="absolute left-[6%] top-[10%] h-[80%] w-[88%]">
                <path className="sky-breathe" d={JEJU_OUTLINE} fill="#5B7CFF" stroke="#A9C0FF" strokeWidth="2" />
                <path className="sky-comet" d={JEJU_OUTLINE} pathLength={1000} fill="none" stroke="#E6EEFF" strokeWidth="3" strokeDasharray="70 930" />
              </svg>
              {[[48, 22, 0], [30, 40, 1.2], [62, 72, 2.1]].map(([x, y, d]) => (
                <span key={x} className="sky-tw absolute h-1 w-1 rounded-full bg-[#EAF2FF]" style={{ left: `${x}%`, top: `${y}%`, boxShadow: "0 0 8px 2px rgba(150,190,255,0.85)", animationDelay: `${d}s` }} />
              ))}
              <span className="absolute left-[74.5%] top-[17%] h-[26px] w-[26px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#FFD978]" style={{ boxShadow: "0 0 20px rgba(255,214,140,0.6)" }} />
              <span className="absolute left-[74.5%] top-[17%] h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FFE7A8]" style={{ boxShadow: "0 0 10px 3px rgba(255,200,100,0.9)" }} />
              <span className="absolute left-[74.5%] top-[17%] -translate-x-1/2 translate-y-[22px] whitespace-nowrap rounded-lg border border-[rgba(255,206,120,0.45)] bg-[rgba(8,12,24,0.9)] px-2.5 py-1.5 text-[11px] text-[#FFE7A8]">우리 가게 ★</span>
            </Exposure>
            <Exposure title="유튜브 라이브" body="라이브 제목, 설명란, 고정 댓글에 가게 이름과 지도 링크가 들어갑니다.">
              <div className="absolute inset-0 flex flex-col gap-3 bg-[#0B0F1A] p-5">
                <div className="flex items-center gap-2.5">
                  <span className="rounded bg-[#CC0000] px-2 py-0.5 text-[11px] font-bold text-white">● LIVE</span>
                  <span className="truncate text-sm font-bold text-white">[실시간] 제주 구좌 바다 · 인카페 온더비치</span>
                </div>
                <span className="text-xs text-[#8A93AB]">펀제주 · 구독자 1.19만</span>
                <div className="mt-1 flex flex-col gap-2 rounded-xl bg-[#141A2A] p-3.5 text-xs leading-relaxed text-[#C9D2EC]">
                  <span>이 풍경을 보여주는 곳 · 인카페 온더비치</span>
                  <span>제주시 구좌읍 한동리 · 지도 보기</span>
                  <span className="text-[#8A93AB]">고정 댓글 · 영업시간과 메뉴 안내</span>
                </div>
              </div>
            </Exposure>
          </div>
        </section>

        {/* CASE */}
        <section className="px-5 pb-28 md:px-14">
          <div className="flex flex-wrap overflow-hidden rounded-3xl border border-[#1A2238]">
            <div className="relative min-h-[320px] flex-[1_1_560px] md:min-h-[420px]">
              <Image src="/sky/promo/incafe-onthebeach.jpg" alt="제주시 구좌읍 한동리 인카페 온더비치 앞 바다 CCTV 화면" fill sizes="(max-width: 1000px) 100vw, 60vw" className="object-cover" />
            </div>
            <div className="flex flex-[1_1_360px] flex-col justify-center gap-4 bg-[#070B16] px-8 py-12 md:px-12 md:py-14">
              <Eyebrow>CASE · 구좌읍 한동리</Eyebrow>
              <h3 className="sky-serif text-[34px] font-extrabold text-[#F6F8FF] md:text-[40px]">인카페 온더비치</h3>
              <p className="text-base leading-[1.85] text-[#B7C2E2]">
                카페 앞 바다가 지금 이 순간에도 펀제주 유튜브로 나가고 있습니다. 날씨가 궁금한 여행자가 화면을 켤 때마다 가게 이름을 함께 봅니다.
              </p>
              <a href={LIVE_CASE_URL} className="inline-flex h-12 items-center self-start rounded-full border border-[#A9C0FF] px-5 text-sm">라이브 보러 가기 ↗</a>
            </div>
          </div>
        </section>

        {/* MOMENTS */}
        <section className="flex flex-col gap-10 px-5 pb-28 md:px-14">
          <div className="flex flex-col gap-3">
            <Eyebrow>MOMENTS</Eyebrow>
            <h2 className="sky-serif text-4xl font-extrabold text-[#F6F8FF] md:text-5xl">CCTV만 담을 수 있는 순간</h2>
          </div>
          <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            {MOMENTS.map((m) => (
              <figure key={m.src} className="relative overflow-hidden rounded-[18px]" style={{ aspectRatio: "3 / 4" }}>
                <Image src={m.src} alt={m.alt} fill sizes="(max-width: 700px) 100vw, 25vw" className="object-cover" />
                <figcaption className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-5" style={{ background: "linear-gradient(0deg, rgba(3,5,10,0.9), rgba(3,5,10,0))" }}>
                  <span className="sky-serif text-xl font-extrabold text-white">{m.title}</span>
                  <span className="text-xs text-[#C9D2EC]">{m.note}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="grid gap-12 px-5 pb-28 md:px-14" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
          <div className="flex flex-col gap-3">
            <Eyebrow>FAQ</Eyebrow>
            <h2 className="sky-serif text-[34px] font-extrabold leading-tight text-[#F6F8FF] md:text-[40px]">자주 묻는 질문</h2>
          </div>
          <dl className="flex flex-col border-b border-[#1A2238]">
            {FAQ.map((f) => (
              <div key={f.q} className="flex flex-col gap-2.5 border-t border-[#1A2238] py-6">
                <dt className="text-lg font-bold text-[#F6F8FF]">{f.q}</dt>
                <dd className="text-[15px] leading-[1.75] text-[#B7C2E2]">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* APPLY */}
        <section
          id="apply"
          className="relative overflow-hidden border-t border-[#141B2E] px-5 py-24 md:px-14 md:py-[120px]"
          style={{ backgroundColor: "#04060D", backgroundImage: "radial-gradient(ellipse 55% 60% at 80% 30%, rgba(64,86,190,0.25), transparent 70%), radial-gradient(ellipse 40% 50% at 10% 90%, rgba(255,196,92,0.08), transparent 70%)" }}
        >
          <svg viewBox={JEJU_VIEWBOX} aria-hidden="true" className="pointer-events-none absolute -right-[6%] top-1/2 w-[64%] -translate-y-1/2 opacity-90">
            <path className="sky-breathe" d={JEJU_OUTLINE} fill="#5B7CFF" stroke="#A9C0FF" strokeWidth="1.2" />
            <path className="sky-comet" d={JEJU_OUTLINE} pathLength={1000} fill="none" stroke="#FFE7A8" strokeWidth="2.4" strokeDasharray="60 940" />
          </svg>
          <div className="relative grid items-center gap-14" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
            <div className="flex flex-col gap-5">
              <span className="text-sm tracking-[0.16em] text-[#FFD58A]">뷰맛집 사장님께</span>
              <h2 className="sky-serif text-[38px] font-extrabold leading-[1.2] text-white md:text-[54px]">
                제주를 사랑하는<br />예비 손님들에게,<br />사장님의 풍경을<br />별처럼 띄워 드립니다.
              </h2>
            </div>
            <div className="flex flex-col gap-4 rounded-3xl border border-[rgba(255,206,120,0.35)] bg-[rgba(8,12,24,0.88)] p-8 md:p-9">
              <span className="sky-serif text-2xl font-extrabold text-[#F6F8FF]">설치 상담</span>
              <p className="text-[15px] leading-[1.75] text-[#B7C2E2]">가게 이름과 위치, 가게에서 보이는 풍경을 알려 주시면 뷰 포인트부터 함께 봐 드립니다.</p>
              <a href={PROMO_MAILTO} className="mt-2 flex flex-col gap-1 rounded-2xl border border-[rgba(255,214,140,0.45)] bg-[rgba(255,214,140,0.06)] px-6 py-5 hover:bg-[rgba(255,214,140,0.1)]">
                <span className="flex items-center gap-2 text-xs tracking-[0.12em] text-[#C9B98F]"><MailIcon />메일 문의</span>
                <span className="sky-mono break-all text-[22px] text-[#FFE2A8] md:text-2xl">{CONTACT.email}</span>
              </a>
              <a
                href={PROMO_MAILTO}
                className="sky-cta flex h-[60px] items-center justify-between rounded-full px-7 text-[17px] font-bold text-[#1A1204]"
                style={{ background: GOLD }}
              >
                <span>메일 보내기</span>
                <Arrow />
              </a>
              <a
                href={`tel:${CONTACT.phone.replace(/-/g, "")}`}
                className="flex h-[52px] items-center justify-between rounded-full border border-white/20 px-7 text-base text-[#E8EEFF]"
              >
                <span>전화 상담 {CONTACT.phone}</span>
                <Arrow />
              </a>
            </div>
          </div>
        </section>

        <footer className="flex flex-wrap justify-between gap-4 border-t border-[#141B2E] px-5 pb-11 pt-9 text-xs leading-[1.8] text-[#6F7BA0] md:px-14">
          <span>FUNJEJU · 제주 실시간 CCTV · youtube.com/@funjeju</span>
          <span>이미지는 모두 펀제주 CCTV와 유튜브 채널 영상에서 가져왔습니다.</span>
        </footer>
      </div>
    </>
  );
}

function Step({ visual, tag, title, body, gold }: { visual: React.ReactNode; tag: string; title: string; body: string; gold?: boolean }) {
  return (
    <div className={`flex flex-col overflow-hidden rounded-[20px] border ${gold ? "border-[rgba(255,206,120,0.4)] bg-[#0C0B08]" : "border-[#1A2238] bg-[#070B16]"}`}>
      <div className="relative" style={{ aspectRatio: "16 / 10" }}>{visual}</div>
      <div className="flex flex-col gap-2.5 p-7">
        <span className="text-xs tracking-[0.12em] text-[#FFD58A]">{tag}</span>
        <span className="sky-serif text-[26px] font-extrabold text-[#F6F8FF]">{title}</span>
        <span className="text-[15px] leading-[1.75] text-[#B7C2E2]">{body}</span>
      </div>
    </div>
  );
}

function Exposure({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="relative overflow-hidden rounded-[18px] border border-[#1A2238]" style={{ aspectRatio: "16 / 10" }}>{children}</div>
      <div className="flex flex-col gap-1.5">
        <span className="sky-serif text-[22px] font-extrabold text-[#F6F8FF]">{title}</span>
        <span className="text-sm leading-[1.7] text-[#B7C2E2]">{body}</span>
      </div>
    </div>
  );
}
