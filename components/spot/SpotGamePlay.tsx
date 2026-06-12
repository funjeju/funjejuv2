"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { SpotGame, SpotScore } from "@/types/spot";

const RING_R = 5.5;      // 발견 표시 원 반지름 (%)
const HIT_RADIUS = 9.5;  // 클릭 허용 반경 (%) — 손가락/마우스 모두 타이트하지 않게

export function SpotGamePlay({ game }: { game: SpotGame }) {
  const [found, setFound] = useState<boolean[]>(() => game.markers.map(() => false));
  const [misses, setMisses] = useState<{ side: "L" | "R"; x: number; y: number; key: number }[]>([]);
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
    } else {
      const key = Date.now();
      setMisses((m) => [...m, { side, x, y, key }]);
      setTimeout(() => setMisses((m) => m.filter((mm) => mm.key !== key)), 600);
    }
  }, [cleared, found, game.markers]);

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
        <defs>
          {/* 분필 손그림 느낌 — turbulence + displacement로 선을 거칠게 흔듬 */}
          <filter id="chalk" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" />
            <feDisplacementMap in="SourceGraphic" scale="1.4" />
          </filter>
        </defs>
        {game.markers.map((m, i) => found[i] && (
          <g key={i} filter="url(#chalk)" opacity={0.92}>
            {/* 두 겹으로 그어 분필이 두 번 휘갈긴 듯한 손맛 */}
            <circle cx={m.x} cy={m.y} r={RING_R} fill="none" stroke="#ff4d4d" strokeWidth={1.6} strokeLinecap="round" strokeDasharray="3 1.2" />
            <circle cx={m.x} cy={m.y} r={RING_R - 0.4} fill="none" stroke="#ff6b6b" strokeWidth={0.9} strokeLinecap="round" strokeDasharray="2 2" opacity={0.7} />
            <text x={m.x} y={m.y + 0.8} textAnchor="middle" dominantBaseline="middle" fontSize={4.5} fontWeight="bold" fill="#ff4d4d" stroke="#ff4d4d" strokeWidth={0.15}>{i + 1}</text>
          </g>
        ))}
        {misses.filter((mm) => mm.side === side).map((mm) => (
          <circle key={mm.key} cx={mm.x} cy={mm.y} r={3.5} fill="rgba(150,150,150,0.2)" stroke="#999" strokeWidth={1.5} opacity={0.55} filter="url(#chalk)" />
        ))}
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
