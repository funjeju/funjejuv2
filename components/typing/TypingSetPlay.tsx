"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usageHeaders } from "@/lib/client-usage";
import { TypingPlay } from "./TypingPlay";
import type { TypingPassage, TypingSet, TypingSetScore } from "@/types/typing";

type R = { cpm: number; accuracy: number; score: number };

export function TypingSetPlay({ set, passages }: { set: TypingSet; passages: TypingPassage[] }) {
  const { user } = useAuth();
  const total = passages.length;
  const shortN = passages.filter((p) => p.kind === "short").length;
  const longN = total - shortN;

  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState<R[]>([]);
  const [avg, setAvg] = useState<R | null>(null);
  const [top, setTop] = useState<TypingSetScore[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => { if (user?.displayName) setName(user.displayName); }, [user]);

  const loadRank = useCallback(async () => {
    const h = await usageHeaders(user);
    const r = await fetch(`/api/typing/set?setId=${set.id}`, { headers: h });
    const d = await r.json();
    setTop(d.top ?? []); setAttempts(d.attempts ?? 0);
  }, [user, set.id]);
  useEffect(() => { loadRank(); }, [loadRank]);

  const attemptsLeft = set.maxAttempts > 0 ? Math.max(0, set.maxAttempts - attempts) : null;
  const outOfTries = set.maxAttempts > 0 && attempts >= set.maxAttempts;

  async function onOne(r: R) {
    const next = [...results, r];
    if (idx + 1 < total) {
      setResults(next); setIdx(idx + 1);
    } else {
      // 마지막 — 평균 집계 + 제출
      const avgScore = Math.round(next.reduce((s, x) => s + x.score, 0) / next.length);
      const avgCpm = Math.round(next.reduce((s, x) => s + x.cpm, 0) / next.length);
      const avgAccuracy = next.reduce((s, x) => s + x.accuracy, 0) / next.length;
      setResults(next); setAvg({ cpm: avgCpm, accuracy: avgAccuracy, score: avgScore });
      const h = await usageHeaders(user);
      const res = await fetch("/api/typing/set", {
        method: "POST", headers: { ...h, "Content-Type": "application/json" },
        body: JSON.stringify({ setId: set.id, name, avgScore, avgCpm, avgAccuracy }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setMsg(d.error ?? "제출 실패");
      loadRank();
    }
  }

  function restart() {
    setStarted(false); setIdx(0); setResults([]); setAvg(null); setMsg("");
  }

  // 플레이 중
  if (started && !avg) {
    return (
      <TypingPlay
        key={idx}
        passage={passages[idx]}
        progress={{ cur: idx + 1, total }}
        isLast={idx + 1 === total}
        onComplete={onOne}
      />
    );
  }

  return (
    <div>
      {/* 세트 헤더 */}
      <div className="rounded-2xl bg-gradient-to-br from-brand-navy to-blue-700 px-4 py-4 text-center text-white">
        <p className="text-[11px] text-white/70">{set.businessName || "타자연습 세트"}</p>
        <p className="text-lg font-black">{set.title}</p>
        <p className="mt-0.5 text-[11px] text-brand-yellow">
          총 {total}개 (단문 {shortN}·장문 {longN}) · 평균 타수로 순위 {attemptsLeft != null ? `· 이번 주 ${attemptsLeft}회 남음` : "· 무제한"}
        </p>
      </div>

      {/* 세트 결과 */}
      {avg && (
        <div className="mt-3 rounded-2xl border border-brand-orange/40 bg-brand-orange/5 p-4 text-center">
          <p className="text-sm font-black text-text-primary">🎉 세트 완료! (평균)</p>
          <div className="mt-2 flex justify-center gap-6">
            <div><p className="text-2xl font-black text-brand-navy">{avg.cpm}</p><p className="text-[10px] text-text-secondary">평균 타수</p></div>
            <div><p className="text-2xl font-black text-brand-navy">{Math.round(avg.accuracy * 100)}%</p><p className="text-[10px] text-text-secondary">평균 정확도</p></div>
            <div><p className="text-2xl font-black text-brand-orange">{avg.score}</p><p className="text-[10px] text-text-secondary">세트 점수</p></div>
          </div>
          {/* 개별 기록 */}
          <div className="mt-2 flex flex-wrap justify-center gap-1">
            {results.map((r, i) => (
              <span key={i} className="rounded-full bg-bg-secondary px-2 py-0.5 text-[10px] text-text-secondary">{i + 1}. {r.cpm}타·{Math.round(r.accuracy * 100)}%</span>
            ))}
          </div>
          {msg && <p className="mt-1.5 text-[11px] font-bold text-live-red">{msg}</p>}
          {!outOfTries && <button onClick={restart} className="mt-3 rounded-full bg-brand-navy px-5 py-2 text-sm font-bold text-white">세트 다시 도전</button>}
        </div>
      )}

      {/* 시작 */}
      {!started && !avg && (
        outOfTries
          ? <p className="mt-3 rounded-xl bg-bg-secondary px-4 py-3 text-center text-sm text-text-secondary">이번 주 도전 횟수를 다 썼어요. 다음 주에 다시! 🗓️</p>
          : <button onClick={() => setStarted(true)} className="mt-3 w-full rounded-full bg-brand-orange py-3.5 text-sm font-black text-white">▶ 세트 시작 ({total}개 연속)</button>
      )}

      {/* 세트 주간 순위 */}
      <div className="mt-5">
        <p className="mb-2 text-xs font-bold text-text-secondary">🏆 이번 주 세트 순위 (평균 점수)</p>
        <div className="space-y-1">
          {top.map((s, i) => (
            <div key={s.userId} className="flex items-center gap-3 rounded-xl border border-border-soft bg-bg-card px-3 py-2">
              <span className="w-5 shrink-0 text-sm font-black text-text-secondary">{i === 0 ? "👑" : i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-bold text-text-primary">{s.name}</span>
              <span className="shrink-0 text-[11px] text-text-secondary">평균 {s.bestAvgCpm}타 · {Math.round(s.bestAvgAccuracy * 100)}%</span>
              <span className="shrink-0 text-sm font-black text-brand-orange">{s.bestAvgScore}</span>
            </div>
          ))}
          {top.length === 0 && <p className="py-6 text-center text-sm text-text-secondary">이번 주 1등의 주인공이 되어보세요!</p>}
        </div>
      </div>
    </div>
  );
}
