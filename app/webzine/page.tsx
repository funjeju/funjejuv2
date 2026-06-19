import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { PageHeader } from "@/components/common/PageHeader";
import { listPublished } from "@/lib/contents";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "제주 여행 웹진 — 지역별 맛집·코스 큐레이션 | 펀제주",
  description:
    "제주 여행 매거진. 애월·성산·한림 등 지역별 도민맛집과 여행 코스를 큐레이션으로 만나보세요.",
  keywords: ["제주 여행", "제주 맛집", "제주 여행 코스", "제주 웹진", "도민맛집"],
  alternates: { canonical: "https://funjeju.com/webzine" },
};

export default async function WebzineListPage() {
  const items = await listPublished("webzine", 60);

  return (
    <div className="mx-auto max-w-5xl px-0 md:px-4 md:py-6">
      <PageHeader title="제주 여행 웹진" subtitle="지역별 맛집·코스를 큐레이션으로" emoji="📖" />

      {items.length === 0 ? (
        <p className="px-4 py-16 text-center text-sm text-text-secondary md:px-0">
          곧 첫 웹진이 발행됩니다.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 px-4 sm:grid-cols-2 md:px-0">
          {items.map((c) => (
            <Link
              key={c.id}
              href={`/webzine/${c.slug}`}
              className="group overflow-hidden rounded-2xl border border-border-soft bg-bg-card shadow-card transition-transform hover:scale-[1.01]"
            >
              {c.coverImage && (
                <div className="relative aspect-[16/9] bg-bg-secondary">
                  <Image
                    src={c.coverImage}
                    alt={c.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 400px"
                    className="object-cover"
                    loading="lazy"
                  />
                </div>
              )}
              <div className="p-4">
                {c.region && (
                  <span className="rounded-full bg-brand-navy/10 px-2.5 py-0.5 text-[10px] font-bold text-brand-navy">
                    📍 {c.region} {c.menu}
                  </span>
                )}
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
