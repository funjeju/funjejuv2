"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/common/PageHeader";

const CATEGORIES = ["카페", "식당", "숙소", "쇼핑", "체험", "관광지", "기타"];
const VIBES = ["감성적", "모던", "자연친화", "가족친화", "로맨틱", "활동적"];

export default function BizCreatePage() {
  const { user, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    businessName: "",
    category: "",
    description: "",
    address: "",
    phone: "",
    vibes: [] as string[],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggleVibe(v: string) {
    setForm((prev) => ({
      ...prev,
      vibes: prev.vibes.includes(v) ? prev.vibes.filter((x) => x !== v) : [...prev.vibes, v],
    }));
  }

  async function handleGenerate() {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/biz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "생성 실패");
      router.push(`/biz/${data.site.slug ?? data.site.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "홈페이지 생성에 실패했어요.");
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-screen-sm px-4 py-12 text-center">
        <p className="text-4xl">🏠</p>
        <p className="mt-4 text-base font-bold text-text-primary">로그인이 필요해요</p>
        <button
          type="button"
          onClick={signInWithGoogle}
          className="mt-4 rounded-full bg-brand-navy px-6 py-3 text-sm font-bold text-white"
        >
          Google로 시작하기
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-sm px-4 py-6">
      <PageHeader title="홈페이지 만들기" subtitle="AI가 자동으로 비즈니스 홈페이지를 생성해드려요" emoji="🏠" />

      {/* 진행 단계 */}
      <div className="mb-6 flex items-center gap-2 px-1">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex flex-1 items-center gap-1">
            <div className={[
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black",
              step >= s ? "bg-brand-orange text-white" : "bg-bg-secondary text-text-secondary",
            ].join(" ")}>{s}</div>
            {s < 3 && <div className={["flex-1 h-0.5", step > s ? "bg-brand-orange" : "bg-border-soft"].join(" ")} />}
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {step === 1 && (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-bold text-text-primary">상호명 *</label>
              <input
                type="text"
                value={form.businessName}
                onChange={(e) => setForm((p) => ({ ...p, businessName: e.target.value }))}
                placeholder="예: 돌담카페"
                className="w-full rounded-2xl border border-border-soft bg-bg-card px-4 py-3 text-sm outline-none focus:border-brand-orange"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-bold text-text-primary">업종</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c} type="button"
                    onClick={() => setForm((p) => ({ ...p, category: c }))}
                    className={[
                      "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                      form.category === c ? "bg-brand-orange text-white" : "border border-border-soft bg-bg-card text-text-secondary",
                    ].join(" ")}
                  >{c}</button>
                ))}
              </div>
            </div>
            <button
              type="button"
              disabled={!form.businessName}
              onClick={() => setStep(2)}
              className="w-full rounded-2xl bg-brand-orange py-3 text-sm font-bold text-white disabled:opacity-40"
            >
              다음 →
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-bold text-text-primary">소개글</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="비즈니스를 소개해주세요 (AI가 자동 보완해드려요)"
                rows={3}
                className="w-full rounded-2xl border border-border-soft bg-bg-card px-4 py-3 text-sm outline-none focus:border-brand-orange resize-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-bold text-text-primary">주소</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                placeholder="제주시 애월읍 ..."
                className="w-full rounded-2xl border border-border-soft bg-bg-card px-4 py-3 text-sm outline-none focus:border-brand-orange"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-bold text-text-primary">전화번호</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="064-000-0000"
                className="w-full rounded-2xl border border-border-soft bg-bg-card px-4 py-3 text-sm outline-none focus:border-brand-orange"
              />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(1)} className="flex-1 rounded-2xl border border-border-soft py-3 text-sm font-bold text-text-secondary">← 이전</button>
              <button type="button" onClick={() => setStep(3)} className="flex-1 rounded-2xl bg-brand-orange py-3 text-sm font-bold text-white">다음 →</button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-bold text-text-primary">분위기 선택</label>
              <p className="mb-2 text-[11px] text-text-secondary">어울리는 분위기를 골라주세요 (여러 개 가능)</p>
              <div className="flex flex-wrap gap-2">
                {VIBES.map((v) => (
                  <button
                    key={v} type="button"
                    onClick={() => toggleVibe(v)}
                    className={[
                      "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                      form.vibes.includes(v) ? "bg-brand-navy text-white" : "border border-border-soft bg-bg-card text-text-secondary",
                    ].join(" ")}
                  >{v}</button>
                ))}
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-live-red/10 px-4 py-3 text-sm text-live-red">{error}</div>
            )}

            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(2)} className="flex-1 rounded-2xl border border-border-soft py-3 text-sm font-bold text-text-secondary">← 이전</button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                className="flex-1 rounded-2xl bg-brand-orange py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    AI 생성 중...
                  </span>
                ) : "🏠 홈페이지 생성하기"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
