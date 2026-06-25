"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { SpotGame, SpotScore, SpotComment } from "@/types/spot";

const RING_R = 5.5;      // 발견 표시 원 반지름 (%)
const HIT_RADIUS = 6.0;  // 클릭 허용 반경 (%) — 정답 범위 타이트하게

export function SpotGamePlay({ game }: { game: SpotGame }) {
  const [found, setFound] = useState<boolean[]>(() => game.markers.map(() => false));
  const [misses, setMisses] = useState<{ side: "L" | "R"; x: number; y: number; key: number }[]>([]);
  const [startAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [cleared, setCleared] = useState(false);
  const [name, setName] = useState("");
  const [rankings, setRankings] = useState<SpotScore[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [comments, setComments] = useState<SpotComment[]>([]);
  const [origAspect, setOrigAspect] = useState<number | null>(null); // 원본 비율 — 변형도 같은 박스에 맞춰 정렬
  const [commentText, setCommentText] = useState("");
  const [commentSending, setCommentSending] = useState(false);
  const [fullscreen, setFullscreen] = useState(false); // 크게 보기(전체화면 모달)
  const imgRef = useRef<HTMLImageElement>(null);

  const foundCount = found.filter(Boolean).length;
  const allFound = foundCount === game.markers.length;

  // 타이머
  useEffect(() => {
    if (cleared) return;
    const iv = setInterval(() => setElapsed(Date.now() - startAt), 100);
    return () => clearInterval(iv);
  }, [cleared, startAt]);

  // 플레이 횟수 카운트 — 마운트 시 1회 (StrictMode 중복 방지)
  const playCounted = useRef(false);
  useEffect(() => {
    if (playCounted.current) return;
    playCounted.current = true;
    fetch(`/api/spot/${game.id}/play`, { method: "POST" }).catch(() => {});
  }, [game.id]);

  // 클리어 처리
  useEffect(() => {
    if (allFound && !cleared) {
      setCleared(true);
      setElapsed(Date.now() - startAt);
    }
  }, [allFound, cleared, startAt]);

  // 클리어하면 댓글 열람 (스포일러 방지)
  useEffect(() => {
    if (cleared) {
      fetch(`/api/spot/${game.id}/comments`).then((r) => r.json()).then((d) => setComments(d.comments ?? [])).catch(() => {});
    }
  }, [cleared, game.id]);

  async function submitComment() {
    const text = commentText.trim();
    if (!text || commentSending) return;
    setCommentSending(true);
    try {
      const r = await fetch(`/api/spot/${game.id}/comments`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || "익명", text, cleared: true }),
      });
      const d = await r.json();
      if (d.comments) { setComments(d.comments); setCommentText(""); }
    } catch { /* ignore */ }
    setCommentSending(false);
  }

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
    <div className="leading-none">
      {/* 이미지 위 라벨 — 겹치지 않게 헤더로 표시 */}
      <p className="bg-brand-navy pb-1.5 text-center text-[11px] font-bold tracking-wide text-white md:text-xs">{label}</p>
      <div className="relative cursor-crosshair overflow-hidden bg-white leading-none" onClick={(e) => handleClick(e, side)}
        style={origAspect ? { aspectRatio: String(origAspect) } : undefined}>
        <img
          ref={side === "L" ? imgRef : undefined}
          src={src}
          alt={label}
          onLoad={side === "L" ? (e) => { const t = e.currentTarget; if (t.naturalHeight) setOrigAspect(t.naturalWidth / t.naturalHeight); } : undefined}
          className="block h-full w-full select-none"
          style={{ objectFit: "fill", pointerEvents: "none" }}
        />
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
        <defs>
          <style>{`
            @keyframes draw-circle {
              from { stroke-dashoffset: 40; }
              to   { stroke-dashoffset: 0; }
            }
            .marker-ring {
              stroke-dasharray: 40;
              stroke-dashoffset: 0;
              animation: draw-circle 0.35s ease-out forwards;
            }
          `}</style>
        </defs>
        {game.markers.map((m, i) => found[i] && (
          <g key={i}>
            {/* 손으로 그린 듯한 타원 — rx/ry 살짝 다르게, 약간 기울여서 마커 느낌 */}
            <ellipse
              className="marker-ring"
              cx={m.x} cy={m.y}
              rx={RING_R + 0.6} ry={RING_R - 0.3}
              transform={`rotate(-8, ${m.x}, ${m.y})`}
              fill="none"
              stroke="#e8191a"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        ))}
        {misses.filter((mm) => mm.side === side).map((mm) => (
          <g key={mm.key}>
            <line x1={mm.x - 2} y1={mm.y - 2} x2={mm.x + 2} y2={mm.y + 2} stroke="#aaa" strokeWidth={1.2} strokeLinecap="round" opacity={0.6} />
            <line x1={mm.x + 2} y1={mm.y - 2} x2={mm.x - 2} y2={mm.y + 2} stroke="#aaa" strokeWidth={1.2} strokeLinecap="round" opacity={0.6} />
          </g>
        ))}
      </svg>
      </div>
    </div>
  );

  return (
    <div className={fullscreen ? "fixed inset-0 z-[80] overflow-auto bg-black/90 p-2 md:p-4" : "contents"}>
    <div className={`overflow-hidden rounded-2xl border border-border-soft bg-bg-card shadow-card ${fullscreen ? "mx-auto w-full max-w-6xl" : ""}`}>
      <div className="relative bg-brand-navy px-5 py-3 text-center text-white">
        <h1 className="text-lg font-black tracking-wide">{game.title}</h1>
        <p className="text-[12px] text-white/70">다른 <span className="font-bold text-brand-yellow">{game.markers.length}</span>곳을 찾아보세요!</p>
        <button
          type="button"
          onClick={() => setFullscreen((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-white/25 transition-colors"
          title={fullscreen ? "닫기" : "크게 보기"}
        >
          {fullscreen ? "✕ 닫기" : "🔍 크게 보기"}
        </button>
      </div>

      <div className={`grid gap-[3px] bg-brand-navy p-[3px] ${game.layout === "stack" ? "grid-cols-1" : "grid-cols-2"}`}>
        {renderImg(game.origImage, "L", "원본")}
        {renderImg(game.variantImage, "R", "틀린그림")}
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
            <div className="mx-auto mt-3 flex max-w-sm items-center gap-2">
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={12} placeholder="닉네임" className="min-w-0 flex-1 rounded-full border border-border-soft bg-bg-secondary px-4 py-2 text-sm" />
              <button onClick={submit} className="shrink-0 whitespace-nowrap rounded-full bg-brand-orange px-4 py-2 text-sm font-bold text-white">랭킹 등록</button>
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

      {/* 댓글 — 클리어해야 작성·열람 가능 (스포일러 방지) */}
      <div className="border-t border-border-soft p-5">
        <h2 className="mb-2 text-sm font-black text-text-primary">💬 댓글</h2>
        {!cleared ? (
          <div className="rounded-2xl bg-bg-secondary px-4 py-6 text-center text-sm text-text-secondary">
            🔒 다 찾으면 댓글을 쓰고 다른 사람 댓글도 볼 수 있어요!
          </div>
        ) : (
          <>
            <div className="mb-3 flex gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submitComment(); }}
                maxLength={300}
                placeholder="후기를 남겨보세요"
                className="flex-1 rounded-full border border-border-soft bg-bg-secondary px-4 py-2 text-sm outline-none focus:border-brand-orange"
              />
              <button
                onClick={submitComment}
                disabled={commentSending || !commentText.trim()}
                className="shrink-0 rounded-full bg-brand-orange px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
              >등록</button>
            </div>
            {comments.length === 0 ? (
              <p className="py-4 text-center text-[13px] text-text-secondary">첫 댓글의 주인공이 되어보세요!</p>
            ) : (
              <div className="space-y-2.5">
                {comments.map((c, i) => (
                  <div key={i} className="rounded-xl bg-bg-secondary px-3.5 py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-bold text-text-primary">{c.name}</span>
                      <span className="text-[10px] text-text-secondary/70">
                        {new Date(c.createdAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap break-words text-[13px] text-text-secondary">{c.text}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
    </div>
  );
}
