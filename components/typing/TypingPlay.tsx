"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usageHeaders } from "@/lib/client-usage";
import type { TypingPassage, TypingScore } from "@/types/typing";

type Result = { cpm: number; accuracy: number; score: number };

export function TypingPlay({ passage }: { passage: TypingPassage }) {
  const { user } = useAuth();
  const target = passage.text;
  const W = passage.weightW ?? 1;

  const [value, setValue] = useState("");
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [top, setTop] = useState<TypingScore[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [liveCpm, setLiveCpm] = useState(0);   // 실시간 타수
  const [liveAcc, setLiveAcc] = useState(1);    // 실시간 정확도
  const [muted, setMuted] = useState(false);

  const startedAt = useRef<number | null>(null);
  const lockedUpTo = useRef(0); // 확정 평가된 글자 인덱스
  const errors = useRef(0);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<AudioContext | null>(null);

  // 합성 사운드 (에셋 없이 Web Audio) — 타건/오타/완료
  function beep(freq: number, durMs: number, type: OscillatorType = "square", vol = 0.04) {
    if (muted || typeof window === "undefined") return;
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioRef.current) audioRef.current = new AC();
      const ctx = audioRef.current;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durMs / 1000);
      o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + durMs / 1000);
    } catch { /* 오디오 미지원 무시 */ }
  }
  const sClick = () => beep(440, 28, "square", 0.025);
  const sError = () => beep(150, 80, "sawtooth", 0.05);
  const sDone = () => { beep(660, 90); setTimeout(() => beep(880, 110), 90); setTimeout(() => beep(1175, 160), 200); };

  useEffect(() => { if (user?.displayName) setName(user.displayName); }, [user]);

  const loadRank = useCallback(async () => {
    const h = await usageHeaders(user);
    const r = await fetch(`/api/typing?passageId=${passage.id}`, { headers: h });
    const d = await r.json();
    setTop(d.top ?? []); setAttempts(d.attempts ?? 0);
  }, [user, passage.id]);
  useEffect(() => { loadRank(); }, [loadRank]);

  const attemptsLeft = passage.maxAttempts > 0 ? Math.max(0, passage.maxAttempts - attempts) : null;
  const outOfTries = passage.maxAttempts > 0 && attempts >= passage.maxAttempts;

  function reset() {
    setValue(""); setFinished(false); setResult(null); setMsg("");
    setLiveCpm(0); setLiveAcc(1);
    startedAt.current = null; lockedUpTo.current = 0; errors.current = 0;
    taRef.current?.focus();
  }

  function onChange(v: string) {
    if (finished) return;
    if (startedAt.current == null && v.length > 0) startedAt.current = Date.now();
    // 프론티어(마지막 조합 중 글자) 이전까지 확정 평가 — 조합형 한글 안전
    const frontier = v.length >= target.length ? target.length : v.length - 1;
    let newErr = 0, advanced = false;
    for (let i = lockedUpTo.current; i < frontier; i++) {
      advanced = true;
      if (v[i] !== target[i]) { errors.current++; newErr++; }
    }
    if (advanced) (newErr > 0 ? sError : sClick)();
    lockedUpTo.current = Math.max(lockedUpTo.current, frontier);
    // 실시간 타수·정확도
    if (startedAt.current) {
      const min = (Date.now() - startedAt.current) / 60000;
      if (min > 0) setLiveCpm(Math.round(v.length / min));
      const evaluated = lockedUpTo.current;
      setLiveAcc(evaluated > 0 ? Math.max(0, (evaluated - errors.current) / evaluated) : 1);
    }
    setValue(v);
    if (v.length >= target.length) finish(v);
  }

  async function finish(v: string) {
    setFinished(true);
    const elapsedMin = Math.max(0.001, (Date.now() - (startedAt.current ?? Date.now())) / 60000);
    const cpm = Math.round(target.length / elapsedMin);
    const accuracy = Math.max(0, (target.length - errors.current) / target.length);
    const score = Math.round(cpm * Math.pow(accuracy, W));
    const res = { cpm, accuracy, score };
    setResult(res);
    sDone();
    // 제출
    setSubmitting(true);
    const h = await usageHeaders(user);
    const r = await fetch("/api/typing", {
      method: "POST", headers: { ...h, "Content-Type": "application/json" },
      body: JSON.stringify({ passageId: passage.id, name, cpm, accuracy, score }),
    });
    const d = await r.json().catch(() => ({}));
    setSubmitting(false);
    if (!r.ok) setMsg(d.error ?? "제출 실패");
    loadRank();
  }

  // 지문 글자별 색상 (실시간)
  const chars = [...target].map((c, i) => {
    let cls = "text-text-secondary/40";
    if (i < value.length) cls = value[i] === c ? "text-jeju-green" : "bg-live-red/20 text-live-red";
    else if (i === value.length && !finished) cls = "border-b-2 border-brand-orange text-text-primary";
    return <span key={i} className={cls}>{c === " " ? " " : c}</span>;
  });

  return (
    <div>
      <div className="relative rounded-2xl bg-brand-navy px-4 py-3 text-white">
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          className="absolute right-3 top-2.5 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-bold"
          title="사운드 켜기/끄기"
        >
          {muted ? "🔇" : "🔊"}
        </button>
        <p className="text-center text-[11px] text-white/70">{passage.businessName || "타자연습"} · {passage.kind === "long" ? "장문" : "단문"}</p>
        {/* 실시간 타수·정확도 */}
        <div className="mt-1 flex items-end justify-center gap-6">
          <div className="text-center"><p className="text-3xl font-black leading-none">{liveCpm}</p><p className="text-[10px] text-white/60">타수(글자/분)</p></div>
          <div className="text-center"><p className="text-3xl font-black leading-none text-brand-yellow">{Math.round(liveAcc * 100)}%</p><p className="text-[10px] text-white/60">정확도</p></div>
        </div>
        <p className="mt-1 text-center text-[10px] text-white/50">
          점수 = 타수 × 정확도^{W} {attemptsLeft != null ? `· 이번 주 ${attemptsLeft}회 남음` : "· 무제한"}
        </p>
      </div>

      {/* 진행바 */}
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-secondary">
        <div className="h-full bg-brand-orange transition-all" style={{ width: `${Math.min(100, Math.round((value.length / target.length) * 100))}%` }} />
      </div>

      {/* 지문 */}
      <div className="mt-2 rounded-2xl border border-border-soft bg-bg-card p-4 text-lg leading-9 shadow-card">
        {chars}
      </div>

      {/* 입력 */}
      {!finished && !outOfTries && (
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={(e) => e.preventDefault()}
          autoFocus
          rows={3}
          placeholder="여기에 위 지문을 그대로 입력하세요 (붙여넣기 불가)"
          className="mt-3 w-full rounded-2xl border border-border-soft p-3 text-base outline-none focus:border-brand-orange"
        />
      )}
      {outOfTries && !finished && (
        <p className="mt-3 rounded-xl bg-bg-secondary px-4 py-3 text-center text-sm text-text-secondary">이번 주 도전 횟수를 다 썼어요. 다음 주에 다시! 🗓️</p>
      )}

      {/* 결과 */}
      {result && (
        <div className="mt-3 rounded-2xl border border-brand-orange/40 bg-brand-orange/5 p-4 text-center">
          <p className="text-sm font-bold text-text-primary">{submitting ? "기록 저장 중…" : "완료! 🎉"}</p>
          <div className="mt-2 flex justify-center gap-6">
            <div><p className="text-2xl font-black text-brand-navy">{result.cpm}</p><p className="text-[10px] text-text-secondary">타수(글자/분)</p></div>
            <div><p className="text-2xl font-black text-brand-navy">{Math.round(result.accuracy * 100)}%</p><p className="text-[10px] text-text-secondary">정확도</p></div>
            <div><p className="text-2xl font-black text-brand-orange">{result.score}</p><p className="text-[10px] text-text-secondary">최종점수</p></div>
          </div>
          {msg && <p className="mt-1.5 text-[11px] font-bold text-live-red">{msg}</p>}
          {!outOfTries && <button onClick={reset} className="mt-3 rounded-full bg-brand-navy px-5 py-2 text-sm font-bold text-white">다시 도전</button>}
        </div>
      )}

      {/* 주간 순위 */}
      <div className="mt-4">
        <p className="mb-2 text-xs font-bold text-text-secondary">🏆 이번 주 순위</p>
        <div className="space-y-1">
          {top.map((s, i) => (
            <div key={s.userId} className="flex items-center gap-3 rounded-xl border border-border-soft bg-bg-card px-3 py-2">
              <span className="w-5 shrink-0 text-sm font-black text-text-secondary">{i === 0 ? "👑" : i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-bold text-text-primary">{s.name}</span>
              <span className="shrink-0 text-[11px] text-text-secondary">{s.bestCpm}타 · {Math.round(s.bestAccuracy * 100)}%</span>
              <span className="shrink-0 text-sm font-black text-brand-orange">{s.bestScore}</span>
            </div>
          ))}
          {top.length === 0 && <p className="py-6 text-center text-sm text-text-secondary">이번 주 1등의 주인공이 되어보세요!</p>}
        </div>
      </div>
    </div>
  );
}
