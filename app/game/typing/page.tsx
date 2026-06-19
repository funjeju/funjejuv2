import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/common/PageHeader";
import { listPassages, listSets } from "@/lib/typing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "제주 타자연습 — 매장 설명 타자연습 + 주간순위 | 펀제주",
  description: "제주 가게·메뉴 설명을 타이핑하며 타수에 도전하세요. 주간 순위로 경쟁!",
  keywords: ["제주 타자연습", "타자연습", "제주 게임"],
  alternates: { canonical: "https://www.funjeju.com/game/typing" },
};

export default async function TypingGalleryPage() {
  const [passages, sets] = await Promise.all([
    listPassages({ publishedOnly: true }),
    listSets({ publishedOnly: true }),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-0 md:px-4 md:py-6">
      <PageHeader title="제주 타자연습" subtitle="매장 설명 타이핑하고 주간 순위에 도전!" emoji="⌨️" />

      {/* 묶음 세트 — 여러 지문 연속 + 평균 타수 랭킹 */}
      {sets.length > 0 && (
        <div className="mb-5 px-4 md:px-0">
          <p className="mb-2 text-xs font-bold text-text-secondary">🔥 묶음 세트 (연속 도전)</p>
          <div className="space-y-2">
            {sets.map((s) => (
              <Link key={s.id} href={`/game/typing/set/${s.id}`} className="block rounded-2xl border border-brand-orange/40 bg-brand-orange/5 p-4 shadow-card transition-transform hover:scale-[1.01]">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-brand-orange px-2 py-0.5 text-[10px] font-bold text-white">세트 {s.passageIds.length}개</span>
                  <span className="text-sm font-bold text-text-primary">{s.title}</span>
                  <span className="ml-auto text-[10px] text-text-secondary">플레이 {s.playCount ?? 0}</span>
                </div>
                {s.businessName && <p className="mt-1 text-[11px] text-text-secondary">{s.businessName} · 평균 타수로 순위</p>}
              </Link>
            ))}
          </div>
        </div>
      )}

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
