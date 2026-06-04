import { loadAllRestaurants } from "@/lib/restaurants";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminFoodPage() {
  const restaurants = await loadAllRestaurants();

  const regionCounts = restaurants.reduce<Record<string, number>>((acc, r) => {
    const key = (r as unknown as Record<string, string>).region ?? "기타";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const topRegions = Object.entries(regionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-text-primary">🍽️ 도민맛집 관리</h1>
          <p className="text-sm text-text-secondary">restaurants.json 기반 · 현재 읽기 전용</p>
        </div>
        <span className="rounded-full bg-brand-orange/10 px-3 py-1.5 text-xs font-bold text-brand-orange border border-brand-orange/20">
          총 {restaurants.length}개
        </span>
      </div>

      {/* 안내 배너 */}
      <div className="mb-6 rounded-2xl border border-brand-navy/20 bg-brand-navy/5 p-4">
        <p className="mb-1 text-sm font-bold text-brand-navy">📋 현재 데이터 구조</p>
        <p className="text-xs leading-5 text-text-secondary">
          도민맛집 데이터는 서버 파일 <code className="rounded bg-bg-secondary px-1 py-0.5 font-mono">data/restaurants.json</code>에 저장되어 있어요.
          Firestore로 마이그레이션하면 UI에서 직접 추가/수정/삭제가 가능해집니다.
        </p>
        <div className="mt-3 flex gap-2">
          <Link
            href="/food"
            className="rounded-lg bg-brand-navy px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-navy/90 transition-colors"
          >
            맛집 페이지 보기 →
          </Link>
        </div>
      </div>

      {/* 통계 */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "전체",       value: restaurants.length,                    emoji: "🏪" },
          { label: "지역 수",    value: Object.keys(regionCounts).length,      emoji: "📍" },
          { label: "이미지 있음", value: restaurants.filter((r) => (r as unknown as Record<string, unknown[]>).images?.length > 0).length, emoji: "📸" },
          { label: "전화 있음",  value: restaurants.filter((r) => (r as unknown as Record<string, string>).phone).length, emoji: "📞" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border-soft bg-bg-card p-4 shadow-card text-center">
            <p className="text-2xl">{s.emoji}</p>
            <p className="mt-1 text-xl font-black text-text-primary">{s.value.toLocaleString()}</p>
            <p className="text-[11px] text-text-secondary">{s.label}</p>
          </div>
        ))}
      </div>

      {/* 지역별 분포 */}
      <div className="rounded-2xl border border-border-soft bg-bg-card p-5 shadow-card">
        <h2 className="mb-4 text-sm font-bold text-text-primary">📍 지역별 분포 (상위 8개)</h2>
        <div className="space-y-2">
          {topRegions.map(([region, count]) => {
            const pct = Math.round((count / restaurants.length) * 100);
            return (
              <div key={region} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-xs font-medium text-text-primary">{region}</span>
                <div className="flex-1 rounded-full bg-bg-secondary h-2">
                  <div
                    className="h-full rounded-full bg-brand-orange"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-12 text-right text-xs font-semibold text-text-secondary">{count}개</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
