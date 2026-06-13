import Link from "next/link";
import Image from "next/image";
import { PageHeader } from "@/components/common/PageHeader";
import type { Content } from "@/types/content";

/**
 * 모닝브리핑 매거진 본문 — /daily/[slug](발행)와 어드민 미리보기에서 공용으로 쓴다.
 * 사진이 있으면 표지·카드에 제목을 레이어로 올린 매거진 스타일로 렌더.
 */
export function BriefingArticle({ content: c }: { content: Content }) {
  return (
    <>
      {c.coverImage ? (
        // 매거진 표지 — 사진 위에 제목 레이어
        <div className="relative aspect-[3/4] max-h-[70vh] overflow-hidden bg-gray-900 md:aspect-[16/10] md:rounded-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.coverImage} alt={c.title} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/40" />
          <div className="absolute inset-x-0 top-0 flex items-center gap-2 p-5">
            <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-black tracking-wide text-brand-navy">🌅 AI데일리제주</span>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-5 md:p-7">
            <h1 className="text-2xl font-black leading-tight text-white drop-shadow-lg md:text-4xl">{c.title}</h1>
            <p className="mt-2 text-sm font-medium text-white/85 drop-shadow md:text-base">{c.subtitle}</p>
          </div>
        </div>
      ) : (
        <PageHeader title={c.title} subtitle={c.subtitle} emoji="🌅" />
      )}

      <div className="px-4 md:px-0">
        <p className="mt-1 text-sm leading-7 text-text-primary">{c.intro}</p>

        <div className="mt-6 space-y-3">
          {c.sections.map((s, i) => {
            const isNews = !!s.sourceUrl;
            const time = s.newsPublishedAt
              ? new Date(s.newsPublishedAt).toLocaleString("ko-KR", {
                  timeZone: "Asia/Seoul",
                  month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                })
              : null;
            return (
              <section key={i} className="overflow-hidden rounded-2xl border border-border-soft bg-bg-card shadow-card">
                {/* 뉴스 카드 — 사진이 있으면 매거진형(사진 위 헤드라인), 없으면 텍스트형 */}
                {isNews ? (
                  s.image ? (
                    <div>
                      <div className="relative aspect-[16/10] bg-gray-900">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={s.image} alt={s.heading} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/10" />
                        {s.category && (
                          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black text-brand-navy">
                            {s.category}
                          </span>
                        )}
                        <h2 className="absolute inset-x-0 bottom-0 p-4 text-lg font-black leading-snug text-white drop-shadow-lg md:text-xl">
                          {s.heading}
                        </h2>
                      </div>
                      <div className="space-y-2 p-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {s.source && <span className="text-[10px] font-semibold text-text-secondary">{s.source}</span>}
                          {time && <span className="text-[10px] text-text-secondary/70">· {time}</span>}
                        </div>
                        <p className="text-[13px] leading-6 text-text-secondary">{s.body}</p>
                        <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-block text-[12px] font-bold text-brand-orange hover:underline">
                          원문 보기 →
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 p-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {s.category && (
                          <span className="rounded-full bg-brand-navy/10 px-2 py-0.5 text-[10px] font-bold text-brand-navy">
                            {s.category}
                          </span>
                        )}
                        {s.source && <span className="text-[10px] font-semibold text-text-secondary">{s.source}</span>}
                        {time && <span className="text-[10px] text-text-secondary/70">· {time}</span>}
                      </div>
                      <h2 className="text-sm font-black leading-snug text-text-primary md:text-base">{s.heading}</h2>
                      <p className="text-[13px] leading-6 text-text-secondary">{s.body}</p>
                      <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-block text-[12px] font-bold text-brand-orange hover:underline">
                        원문 보기 →
                      </a>
                    </div>
                  )
                ) : (
                  // 레거시(맛집 카드) 폴백
                  <div className="flex gap-3 p-4">
                    {s.image && (
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-bg-secondary">
                        <Image src={s.image} alt={s.heading} fill sizes="80px" className="object-cover" loading="lazy" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h2 className="text-sm font-black text-text-primary">{s.heading}</h2>
                      <p className="mt-1 text-[13px] leading-6 text-text-secondary">{s.body}</p>
                      {s.restaurantId && (
                        <Link href={`/food/${s.restaurantId}`} className="mt-1.5 inline-block text-[12px] font-bold text-brand-orange">
                          맛집 상세 보기 →
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <nav className="mt-8 grid grid-cols-3 gap-2 pb-8">
          <Link href="/daily" className="rounded-2xl border border-border-soft bg-bg-card py-3 text-center text-[12px] font-semibold text-text-primary hover:bg-bg-secondary transition-colors">🌅 데일리 더보기</Link>
          <Link href="/webzine" className="rounded-2xl border border-border-soft bg-bg-card py-3 text-center text-[12px] font-semibold text-text-primary hover:bg-bg-secondary transition-colors">📖 제주 웹진</Link>
          <Link href="/food" className="rounded-2xl border border-border-soft bg-bg-card py-3 text-center text-[12px] font-semibold text-text-primary hover:bg-bg-secondary transition-colors">🍽️ 도민맛집</Link>
        </nav>
      </div>
    </>
  );
}
