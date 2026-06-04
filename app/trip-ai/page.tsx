"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { useSaved } from "@/hooks/useSaved";
import { mockCctvs } from "@/constants/mock-cctvs";

const STYLES = [
  { id: "healing",  emoji: "🌿", label: "힐링·휴식",  desc: "자연 속에서 느리게" },
  { id: "food",     emoji: "🍖", label: "맛집 탐방",  desc: "제주 미식 여행" },
  { id: "activity", emoji: "🏄", label: "액티비티",   desc: "서핑·트래킹·레저" },
  { id: "culture",  emoji: "🏛️", label: "문화·역사",  desc: "박물관·유적지" },
  { id: "cafe",     emoji: "☕", label: "카페 투어",  desc: "감성 카페 순례" },
  { id: "family",   emoji: "👨‍👩‍👧", label: "가족 여행",  desc: "아이와 함께" },
];

const DAYS_OPTIONS    = ["당일치기", "1박 2일", "2박 3일", "3박 4일"];
const TRAVELER_OPTIONS = ["혼자", "커플 (2명)", "친구 (3-4명)", "가족"];

// 사용자가 직접 추가할 수 있는 예시 스팟
const SUGGEST_SPOTS = ["한라산", "성산일출봉", "협재해변", "만장굴", "오설록", "우도", "섭지코지", "천지연폭포", "중문해수욕장"];

type Day = { day: number; theme: string; items: { time: string; spot: string; category: string; emoji: string; comment: string; duration: string }[] };
type Plan = { title: string; overview: string; days: Day[]; tips: string[]; closing: string };

export default function TripAiPage() {
  const { savedIds } = useSaved();
  const [styleId,   setStyleId]   = useState("healing");
  const [days,      setDays]      = useState("1박 2일");
  const [travelers, setTravelers] = useState("커플 (2명)");
  const [loading,   setLoading]   = useState(false);
  const [plan,      setPlan]      = useState<Plan | null>(null);
  const [error,     setError]     = useState("");
  const [addInput,  setAddInput]  = useState("");

  // 저장된 스팟 이름 목록 (초기 선택 상태)
  const savedSpotNames = useMemo(
    () => mockCctvs.filter((c) => savedIds.has(c.id)).map((c) => c.name),
    [savedIds]
  );
  const [selectedSpots, setSelectedSpots] = useState<string[]>(() => savedSpotNames);

  // savedIds가 바뀌면 selectedSpots도 업데이트 (초기 로드 후)
  // (hook 내부에서 처리하거나, 사용자가 직접 수정 가능하므로 초기값만 사용)

  function toggleSpot(name: string) {
    setSelectedSpots((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  }

  function addCustomSpot() {
    const trimmed = addInput.trim();
    if (!trimmed || selectedSpots.includes(trimmed)) { setAddInput(""); return; }
    setSelectedSpots((prev) => [...prev, trimmed]);
    setAddInput("");
  }

  async function generatePlan() {
    setLoading(true);
    setError("");
    setPlan(null);

    const daysNum = days === "당일치기" ? 1 : parseInt(days.match(/\d+박/)?.[0] ?? "1") + 1;
    const styleLabel = STYLES.find((s) => s.id === styleId)?.label ?? "힐링·휴식";
    const spots = selectedSpots.length > 0 ? selectedSpots : ["협재 해변", "성산일출봉", "오설록"];

    try {
      const res = await fetch("/api/trip-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spots, style: styleLabel, days: daysNum, travelers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "일정 생성 실패");
      setPlan(data as Plan);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했어요");
    } finally {
      setLoading(false);
    }
  }

  // ── 설정 화면 ──────────────────────────────────────────────
  if (!plan) return (
    <div className="mx-auto max-w-4xl px-0 md:px-4 md:py-6">
      <PageHeader title="AI 여행 일정" subtitle="나만의 맞춤 제주 일정을 돌맹이가 짜드려요" emoji="🗓️" />

      {/* 1. 여행 스타일 */}
      <section className="mb-5 px-4 md:px-0">
        <h2 className="mb-3 text-base font-bold text-text-primary">여행 스타일 선택</h2>
        <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
          {STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStyleId(s.id)}
              className={[
                "flex flex-col items-center gap-1.5 rounded-2xl border p-3 transition-all",
                styleId === s.id
                  ? "border-brand-orange bg-brand-orange/10 shadow-soft"
                  : "border-border-soft bg-bg-card hover:border-brand-orange/40",
              ].join(" ")}
            >
              <span className="text-2xl">{s.emoji}</span>
              <span className={["text-[11px] font-bold", styleId === s.id ? "text-brand-orange" : "text-text-primary"].join(" ")}>
                {s.label}
              </span>
              <span className="text-[9px] text-text-secondary">{s.desc}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 2. 포함할 스팟 */}
      <section className="mb-5 px-4 md:px-0">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-text-primary">
            포함할 스팟
            <span className="ml-1.5 rounded-full bg-brand-orange/10 px-2 py-0.5 text-xs font-bold text-brand-orange">
              {selectedSpots.length}개
            </span>
          </h2>
          {selectedSpots.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedSpots([])}
              className="text-[11px] text-text-secondary hover:text-live-red transition-colors"
            >
              전체 해제
            </button>
          )}
        </div>

        {/* 선택된 스팟 */}
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedSpots.length === 0 ? (
            <div className="w-full rounded-2xl border border-dashed border-border-soft bg-bg-secondary/30 p-4 text-center">
              <p className="text-xs text-text-secondary">
                스팟 없이 진행하면 돌맹이가 알아서 추천해줄게요!
              </p>
            </div>
          ) : (
            selectedSpots.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => toggleSpot(name)}
                className="flex items-center gap-1 rounded-full bg-brand-orange/10 px-3 py-1.5 text-xs font-semibold text-brand-orange hover:bg-live-red/10 hover:text-live-red transition-colors group"
              >
                📍 {name}
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">✕</span>
              </button>
            ))
          )}
        </div>

        {/* 빠른 추가 제안 */}
        <div className="mb-2">
          <p className="mb-1.5 text-[10px] font-medium text-text-secondary">빠른 추가</p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGEST_SPOTS.filter((s) => !selectedSpots.includes(s)).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSpot(s)}
                className="rounded-full border border-border-soft bg-bg-card px-2.5 py-1 text-[11px] font-medium text-text-secondary hover:border-brand-orange hover:text-brand-orange transition-colors"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>

        {/* 직접 입력 */}
        <div className="flex gap-2">
          <input
            type="text"
            value={addInput}
            onChange={(e) => setAddInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustomSpot()}
            placeholder="직접 스팟 입력..."
            className="flex-1 rounded-xl border border-border-soft bg-bg-secondary px-3 py-2 text-xs outline-none focus:border-brand-orange"
          />
          <button
            type="button"
            onClick={addCustomSpot}
            disabled={!addInput.trim()}
            className="rounded-xl bg-brand-orange px-4 py-2 text-xs font-bold text-white hover:bg-brand-orange/90 disabled:opacity-40 transition-colors"
          >
            추가
          </button>
        </div>
      </section>

      {/* 3. CTA 카드 (기간 + 인원 + 생성 버튼) */}
      <div className="mx-4 mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-navy to-blue-600 p-5 text-white md:mx-0">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-white/70">AI 맞춤 일정 생성</p>
            <h2 className="mt-1 text-lg font-black">
              제주 여행 일정,<br />나한테 맡겨봐! 🗿
            </h2>
            <p className="mt-1 text-xs text-white/80">
              {selectedSpots.length > 0
                ? <>스팟 <span className="font-bold">{selectedSpots.length}개</span>로 최적 동선 생성</>
                : "돌맹이가 알아서 최적 코스 추천"}
            </p>
          </div>
          <span className="text-5xl">🗿</span>
        </div>

        <div className="mt-4 space-y-2">
          <div>
            <p className="mb-1.5 text-[10px] text-white/60">여행 기간</p>
            <div className="flex flex-wrap gap-1.5">
              {DAYS_OPTIONS.map((d) => (
                <button key={d} type="button" onClick={() => setDays(d)}
                  className={["rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                    days === d ? "bg-brand-yellow text-brand-navy" : "bg-white/10 text-white hover:bg-white/20"].join(" ")}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[10px] text-white/60">여행 인원</p>
            <div className="flex flex-wrap gap-1.5">
              {TRAVELER_OPTIONS.map((t) => (
                <button key={t} type="button" onClick={() => setTravelers(t)}
                  className={["rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                    travelers === t ? "bg-brand-yellow text-brand-navy" : "bg-white/10 text-white hover:bg-white/20"].join(" ")}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={generatePlan}
          disabled={loading}
          className="mt-4 w-full rounded-xl bg-brand-yellow py-3 text-sm font-black text-brand-navy hover:bg-brand-yellow/90 disabled:opacity-50 transition-colors"
        >
          {loading ? "🗿 돌맹이가 일정 짜는 중..." : "✨ AI 일정 만들기"}
        </button>
        {error && <p className="mt-2 text-xs font-semibold text-red-200">❌ {error}</p>}
      </div>
    </div>
  );

  // ── 결과 화면 ──────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-4xl px-0 md:px-4 md:py-6">
      <PageHeader title="AI 여행 일정" subtitle="나만의 맞춤 제주 일정을 돌맹이가 짜드려요" emoji="🗓️" />
      <div className="mx-4 space-y-4 md:mx-0">
        <div className="rounded-2xl bg-gradient-to-br from-brand-navy to-blue-600 p-5 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] text-white/70">🗿 돌맹이가 짜준 일정</p>
              <h2 className="mt-1 text-lg font-black">{plan.title}</h2>
              <p className="mt-2 text-xs leading-5 text-white/90">{plan.overview}</p>
            </div>
            <button type="button" onClick={() => setPlan(null)}
              className="shrink-0 rounded-full border border-white/30 px-3 py-1.5 text-[11px] font-medium hover:bg-white/10 transition-colors">
              다시 만들기
            </button>
          </div>
        </div>

        {plan.days.map((d) => (
          <div key={d.day} className="rounded-2xl border border-border-soft bg-bg-card p-5 shadow-card">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-orange text-xs font-black text-white">D{d.day}</span>
              <p className="text-sm font-bold text-text-primary">{d.theme}</p>
            </div>
            <div className="space-y-2">
              {d.items.map((item, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex w-12 shrink-0 flex-col items-center">
                    <span className="text-[10px] font-bold text-brand-navy">{item.time}</span>
                    <div className="mt-1 h-full w-px bg-border-soft" />
                  </div>
                  <div className="flex-1 rounded-xl bg-bg-secondary/50 p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{item.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-text-primary">{item.spot}</p>
                        <div className="flex items-center gap-1.5">
                          <span className="rounded-full bg-bg-card px-2 py-0.5 text-[9px] font-medium text-text-secondary">{item.category}</span>
                          <span className="text-[10px] text-text-secondary">⏱ {item.duration}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-brand-yellow/20 p-2">
                      <span className="text-sm">🗿</span>
                      <p className="text-[11px] leading-5 text-text-primary">{item.comment}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {plan.tips.length > 0 && (
          <div className="rounded-2xl border border-brand-navy/20 bg-brand-navy/5 p-5">
            <p className="mb-2 text-sm font-bold text-brand-navy">💡 돌맹이 꿀팁</p>
            <ul className="space-y-1.5">
              {plan.tips.map((tip, i) => <li key={i} className="text-xs leading-5 text-text-primary">• {tip}</li>)}
            </ul>
          </div>
        )}

        <div className="rounded-2xl bg-brand-yellow/20 p-5 text-center">
          <span className="text-3xl">🗿</span>
          <p className="mt-2 text-sm font-medium text-text-primary">{plan.closing}</p>
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={() => window.print()}
            className="flex-1 rounded-xl border border-border-soft bg-bg-card py-3 text-sm font-semibold text-text-secondary hover:bg-bg-secondary transition-colors">
            📥 저장하기
          </button>
          <button type="button" onClick={generatePlan} disabled={loading}
            className="flex-1 rounded-xl bg-brand-orange py-3 text-sm font-bold text-white hover:bg-brand-orange/90 disabled:opacity-50 transition-colors">
            🔄 다시 만들기
          </button>
        </div>
      </div>
    </div>
  );
}
