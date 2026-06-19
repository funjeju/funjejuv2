import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/common/PageHeader";
import { GUIDES, GUIDE_SLUGS, getGuide } from "@/lib/guides";

const BASE = "https://funjeju.com";

export function generateStaticParams() {
  return GUIDE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return { title: "가이드를 찾을 수 없습니다 | funjeju" };
  const url = `${BASE}/guide/${guide.slug}`;
  return {
    title: guide.seoTitle,
    description: guide.description,
    keywords: guide.keywords,
    alternates: { canonical: url },
    openGraph: {
      title: guide.seoTitle,
      description: guide.description,
      url,
      type: "article",
    },
  };
}

export default async function GuideDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  // JSON-LD: FAQPage (구글 리치결과) — 사실 그대로의 Q/A만
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: guide.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  // 같은 가이드 허브 내 다른 문서 (내부 링크 그래프)
  const others = GUIDES.filter((g) => g.slug !== guide.slug).slice(0, 4);

  return (
    <div className="mx-auto max-w-3xl px-0 md:px-4 md:py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <PageHeader title={guide.title} subtitle={guide.description} emoji={guide.emoji} />

      <article className="px-4 md:px-0">
        <p className="text-[13px] leading-7 text-text-primary md:text-[15px]">{guide.intro}</p>

        {guide.sections.map((s) => (
          <section key={s.heading} className="mt-7">
            <h2 className="text-base font-black text-text-primary md:text-lg">{s.heading}</h2>
            {s.body.map((p, i) => (
              <p
                key={i}
                className="mt-2 text-[13px] leading-7 text-text-secondary md:text-[14px]"
              >
                {p}
              </p>
            ))}
          </section>
        ))}

        {/* 기능 바로가기 (양방향 내부링크) */}
        {guide.href && (
          <Link
            href={guide.href}
            className="mt-8 inline-flex items-center gap-1.5 rounded-full bg-brand-navy px-5 py-2.5 text-[13px] font-black text-white transition-colors hover:bg-brand-navy/90"
          >
            {guide.emoji} 바로 사용해보기
          </Link>
        )}

        {/* FAQ */}
        <section className="mt-10">
          <h2 className="text-base font-black text-text-primary md:text-lg">자주 묻는 질문</h2>
          <div className="mt-3 space-y-2.5">
            {guide.faqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-2xl border border-border-soft bg-bg-card p-4"
              >
                <summary className="cursor-pointer list-none text-[13px] font-bold text-text-primary md:text-[14px]">
                  Q. {f.q}
                </summary>
                <p className="mt-2 text-[12px] leading-6 text-text-secondary md:text-[13px]">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* 다른 가이드 (내부 링크) */}
        <section className="mt-10 border-t border-border-soft pt-6">
          <h2 className="text-sm font-black text-text-primary">다른 가이드 보기</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {others.map((g) => (
              <Link
                key={g.slug}
                href={`/guide/${g.slug}`}
                className="rounded-full border border-border-soft bg-bg-card px-3.5 py-1.5 text-[12px] font-medium text-text-secondary transition-colors hover:border-brand-navy hover:text-text-primary"
              >
                {g.emoji} {g.title}
              </Link>
            ))}
          </div>
        </section>
      </article>
    </div>
  );
}
