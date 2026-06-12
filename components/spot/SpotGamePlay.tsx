"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { SpotGame, SpotScore } from "@/types/spot";

const RING_R = 5;        // 발견 표시 원 반지름 (%)
const HIT_RADIUS = 7;    // 클릭 허용 반경 (%)

export function SpotGamePlay({ game }: { game: SpotGame }) {
  const [found, setFound] = useState<boolean[]>(() => game.markers.map(() => false));
  const [misses, setMisses] = useState<{ side: "L" | "R"; x: number; y: number; key: number }[]>([]);
  const [hint, setHint] = useState<{ x: number; y: number } | null>(null);
  const [startAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [cleared, setCleared] = useState(false);
  const [name, setName] = useState("");
  const [rankings, setRankings] = useState<SpotScore[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const foundCount = found.filter(Boolean).length;
  const allFound = foundCount === game.markers.length;

  // 타이머
  useEffect(() => {
    if (cleared) return;
    const iv = setInterval(() => setElapsed(Date.now() - startAt), 100);
    return () => clearInterval(iv);
  }, [cleared, startAt]);

  // 클리어 처리
  useEffect(() => {
    if (allFound && !cleared) {
      setCleared(true);
      setElapsed(Date.now() - startAt);
    }
  }, [allFound, cleared, startAt]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>, side: "L" | "R") => {
    if (cleared) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const ar = imgRef.current ? imgRef.current.naturalWidth / imgRef.current.naturalHeight : 1;

    let hitIdx = -1;
    game.markers.forEach((m, i) => {
      if (found[i]) return;
      const dx = x - m.x;
      const dy = (y - m.y) * ar; // 비율 보정
      if (Math.sqrt(dx * dx + dy * dy) < HIT_RADIUS) hitIdx = i;
    });

    if (hitIdx >= 0) {
      setFound((f) => f.map((v, i) => (i === hitIdx ? true : v)));
      setHint(null);
    } else {
      const key = Date.now();
      setMisses((m) => [...m, { side, x, y, key }]);
      setTimeout(() => setMisses((m) => m.filter((mm) => mm.key !== key)), 600);
    }
  }, [cleared, found, game.markers]);

  function showHint() {
    const idx = found.findIndex((v) => !v);
    if (idx < 0) return;
    setHint(game.markers[idx]);
    setTimeout(() => setHint(null), 2000);
  }

  async function submit() {
    setSubmitted(true);
    try {
      const r = await fetch(`/api/spot/${game.id}/score`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || "익명", timeMs: elapsed }),
      });
      const d = await r.json();
      setRankings(d.rankings ?? []);
    } catch { /* ignore */ }
  }

  // 랭킹 미리 로드
  useEffect(() => {
    fetch(`/api/spot/${game.id}/score`).then((r) => r.json()).then((d) => setRankings(d.rankings ?? [])).catch(() => {});
  }, [game.id]);

  const fmtTime = (ms: number) => `${(ms / 1000).toFixed(1)}초`;

  const renderImg = (src: string, side: "L" | "R", label: string) => (
    <div className="relative cursor-crosshair overflow-hidden bg-white leading-none" onClick={(e) => handleClick(e, side)}>
      <img ref={side === "L" ? imgRef : undefined} src={src} alt={label} className="block w-full select-none" style={{ pointerEvents: "none" }} />
      <span className="absolute left-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-[12px] font-bold text-white">{label}</span>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
        {game.markers.map((m, i) => found[i] && (
          <g key={i}><circle cx={m.x} cy={m.y} r={RING_R} fill="rgba(255,60,60,0.18)" stroke="#ff3333" strokeWidth={3} /><text x={m.x} y={m.y + 0.6} textAnchor="middle" dominantBaseline="middle" fontSize={4} fontWeight="bold" fill="#cc2222">{i + 1}</text></g>
        ))}
        {hint && <circle cx={hint.x} cy={hint.y} r={RING_R + 1} fill="rgba(201,168,76,0.15)" stroke="#c9a84c" strokeWidth={2.5} strokeDasharray="6 4" />}
        {misses.filter((mm) => mm.side === side).map((mm) => (<circle key={mm.key} cx={mm.x} cy={mm.y} r={3.5} fill="rgba(150,150,150,0.2)" stroke="#999" strokeWidth={2} opacity={0.6} />))}
      </svg>
    </div>
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-border-soft bg-bg-card shadow-card">
      <div className="bg-brand-navy px-5 py-3 text-center text-white">
        <h1 className="text-lg font-black tracking-wide">{game.title}</h1>
        <p className="text-[12px] text-white/70">다른 <span className="font-bold text-brand-yellow">{game.markers.length}</span>곳을 찾아보세요!</p>
      </div>

      <div className={`grid gap-[3px] bg-brand-navy p-[3px] ${game.layout === "stack" ? "grid-cols-1" : "grid-cols-2"}`}>
        {renderImg(game.origImage, "L", "①")}
        {renderImg(game.variantImage, "R", "②")}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-soft bg-bg-secondary px-5 py-3">
        <span className="text-sm font-black text-text-primary">발견 <span className="text-brand-orange">{foundCount}</span> / {game.markers.length}</span>
        <span className="text-sm font-bold text-text-secondary">⏱ {fmtTime(elapsed)}</span>
        <button onClick={showHint} className="rounded-full border border-stone-400 px-3 py-1 text-[12px] text-text-secondary hover:bg-stone-100">💡 힌트</button>
      </div>

      {/* 클리어 → 기록 입력 */}
      {cleared && (
        <div className="border-t border-border-soft p-5 text-center">
          <p className="text-2xl">🎉</p>
          <p className="mt-1 text-sm font-black text-text-primary">{fmtTime(elapsed)} 만에 모두 찾았어요!</p>
          {!submitted ? (
            <div className="mt-3 flex justify-center gap-2">
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={12} placeholder="닉네임" className="rounded-full border border-border-soft bg-bg-secondary px-4 py-2 text-sm" />
              <button onClick={submit} className="rounded-full bg-brand-orange px-4 py-2 text-sm font-bold text-white">랭킹 등록</button>
            </div>
          ) : <p className="mt-2 text-xs text-jeju-green">✅ 기록 등록 완료!</p>}
        </div>
      )}

      {/* 랭킹 */}
      {rankings.length > 0 && (
        <div className="border-t border-border-soft p-5">
          <h2 className="mb-2 text-sm font-black text-text-primary">🏆 최단시간 랭킹</h2>
          <div className="space-y-1">
            {rankings.slice(0, 10).map((s, i) => (
              <div key={i} className="flex items-center gap-3 text-[13px]">
                <span className={`w-5 font-bold ${i < 3 ? "text-brand-orange" : "text-text-secondary"}`}>{i + 1}</span>
                <span className="flex-1 truncate text-text-primary">{s.name}</span>
                <span className="font-bold text-text-secondary">{fmtTime(s.timeMs)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
