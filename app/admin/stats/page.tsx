"use client";

import { useEffect, useState } from "react";

type StatsData = {
  now: string;
  active: {
    total: number;
    byCctv: { id: string; name: string; count: number }[];
    byTier: Record<string, number>;
  };
  today: {
    totalViews: number;
    uniqueUsers: number;
    byCctv: { id: string; name: string; count: number; totalSec: number }[];
    byTier: Record<string, { count: number; totalSec: number }>;
  };
  daily: { date: string; views: number; uniqueUsers: number; totalSec: number }[];
};

const TIER_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  anonymous: { label: "비로그인",   emoji: "👤", color: "bg-gray-100 text-gray-700" },
  free:      { label: "무료 회원",   emoji: "🆓", color: "bg-blue-100 text-blue-700" },
  biz:       { label: "비즈니스",    emoji: "💼", color: "bg-amber-100 text-amber-700" },
  admin:     { label: "관리자",      emoji: "👑", color: "bg-purple-100 text-purple-700" },
};

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}초`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분`;
  const hr = Math.floor(min / 60);
  return `${hr}시간 ${min % 60}분`;
}

export default function AdminStatsPage() {
  const [data,    setData]    = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  async function load() {
    try {
      const res = await fetch("/api/admin/stats", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "조회 실패");
      setData(json);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // 10초마다 자동 갱신
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, []);

  if (loading && !data) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-orange/30 border-t-brand-orange" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-2xl bg-live-red/10 border border-live-red/20 p-5 text-center">
          <p className="text-3xl">⚠️</p>
          <p className="mt-3 text-sm font-bold text-text-primary">통계 조회 실패</p>
          <p className="mt-1 text-xs text-text-secondary">{error}</p>
          <button type="button" onClick={load}
            className="mt-4 rounded-full bg-brand-orange px-4 py-2 text-xs font-bold text-white">
            재시도
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const maxDailyViews = Math.max(1, ...data.daily.map((d) => d.views));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-text-primary">📊 실시간 통계</h1>
          <p className="text-sm text-text-secondary">
            10초마다 자동 갱신 · 마지막 업데이트 {new Date(data.now).toLocaleTimeString("ko-KR")}
          </p>
        </div>
        <button type="button" onClick={load}
          className="rounded-full bg-brand-navy px-3 py-1.5 text-xs font-bold text-white">
          🔄 새로고침
        </button>
      </div>

      {/* ── 실시간 동시접속자 ── */}
      <section className="mb-6 rounded-2xl border-2 border-jeju-green/30 bg-jeju-green/5 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-jeju-green">🟢 실시간 동시접속자</p>
            <p className="mt-1 text-4xl font-black text-text-primary">
              {data.active.total}<span className="text-lg text-text-secondary">명</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-text-secondary">활성 CCTV</p>
            <p className="text-xl font-black text-brand-orange">{data.active.byCctv.length}<span className="text-sm text-text-secondary">개</span></p>
          </div>
        </div>

        {/* 등급별 분포 */}
        <div className="mt-4 grid grid-cols-4 gap-2">
          {(["anonymous", "free", "biz", "admin"] as const).map((tier) => {
            const meta = TIER_LABELS[tier];
            const count = data.active.byTier[tier] ?? 0;
            return (
              <div key={tier} className={`rounded-xl px-3 py-2 ${meta.color}`}>
                <p className="text-[10px] font-bold">{meta.emoji} {meta.label}</p>
                <p className="mt-0.5 text-lg font-black">{count}</p>
              </div>
            );
          })}
        </div>

        {/* CCTV별 활성 시청자 */}
        {data.active.byCctv.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-bold text-text-secondary">CCTV별 시청자</p>
            <div className="space-y-1">
              {data.active.byCctv.slice(0, 10).map((c) => (
                <div key={c.id} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 shadow-card">
                  <span className="text-xs font-bold text-text-primary truncate flex-1">
                    {c.name || c.id}
                  </span>
                  <span className="rounded-full bg-brand-orange/10 px-2 py-0.5 text-[11px] font-bold text-brand-orange">
                    {c.count}명
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── 오늘 시청 통계 ── */}
      <section className="mb-6 rounded-2xl border border-border-soft bg-bg-card p-5 shadow-card">
        <h2 className="mb-3 text-sm font-bold text-text-primary">📅 오늘 시청 통계</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-bg-secondary p-3 text-center">
            <p className="text-[10px] text-text-secondary">총 시청 횟수</p>
            <p className="mt-1 text-2xl font-black text-text-primary">{data.today.totalViews}</p>
          </div>
          <div className="rounded-xl bg-bg-secondary p-3 text-center">
            <p className="text-[10px] text-text-secondary">고유 사용자</p>
            <p className="mt-1 text-2xl font-black text-text-primary">{data.today.uniqueUsers}</p>
          </div>
          <div className="rounded-xl bg-bg-secondary p-3 text-center col-span-2 sm:col-span-1">
            <p className="text-[10px] text-text-secondary">총 시청시간</p>
            <p className="mt-1 text-2xl font-black text-text-primary">
              {formatDuration(Object.values(data.today.byTier).reduce((s, t) => s + t.totalSec, 0))}
            </p>
          </div>
        </div>

        {/* 등급별 오늘 사용량 */}
        <div className="mt-4">
          <p className="mb-2 text-xs font-bold text-text-secondary">등급별 사용량</p>
          <div className="space-y-1.5">
            {(["anonymous", "free", "biz", "admin"] as const).map((tier) => {
              const meta = TIER_LABELS[tier];
              const stat = data.today.byTier[tier];
              if (!stat || stat.count === 0) return null;
              return (
                <div key={tier} className="flex items-center gap-3 rounded-xl bg-bg-secondary px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.color}`}>
                    {meta.emoji} {meta.label}
                  </span>
                  <span className="text-xs text-text-primary">{stat.count}회</span>
                  <span className="ml-auto text-xs text-text-secondary">{formatDuration(stat.totalSec)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* TOP 10 CCTV */}
        {data.today.byCctv.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-bold text-text-secondary">인기 CCTV TOP 10</p>
            <div className="space-y-1">
              {data.today.byCctv.slice(0, 10).map((c, i) => (
                <div key={c.id} className="flex items-center gap-3 rounded-xl bg-bg-secondary px-3 py-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-orange text-[10px] font-black text-white">
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate text-xs font-bold text-text-primary">{c.name || c.id}</span>
                  <span className="text-[11px] text-text-secondary">{formatDuration(c.totalSec)}</span>
                  <span className="rounded-full bg-brand-navy/10 px-2 py-0.5 text-[11px] font-bold text-brand-navy">
                    {c.count}회
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── 최근 7일 추이 ── */}
      <section className="rounded-2xl border border-border-soft bg-bg-card p-5 shadow-card">
        <h2 className="mb-3 text-sm font-bold text-text-primary">📈 최근 7일</h2>
        {data.daily.length === 0 ? (
          <p className="py-8 text-center text-xs text-text-secondary">아직 시청 기록이 없어요</p>
        ) : (
          <div className="space-y-2">
            {data.daily.map((d) => (
              <div key={d.date} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-[11px] font-medium text-text-secondary">{d.date.slice(5)}</span>
                <div className="flex-1 rounded-full bg-bg-secondary h-3">
                  <div className="h-full rounded-full bg-brand-orange"
                    style={{ width: `${(d.views / maxDailyViews) * 100}%` }} />
                </div>
                <span className="w-12 text-right text-xs font-bold text-text-primary">{d.views}회</span>
                <span className="w-16 text-right text-[10px] text-text-secondary">{d.uniqueUsers}명</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
