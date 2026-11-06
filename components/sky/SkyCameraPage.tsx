import Image from "next/image";
import Link from "next/link";
import type { CctvLocation } from "@/types/cctv-location";
import { VIEW_TYPE_META } from "@/types/cctv-location";
import { SKY_CAMERAS, skyCameraSub, type SkyCamera } from "@/lib/sky/cameras";
import { mungCourseUrl, nearestMungCourse } from "@/lib/sky/mung";
import { SkyWatchButton } from "./SkyWatchButton";

const SITE = "https://funjeju.com";

const CREDIT: Record<SkyCamera["source"]["kind"], string> = {
  jejusi: "제주시 재난안전대책본부",
  hls: "제주특별자치도 한라산국립공원",
  http: "제주특별자치도 · 서귀포시 재난안전대책본부 · 한국공항공사",
};

/**
 * 카메라별 페이지 (/cctv/{id}) — 옛 주소 그대로, 별자리 디자인.
 * 위쪽은 화면(썸네일·영상 보기), 아래쪽은 검색용 정보(소개·날씨 특징·FAQ·가는 길·주변).
 * 글은 화면에 보이게 둔다(숨긴 글은 검색엔진이 스팸으로 본다). FAQ 는 접힘으로.
 */
export function SkyCameraPage({ cam, loc }: { cam: SkyCamera; loc: CctvLocation | null }) {
  const sub = skyCameraSub(cam);
  const region = loc?.region ?? sub;
  const view = loc ? VIEW_TYPE_META[loc.viewType] : null;
  const course = nearestMungCourse(cam);
  const nearby = (loc?.nearby ?? [])
    .map((id) => SKY_CAMERAS.find((c) => c.id === id))
    .filter((c): c is SkyCamera => !!c)
    .slice(0, 4);
  const faq = loc?.faq ?? [];
  const url = `${SITE}/cctv/${cam.id}`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "펀제주 제주 실시간 CCTV", item: SITE },
        { "@type": "ListItem", position: 2, name: `${cam.name} 실시간 CCTV`, item: url },
      ],
    },
    loc?.lat && loc?.lng
      ? {
          "@context": "https://schema.org",
          "@type": "Place",
          name: cam.name,
          address: { "@type": "PostalAddress", addressRegion: "제주특별자치도", addressLocality: region },
          geo: { "@type": "GeoCoordinates", latitude: loc.lat, longitude: loc.lng },
          url,
        }
      : null,
    faq.length
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        }
      : null,
  ].filter(Boolean);

  return (
    <div
      className="sky-root flex min-h-screen flex-col text-[#E8EEFF]"
      style={{
        backgroundColor: "#03050A",
        backgroundImage: "radial-gradient(ellipse 60% 40% at 80% 0%, rgba(64,86,190,0.18), transparent 70%)",
      }}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="flex flex-wrap items-center justify-between gap-4 px-5 py-6 md:px-14">
        <Link href="/" className="flex items-center gap-4">
          <span className="sky-serif text-[22px] font-extrabold tracking-[0.24em] text-[#F4F6FF]">FUNJEJU</span>
          <span className="hidden h-[18px] w-px bg-[#2A3350] sm:block" />
          <span className="hidden text-[13px] tracking-[0.08em] text-[#93A0C4] sm:inline">제주 실시간 CCTV</span>
        </Link>
        <nav aria-label="경로" className="text-[13px] text-[#93A0C4]">
          <Link href="/" className="hover:text-white">별자리 지도</Link>
          <span className="mx-2 text-[#4A5578]">›</span>
          <span className="text-[#E8EEFF]">{cam.name}</span>
        </nav>
      </header>

      {/* 위쪽 — 화면 */}
      <section className="grid gap-8 px-5 pb-16 pt-6 md:grid-cols-[1.35fr_1fr] md:items-center md:px-14 md:pt-10">
        <div className="relative overflow-hidden rounded-[22px] border border-[#1A2238] bg-[#0A0F1E]" style={{ aspectRatio: "16 / 9" }}>
          {cam.thumb ? (
            <Image src={`/sky/cams/${cam.id}.jpg`} alt={`${cam.name} 실시간 CCTV 최근 화면`} fill priority sizes="(max-width: 768px) 100vw, 58vw" className="object-cover" />
          ) : (
            <div className="sky-mono absolute inset-0 flex items-center justify-center text-xs tracking-[0.2em] text-[#5D6A8E]">화면 준비 중</div>
          )}
          <div aria-hidden="true" className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(3,5,10,0.25), rgba(3,5,10,0) 40%, rgba(3,5,10,0.55))" }} />
          <span className="sky-mono absolute left-4 top-4 z-[2] flex items-center gap-1.5 rounded-full bg-[rgba(3,5,10,0.65)] px-3 py-1 text-[11px] tracking-[0.16em]">
            <span className="sky-pulse h-1.5 w-1.5 rounded-full bg-[#7CF0C8]" />LIVE
          </span>
          <SkyWatchButton id={cam.id} variant="cover" />
        </div>

        <div className="flex flex-col gap-5">
          <p className="sky-mono text-xs tracking-[0.28em] text-[#8FB4FF]">{region}</p>
          <h1 className="sky-serif text-[40px] font-extrabold leading-[1.12] tracking-[-0.01em] text-[#F6F8FF] md:text-[56px]">
            {cam.name}<br />실시간 CCTV
          </h1>
          <p className="text-base leading-[1.8] text-[#B7C2E2]">
            지금 {cam.name}의 바다와 하늘을 실시간으로 확인하세요. {view ? `${view.label}을 비추는 카메라로, ` : ""}날씨·파도·바람을 영상으로 바로 봅니다.
          </p>
          <div className="flex flex-wrap gap-3">
            <SkyWatchButton id={cam.id} />
            <Link href="/#sky" className="inline-flex h-14 items-center rounded-full border border-white/20 px-6 text-[15px] text-[#E8EEFF] hover:border-white/40">
              별자리 지도에서 보기
            </Link>
          </div>
          {loc?.checkPoints?.length ? (
            <div className="mt-2 flex flex-col gap-2.5 rounded-2xl border border-[#1A2238] bg-[rgba(8,12,24,0.6)] p-5">
              <span className="text-xs tracking-[0.14em] text-[#8FB4FF]">이 화면으로 확인할 수 있는 것</span>
              <ul className="flex flex-col gap-1.5 text-sm leading-relaxed text-[#D8DEF0]">
                {loc.checkPoints.map((p) => (
                  <li key={p} className="flex gap-2"><span className="text-[#7CF0C8]">·</span>{p}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      {/* 근처 숲길 (제주멍) */}
      <section className="px-5 pb-16 md:px-14">
        <a
          href={mungCourseUrl(course.id, "cctv_page", cam.id)}
          target="_blank"
          rel="noopener"
          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[rgba(159,227,190,0.35)] bg-[#071410] px-6 py-5 hover:border-[rgba(159,227,190,0.6)]"
        >
          <span className="flex flex-col gap-1">
            <span className="sky-mono text-[11px] tracking-[0.22em] text-[#9FE3BE]">JEJUMUNG · 근처 숲길</span>
            <span className="text-[17px] font-bold text-white">{cam.name} 근처에서 멍때리기 · {course.title} {course.minutes}분</span>
            <span className="text-[13px] text-[#8FB7A2]">{course.place} · 실제 제주 숲길 영상을 천천히 걷고 해먹에서 쉬어 가요</span>
          </span>
          <span className="inline-flex h-11 items-center rounded-full bg-[#9FE3BE] px-5 text-sm font-bold text-[#06140D]">제주멍 산책 ↗</span>
        </a>
      </section>

      {/* 아래쪽 — 정보 (검색용 글) */}
      <div className="border-t border-[#141B2E] bg-[#04060C]">
        <div className="mx-auto grid max-w-[1328px] gap-10 px-5 py-16 md:grid-cols-[1.4fr_1fr] md:px-14">
          <div className="flex flex-col gap-10">
            {loc?.about && (
              <section className="flex flex-col gap-3">
                <h2 className="sky-serif text-2xl font-extrabold text-[#F6F8FF]">{loc.formal} 소개</h2>
                <p className="text-[15px] leading-[1.9] text-[#C3CEEE]">{loc.about}</p>
              </section>
            )}
            {loc?.weatherNote && (
              <section className="flex flex-col gap-3">
                <h2 className="sky-serif text-2xl font-extrabold text-[#F6F8FF]">{loc.formal} 날씨 특징</h2>
                <p className="text-[15px] leading-[1.9] text-[#C3CEEE]">{loc.weatherNote}</p>
              </section>
            )}
            {faq.length > 0 && (
              <section className="flex flex-col gap-3">
                <h2 className="sky-serif text-2xl font-extrabold text-[#F6F8FF]">자주 묻는 질문</h2>
                <div className="flex flex-col border-b border-[#1A2238]">
                  {faq.map((f) => (
                    <details key={f.q} className="group border-t border-[#1A2238] py-4">
                      <summary className="cursor-pointer list-none text-[15px] font-bold text-[#F6F8FF] marker:hidden">
                        <span className="mr-2 text-[#8FB4FF] group-open:rotate-90">›</span>{f.q}
                      </summary>
                      <p className="mt-2.5 pl-5 text-[14px] leading-[1.8] text-[#B7C2E2]">{f.a}</p>
                    </details>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="flex flex-col gap-8">
            {loc?.access && (
              <section className="flex flex-col gap-2.5">
                <h2 className="text-sm tracking-[0.14em] text-[#8FB4FF]">가는 길</h2>
                <p className="text-[14px] leading-[1.8] text-[#C3CEEE]">{loc.access}</p>
              </section>
            )}
            {loc?.nearbySpots?.length ? (
              <section className="flex flex-col gap-2.5">
                <h2 className="text-sm tracking-[0.14em] text-[#8FB4FF]">{loc.formal} 근처 가볼만한 곳</h2>
                <ul className="flex flex-col gap-2 text-[14px] text-[#D8DEF0]">
                  {loc.nearbySpots.map((s) => (
                    <li key={s.name} className="flex flex-wrap justify-between gap-2 border-b border-[#10162A] pb-2">
                      <span>{s.name} <span className="text-[#6F7BA0]">· {s.type}</span></span>
                      <span className="text-[#93A0C4]">{s.distance}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            <section className="flex flex-col gap-2.5">
              <h2 className="text-sm tracking-[0.14em] text-[#8FB4FF]">영상 제공</h2>
              <p className="text-[13px] leading-[1.8] text-[#93A0C4]">{CREDIT[cam.source.kind]} 공공 CCTV를 그대로 보여줍니다. 펀제주는 영상을 저장하거나 가공하지 않습니다.</p>
            </section>
          </aside>
        </div>

        {nearby.length > 0 && (
          <section className="mx-auto flex max-w-[1328px] flex-col gap-5 px-5 pb-20 md:px-14">
            <h2 className="sky-serif text-2xl font-extrabold text-[#F6F8FF]">{cam.name} 근처 실시간 CCTV</h2>
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
              {nearby.map((c) => (
                <Link key={c.id} href={`/cctv/${c.id}`} className="group relative block overflow-hidden rounded-2xl border border-[#1A2238] bg-[#0A0F1E]" style={{ aspectRatio: "16 / 10" }}>
                  {c.thumb && (
                    <Image src={`/sky/cams/${c.id}.jpg`} alt={`${c.name} 실시간 CCTV`} fill sizes="(max-width: 640px) 100vw, 25vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                  )}
                  <div aria-hidden="true" className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(3,5,10,0) 40%, rgba(3,5,10,0.85))" }} />
                  <div className="absolute inset-x-4 bottom-3 flex flex-col gap-0.5">
                    <span className="sky-serif text-xl font-extrabold text-white">{c.name}</span>
                    <span className="text-xs text-[rgba(232,238,255,0.8)]">{skyCameraSub(c)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      <footer className="flex flex-wrap justify-between gap-4 border-t border-[#141B2E] px-5 pb-11 pt-9 text-xs leading-[1.8] text-[#6F7BA0] md:px-14">
        <Link href="/" className="hover:text-white">← 펀제주 제주 실시간 CCTV 전체 보기</Link>
        <span>{cam.name} 실시간 CCTV · {region}</span>
      </footer>
    </div>
  );
}
