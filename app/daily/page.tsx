import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { PageHeader } from "@/components/common/PageHeader";
import { listPublished } from "@/lib/contents";

export const revalidate = 60; // 새 브리핑이 빨리 노출되도록 (기존 30분 → 1분)

export const metadata: Metadata = {
  title: "AI데일리제주 — 오늘의 제주 날씨와 추천 | 펀제주",
  description: "매일 아침 업데이트되는 제주 날씨와 오늘 가기 좋은 맛집·스팟 추천. AI가 큐레이션하는 제주 데일리 브리핑.",
  keywords: ["제주 날씨", "오늘 제주", "제주 여행", "제주 맛집 추천", "AI데일리제주"],
  alternates: { canonical: "https://www.funjeju.com/daily" },
};

function fmtDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default async function DailyListPage() {
  const items = await listPublished("briefing", 60);

  return (
    <div className="mx-auto max-w-5xl px-0 md:px-4 md:py-6">
      <PageHeader title="AI데일리제주" subtitle="매일 아침, 오늘의 제주 날씨와 추천" emoji="🌅" />

      {items.length === 0 ? (
        <p className="px-4 py-16 text-center text-sm text-text-secondary md:px-0">
          곧 첫 브리핑이 발행됩니다.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 px-4 sm:grid-cols-2 md:px-0">
          {items.map((c) => (
            <Link
              key={c.id}
              href={`/daily/${c.slug}`}
              className="group overflow-hidden rounded-2xl border border-border-soft bg-bg-card shadow-card transition-transform hover:scale-[1.01]"
            >
              {c.coverImage && (
                <div className="relative aspect-[16/9] bg-bg-secondary">
                  <Image src={c.coverImage} alt={c.title} fill sizes="(max-width:768px) 100vw, 400px" className="object-cover" loading="lazy" />
                </div>
              )}
              <div className="p-4">
                <span className="rounded-full bg-brand-orange/10 px-2.5 py-0.5 text-[10px] font-bold text-brand-orange">
                  🌅 {fmtDate(c.publishedAt ?? c.createdAt)}
                </span>
                <h2 className="mt-2 text-sm font-black text-text-primary md:text-base">{c.title}</h2>
                <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-text-secondary">{c.subtitle}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
