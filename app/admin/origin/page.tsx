"use client";

import { useEffect, useState, useCallback } from "react";

type Event = {
  t: number;
  ip: string;
  cctvId: string;
  type: "m3u8" | "chunklist" | "ts";
  result: "origin" | "hit";
};

type CctvStats = {
  totalOrigin: number;
  totalHit: number;
  uniqueIps: number;
  recent1min: { origin: number; hit: number };
  lastAccess: number;
};

type Stats = {
  uptime: number;
  memory: number;
  m3u8CacheSize: number;
  tsCacheSize: number;
  eventCount: number;
  events: Event[];
  perCctv: Record<string, CctvStats>;
};

const PROXY_URL = process.env.NEXT_PUBLIC_PROXY_URL ?? "";

function formatTime(t: number) {
  return new Date(t).toLocaleTimeString("ko-KR", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });
}

function formatDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}초`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}분 ${s % 60}초`;
  const h = Math.floor(m / 60);
  return `${h}시간 ${m % 60}분`;
}

export default function AdminOriginPage() {
  const [data, setData]       = useState<Stats | null>(null);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${PROXY_URL}/stats`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "조회 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 3000); // 3초마다 갱신
    return () => clearInterval(id);
  }, [load]);

  if (loading && !data) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-orange/30 border-t-brand-orange" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-2xl bg-live-red/10 border border-live-red/20 p-5 text-center">
          <p className="text-3xl">⚠️</p>
          <p className="mt-3 text-sm font-bold text-text-primary">프록시 서버 통계 조회 실패</p>
          <p className="mt-1 text-xs text-text-secondary">{error}</p>
          <p className="mt-2 text-[10px] text-text-secondary">
            {PROXY_URL}/stats 접속 가능한지 확인하세요
          </p>
          <button type="button" onClick={load}
            className="mt-4 rounded-full bg-brand-orange px-4 py-2 text-xs font-bold text-white">
            재시도
          </button>
        </div>
      </div>
    );
  }

  const cctvList = Object.entries(data.perCctv)
    .map(([id, s]) => ({ id, ...s }))
    .sort((a, b) => b.lastAccess - a.lastAccess);

  const totalOrigin = Object.values(data.perCctv).reduce((sum, s) => sum + s.totalOrigin, 0);
  const totalHit    = Object.values(data.perCctv).reduce((sum, s) => sum + s.totalHit, 0);
  const totalReq    = totalOrigin + totalHit;
  const hitRate     = totalReq > 0 ? Math.round((totalHit / totalReq) * 100) : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-text-primary">📡 Origin 호출 실시간</h1>
          <p className="text-sm text-text-secondary">3초마다 자동 갱신 · 프록시 서버 uptime {formatDuration(data.uptime)}</p>
        </div>
        <button type="button" onClick={load}
          className="rounded-full bg-brand-navy px-3 py-1.5 text-xs font-bold text-white">
          🔄 새로고침
        </button>
      </div>

      {/* 요약 카드 */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border-2 border-brand-orange/30 bg-brand-orange/5 p-4">
          <p className="text-xs font-bold text-brand-orange">Origin 호출</p>
          <p className="mt-1 text-2xl font-black text-text-primary">{totalOrigin.toLocaleString()}</p>
          <p className="text-[10px] text-text-secondary">실제 origin 서버까지 간 횟수</p>
        </div>
        <div className="rounded-2xl border-2 border-jeju-green/30 bg-jeju-green/5 p-4">
          <p className="text-xs font-bold text-jeju-green">캐시 HIT</p>
          <p className="mt-1 text-2xl font-black text-text-primary">{totalHit.toLocaleString()}</p>
          <p className="text-[10px] text-text-secondary">메모리 캐시에서 응답</p>
        </div>
        <div className="rounded-2xl border border-border-soft bg-bg-card p-4">
          <p className="text-xs font-bold text-text-secondary">캐시 적중률</p>
          <p className="mt-1 text-2xl font-black text-jeju-green">{hitRate}%</p>
          <p className="text-[10px] text-text-secondary">{totalReq.toLocaleString()} 요청 중 {totalHit.toLocaleString()} hit</p>
        </div>
        <div className="rounded-2xl border border-border-soft bg-bg-card p-4">
          <p className="text-xs font-bold text-text-secondary">캐시 메모리</p>
          <p className="mt-1 text-2xl font-black text-text-primary">{Math.round(data.memory / 1024 / 1024)}MB</p>
          <p className="text-[10px] text-text-secondary">m3u8 {data.m3u8CacheSize} / ts {data.tsCacheSize}</p>
        </div>
      </div>

      {/* CCTV별 통계 */}
      {cctvList.length > 0 && (
        <section className="mb-6 rounded-2xl border border-border-soft bg-bg-card p-5 shadow-card">
          <h2 className="mb-3 text-sm font-bold text-text-primary">CCTV별 통계 (마지막 시청순)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border-soft">
                  <th className="text-left py-2 px-2 font-bold text-text-secondary">CCTV</th>
                  <th className="text-right py-2 px-2 font-bold text-text-secondary">최근 1분</th>
                  <th className="text-right py-2 px-2 font-bold text-text-secondary">총 Origin</th>
                  <th className="text-right py-2 px-2 font-bold text-text-secondary">총 Hit</th>
                  <th className="text-right py-2 px-2 font-bold text-text-secondary">유저</th>
                  <th className="text-right py-2 px-2 font-bold text-text-secondary">마지막</th>
                </tr>
              </thead>
              <tbody>
                {cctvList.map((c) => {
                  const recent = c.recent1min.origin + c.recent1min.hit;
                  const recentHitRate = recent > 0 ? Math.round((c.recent1min.hit / recent) * 100) : 0;
                  return (
                    <tr key={c.id} className="border-b border-border-soft/50">
                      <td className="py-2 px-2 font-bold text-text-primary">{c.id}</td>
                      <td className="py-2 px-2 text-right">
                        <span className="text-brand-orange">{c.recent1min.origin}</span>
                        <span className="text-text-secondary">/</span>
                        <span className="text-jeju-green">{c.recent1min.hit}</span>
                        {recent > 0 && (
                          <span className="ml-1 text-[10px] text-text-secondary">({recentHitRate}%)</span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-right text-brand-orange font-mono">{c.totalOrigin}</td>
                      <td className="py-2 px-2 text-right text-jeju-green font-mono">{c.totalHit}</td>
                      <td className="py-2 px-2 text-right font-mono">{c.uniqueIps}</td>
                      <td className="py-2 px-2 text-right text-[10px] text-text-secondary">
                        {formatDuration(Date.now() - c.lastAccess)} 전
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[10px] text-text-secondary">
            범례: <span className="text-brand-orange">Origin</span> = 실제 외부 서버 호출 / <span className="text-jeju-green">Hit</span> = 캐시 응답
          </p>
        </section>
      )}

      {/* 실시간 이벤트 로그 */}
      <section className="rounded-2xl border border-border-soft bg-bg-card p-5 shadow-card">
        <h2 className="mb-3 text-sm font-bold text-text-primary">
          🔴 실시간 요청 로그 (최근 200건)
        </h2>
        <div className="rounded-xl bg-gray-950 p-3 max-h-[500px] overflow-y-auto font-mono text-[11px]">
          {data.events.length === 0 ? (
            <p className="text-gray-500 text-center py-4">아직 요청 없음. 사이트에서 영상 켜보세요.</p>
          ) : (
            <div className="space-y-0.5">
              {data.events.map((ev, i) => (
                <div key={i} className="flex items-center gap-2 leading-tight">
                  <span className="text-gray-500 shrink-0">[{formatTime(ev.t)}]</span>
                  <span className="text-cyan-300 w-32 truncate shrink-0">{ev.cctvId}</span>
                  <span className="text-gray-400 shrink-0">←</span>
                  <span className="text-yellow-300 shrink-0">IP-{ev.ip}</span>
                  <span className="text-gray-400 shrink-0">[{ev.type}]</span>
                  <span className={[
                    "shrink-0 font-bold",
                    ev.result === "origin" ? "text-orange-400" : "text-green-400",
                  ].join(" ")}>
                    {ev.result === "origin" ? "● ORIGIN 호출" : "○ 캐시 HIT"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="mt-2 text-[10px] text-text-secondary">
          같은 영상에서 ORIGIN 1번 + HIT 여러 번이 정상. ORIGIN만 계속 나오면 캐시 미작동.
        </p>
      </section>
    </div>
  );
}
