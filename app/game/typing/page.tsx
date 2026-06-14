import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/common/PageHeader";
import { listPassages } from "@/lib/typing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "제주 한컴타자 — 매장 설명 타자연습 + 주간순위 | 펀제주",
  description: "제주 가게·메뉴 설명을 타이핑하며 타수에 도전하세요. 주간 순위로 경쟁!",
  keywords: ["제주 타자연습", "한컴타자", "제주 게임"],
  alternates: { canonical: "https://funjeju.com/game/typing" },
};

export default async function TypingGalleryPage() {
  const passages = await listPassages({ publishedOnly: true });

  return (
    <div className="mx-auto max-w-3xl px-0 md:px-4 md:py-6">
      <PageHeader title="제주 한컴타자" subtitle="매장 설명 타이핑하고 주간 순위에 도전!" emoji="⌨️" />

      {passages.length === 0 ? (
        <p className="px-4 py-16 text-center text-sm text-text-secondary md:px-0">곧 첫 지문이 올라옵니다.</p>
      ) : (
        <div className="space-y-2 px-4 md:px-0">
          {passages.map((p) => (
            <Link key={p.id} href={`/game/typing/${p.id}`} className="block rounded-2xl border border-border-soft bg-bg-card p-4 shadow-card transition-transform hover:scale-[1.01]">
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded-full bg-brand-navy px-2 py-0.5 text-[10px] font-bold text-white">{p.kind === "long" ? "장문" : "단문"}</span>
                <span className="text-sm font-bold text-text-primary">{p.businessName || "제주 매장"}</span>
                <span className="ml-auto text-[10px] text-text-secondary">플레이 {p.playCount ?? 0}</span>
              </div>
              <p className="line-clamp-2 text-[13px] leading-5 text-text-secondary">{p.text}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
