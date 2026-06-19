import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/common/PageHeader";
import { GUIDES } from "@/lib/guides";

export const metadata: Metadata = {
  title: "이용 가이드 — 제주 CCTV·AI 여행 사용법 | funjeju",
  description:
    "제주 CCTV 실시간 보기, 멀티뷰, AI 여행 일정, 도슨트 챗봇, 제주tube까지 funjeju 사용법을 한 곳에서 확인하세요.",
  keywords: ["제주 CCTV 사용법", "제주 여행 일정", "제주 여행 앱", "funjeju 가이드"],
  alternates: { canonical: "https://www.funjeju.com/guide" },
};

export default function GuideIndexPage() {
  return (
    <div className="mx-auto max-w-5xl px-0 md:px-4 md:py-6">
      <PageHeader
        title="이용 가이드"
        subtitle="제주를 가장 똑똑하게 즐기는 funjeju 사용법"
        emoji="📖"
      />

      <div className="grid grid-cols-1 gap-3 px-4 sm:grid-cols-2 md:px-0">
        {GUIDES.map((g) => (
          <Link
            key={g.slug}
            href={`/guide/${g.slug}`}
            className="group rounded-2xl border border-border-soft bg-bg-card p-4 transition-colors hover:border-brand-navy"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">{g.emoji}</span>
              <h2 className="text-sm font-black text-text-primary md:text-base">{g.title}</h2>
            </div>
            <p className="mt-2 line-clamp-2 text-[12px] leading-5 text-text-secondary md:text-[13px]">
              {g.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
