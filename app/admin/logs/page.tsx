"use client";

import { useCallback, useEffect, useState } from "react";

type ViewLog = {
  userId: string;
  userTier: string;
  cctvId: string;
  cctvName: string;
  startedAt: string;
  endedAt: string;
  durationSec: number;
  date: string;
};

type PageViewLog = {
  path: string;
  userId: string;
  userTier: string;
  userAgent: string;
  referer: string;
  visitedAt: string;
  date: string;
};

const TIER_META: Record<string, { label: string; color: string }> = {
  anonymous: { label: "비로그인", color: "bg-gray-100 text-gray-700" },
  free:      { label: "무료",     color: "bg-blue-100 text-blue-700" },
  biz:       { label: "비즈",     color: "bg-amber-100 text-amber-700" },
  admin:     { label: "관리자",   color: "bg-purple-100 text-purple-700" },
};

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}초`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}분 ${s}초` : `${m}분`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function shortenUserId(id: string): string {
  if (id.startsWith("anon_")) return id.slice(0, 10) + "...";
  if (id.length > 12) return id.slice(0, 8) + "...";
  return id;
}

export default function AdminLogsPage() {
  const [tab, setTab] = useState<"views" | "pages">("views");
  const [viewLogs, setViewLogs] = useState<ViewLog[]>([]);
  const [pageLogs, setPageLogs] = useState<PageViewLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  // 필터
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/logs?type=${tab}&limit=300`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "조회 실패");
      if (tab === "views") setViewLogs(data.logs);
      else setPageLogs(data.logs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  // 필터된 데이터
  const filteredViews = viewLogs.filter((v) => {
    if (tierFilter && v.userTier !== tierFilter) return false;
    if (search && !v.cctvName.includes(search) && !v.cctvId.includes(search) && !v.userId.includes(search)) return false;
    return true;
  });
  const filteredPages = pageLogs.filter((p) => {
    if (tierFilter && p.userTier !== tierFilter) return false;
    if (search && !p.path.includes(search) && !p.userId.includes(search)) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-text-primary">📋 로그</h1>
          <p className="text-sm text-text-secondary">최근 300건 · 실시간</p>
        </div>
        <button type="button" onClick={load}
          className="rounded-full bg-brand-navy px-3 py-1.5 text-xs font-bold text-white">
          🔄 새로고침
        </button>
      </div>

      {/* 탭 */}
      <div className="mb-4 flex rounded-2xl border border-border-soft bg-bg-card p-1 shadow-card">
        <button type="button" onClick={() => setTab("views")}
          className={["flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors",
            tab === "views" ? "bg-brand-orange text-white shadow-soft" : "text-text-secondary"].join(" ")}>
          📺 영상 시청 로그 ({viewLogs.length})
        </button>
        <button type="button" onClick={() => setTab("pages")}
          className={["flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors",
            tab === "pages" ? "bg-brand-navy text-white shadow-soft" : "text-text-secondary"].join(" ")}>
          🌐 페이지 방문 로그 ({pageLogs.length})
        </button>
      </div>

      {/* 필터 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-1 gap-2 rounded-full border border-border-soft bg-bg-card px-4 py-2 shadow-card">
          <span className="text-text-secondary">🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === "views" ? "CCTV명·ID·사용자 검색" : "경로·사용자 검색"}
            className="flex-1 bg-transparent text-sm outline-none" />
        </div>
        <div className="flex gap-1">
          {["", "anonymous", "free", "biz", "admin"].map((t) => (
            <button key={t || "all"} type="button" onClick={() => setTierFilter(t)}
              className={[
                "rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors",
                tierFilter === t
                  ? "bg-text-primary text-white"
                  : "border border-border-soft bg-bg-card text-text-secondary",
              ].join(" ")}>
              {t === "" ? "전체" : TIER_META[t]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* 결과 */}
      {error && (
        <div className="mb-4 rounded-xl bg-live-red/10 px-4 py-3 text-sm text-live-red">{error}</div>
      )}

      <div className="rounded-2xl border border-border-soft bg-bg-card shadow-card overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-brand-orange/30 border-t-brand-orange" />
          </div>
        ) : tab === "views" ? (
          filteredViews.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-3xl">📺</p>
              <p className="mt-2 text-sm font-bold text-text-primary">시청 로그가 없어요</p>
              <p className="text-xs text-text-secondary">5초 이상 시청한 기록만 표시됩니다</p>
            </div>
          ) : (
            <div className="divide-y divide-border-soft">
              {filteredViews.map((v, i) => {
                const tier = TIER_META[v.userTier] ?? TIER_META.anonymous;
                return (
                  <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-bg-secondary transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tier.color}`}>
                          {tier.label}
                        </span>
                        <span className="text-sm font-bold text-text-primary">{v.cctvName || v.cctvId}</span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-text-secondary">
                        <span className="font-mono">{shortenUserId(v.userId)}</span>
                        {" · "}
                        {formatTime(v.startedAt)} ~ {formatTime(v.endedAt)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="rounded-full bg-brand-orange/10 px-2.5 py-1 text-[11px] font-bold text-brand-orange">
                        {formatDuration(v.durationSec)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          filteredPages.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-3xl">🌐</p>
              <p className="mt-2 text-sm font-bold text-text-primary">방문 로그가 없어요</p>
              <p className="text-xs text-text-secondary">사용자가 페이지 진입하면 자동 기록됩니다</p>
            </div>
          ) : (
            <div className="divide-y divide-border-soft">
              {filteredPages.map((p, i) => {
                const tier = TIER_META[p.userTier] ?? TIER_META.anonymous;
                return (
                  <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-bg-secondary transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tier.color}`}>
                          {tier.label}
                        </span>
                        <span className="font-mono text-sm font-bold text-brand-navy">{p.path}</span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-text-secondary">
                        <span className="font-mono">{shortenUserId(p.userId)}</span>
                        {" · "}
                        {formatTime(p.visitedAt)}
                        {p.referer && (
                          <span className="ml-2 truncate inline-block max-w-[200px] align-bottom">
                            ← {(() => {
                              try { return new URL(p.referer).hostname; }
                              catch { return p.referer; }
                            })()}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}
