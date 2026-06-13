"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/common/PageHeader";
import type { CtaButton, CtaButtonType } from "@/lib/biz/types";

const CATEGORIES = ["카페", "식당", "숙소", "쇼핑", "체험", "관광지", "기타"];
const VIBES = ["감성적", "모던", "자연친화", "가족친화", "로맨틱", "활동적"];

type KakaoPlace = {
  name: string;
  category: string;
  phone: string;
  address: string;
  roadAddress: string;
  lat: number;
  lng: number;
  placeUrl: string;
};

const CTA_PRESETS: { type: CtaButtonType; label: string }[] = [
  { type: "call", label: "전화 예약" },
  { type: "naver", label: "네이버플레이스" },
  { type: "directions", label: "길찾기" },
  { type: "kakao", label: "카카오톡" },
  { type: "link", label: "예약/링크" },
];

export default function BizCreatePage() {
  const { user, signInWithGoogle } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    businessName: "",
    category: "",
    description: "",
    address: "",
    phone: "",
    vibes: [] as string[],
    placeUrl: "",
    coordinates: undefined as { lat: number; lng: number } | undefined,
  });
  const [ctaButtons, setCtaButtons] = useState<CtaButton[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 카카오 매장 검색
  const [searching, setSearching] = useState(false);
  const [places, setPlaces] = useState<KakaoPlace[]>([]);
  const [matched, setMatched] = useState<string | null>(null);

  function toggleVibe(v: string) {
    setForm((prev) => ({
      ...prev,
      vibes: prev.vibes.includes(v) ? prev.vibes.filter((x) => x !== v) : [...prev.vibes, v],
    }));
  }

  async function searchKakao() {
    if (!form.businessName.trim()) return;
    setSearching(true);
    setPlaces([]);
    try {
      const res = await fetch(`/api/biz/kakao-search?q=${encodeURIComponent(form.businessName.trim())}`);
      const data = await res.json();
      setPlaces(data.places ?? []);
    } catch {
      setPlaces([]);
    }
    setSearching(false);
  }

  function pickPlace(p: KakaoPlace) {
    setForm((prev) => ({
      ...prev,
      businessName: p.name,
      category: prev.category || guessCategory(p.category),
      address: p.roadAddress || p.address,
      phone: p.phone,
      placeUrl: p.placeUrl,
      coordinates: p.lat && p.lng ? { lat: p.lat, lng: p.lng } : undefined,
    }));
    // 기본 CTA 자동 구성
    const auto: CtaButton[] = [];
    if (p.phone) auto.push({ type: "call", label: "전화 예약", value: p.phone });
    const naverQ = encodeURIComponent(`${p.name} ${p.roadAddress || p.address}`.trim());
    auto.push({ type: "naver", label: "네이버플레이스", value: `https://map.naver.com/p/search/${naverQ}` });
    if (p.lat && p.lng) {
      auto.push({ type: "directions", label: "길찾기", value: `https://map.kakao.com/link/to/${encodeURIComponent(p.name)},${p.lat},${p.lng}` });
    }
    setCtaButtons(auto.slice(0, 3));
    setMatched(p.name);
    setPlaces([]);
  }

  function guessCategory(kakaoCat: string): string {
    if (/카페|커피|디저트/.test(kakaoCat)) return "카페";
    if (/음식|식당|한식|일식|중식|양식|분식|고기/.test(kakaoCat)) return "식당";
    if (/숙박|펜션|호텔|게스트/.test(kakaoCat)) return "숙소";
    if (/관광|명소|공원|오름/.test(kakaoCat)) return "관광지";
    return "";
  }

  function updateCta(i: number, patch: Partial<CtaButton>) {
    setCtaButtons((prev) => prev.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  }
  function removeCta(i: number) {
    setCtaButtons((prev) => prev.filter((_, idx) => idx !== i));
  }
  function addCta(type: CtaButtonType) {
    if (ctaButtons.length >= 3) return;
    const preset = CTA_PRESETS.find((p) => p.type === type)!;
    let value = "";
    if (type === "call") value = form.phone;
    else if (type === "naver") value = `https://map.naver.com/p/search/${encodeURIComponent(`${form.businessName} ${form.address}`.trim())}`;
    else if (type === "directions" && form.coordinates) value = `https://map.kakao.com/link/to/${encodeURIComponent(form.businessName)},${form.coordinates.lat},${form.coordinates.lng}`;
    setCtaButtons((prev) => [...prev, { type, label: preset.label, value }]);
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
        body: JSON.stringify({
          businessName: form.businessName,
          category: form.category,
          description: form.description,
          address: form.address,
          phone: form.phone,
          vibes: form.vibes,
          placeUrl: form.placeUrl || undefined,
          coordinates: form.coordinates,
          ctaButtons: ctaButtons.filter((b) => b.value.trim()).slice(0, 3),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "생성 실패");
      // 소프트 네비게이션(router.push)은 브라우저/RSC 캐시에 박힌 옛 404를 만날 수 있어,
      // 전체 새로고침으로 항상 신선한 서버 렌더(200)를 받게 한다.
      window.location.href = `/biz/${data.site.slug ?? data.site.siteId}`;
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

  const inputCls = "w-full rounded-2xl border border-border-soft bg-bg-card px-4 py-3 text-sm outline-none focus:border-brand-orange";

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
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.businessName}
                  onChange={(e) => { setForm((p) => ({ ...p, businessName: e.target.value })); setMatched(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") searchKakao(); }}
                  placeholder="예: 돌담카페"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={searchKakao}
                  disabled={!form.businessName.trim() || searching}
                  className="shrink-0 rounded-2xl bg-brand-navy px-4 text-sm font-bold text-white disabled:opacity-40"
                >
                  {searching ? "검색…" : "🔍 찾기"}
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-text-secondary">
                카카오맵에서 가게를 찾으면 정확한 이름·주소·전화·좌표가 자동으로 채워져요.
              </p>
            </div>

            {/* 카카오 검색 결과 */}
            {places.length > 0 && (
              <div className="space-y-2 rounded-2xl border border-border-soft bg-bg-secondary p-2">
                {places.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => pickPlace(p)}
                    className="block w-full rounded-xl bg-bg-card px-3 py-2.5 text-left transition-colors hover:bg-brand-orange/10"
                  >
                    <p className="text-sm font-bold text-text-primary">{p.name}</p>
                    <p className="text-[11px] text-text-secondary">{p.category} · {p.roadAddress || p.address}</p>
                  </button>
                ))}
              </div>
            )}

            {matched && (
              <div className="rounded-xl bg-jeju-green/10 px-4 py-2.5 text-sm text-jeju-green">
                ✅ <b>{matched}</b> 정보를 불러왔어요
              </div>
            )}

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
                className={`${inputCls} resize-none`}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-bold text-text-primary">주소</label>
              <input type="text" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} placeholder="제주시 애월읍 ..." className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-bold text-text-primary">전화번호</label>
              <input type="tel" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder="064-000-0000" className={inputCls} />
            </div>

            {/* CTA 버튼 편집기 (최대 3개) */}
            <div>
              <label className="mb-1.5 block text-sm font-bold text-text-primary">
                바로가기 버튼 <span className="text-text-secondary">({ctaButtons.length}/3)</span>
              </label>
              <p className="mb-2 text-[11px] text-text-secondary">홈페이지 하단에 고정되는 버튼이에요. 전화·네이버플레이스·길찾기 등 최대 3개.</p>
              <div className="space-y-2">
                {ctaButtons.map((b, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-xl border border-border-soft bg-bg-card p-2">
                    <select
                      value={b.type}
                      onChange={(e) => updateCta(i, { type: e.target.value as CtaButtonType })}
                      className="shrink-0 rounded-lg border border-border-soft bg-bg-secondary px-2 py-1.5 text-xs"
                    >
                      {CTA_PRESETS.map((p) => <option key={p.type} value={p.type}>{p.label}</option>)}
                    </select>
                    <input
                      value={b.label}
                      onChange={(e) => updateCta(i, { label: e.target.value })}
                      placeholder="버튼 이름"
                      className="w-20 shrink-0 rounded-lg border border-border-soft bg-bg-secondary px-2 py-1.5 text-xs"
                    />
                    <input
                      value={b.value}
                      onChange={(e) => updateCta(i, { value: e.target.value })}
                      placeholder={b.type === "call" ? "전화번호" : "URL"}
                      className="min-w-0 flex-1 rounded-lg border border-border-soft bg-bg-secondary px-2 py-1.5 text-xs"
                    />
                    <button type="button" onClick={() => removeCta(i)} className="shrink-0 text-text-secondary hover:text-live-red">✕</button>
                  </div>
                ))}
              </div>
              {ctaButtons.length < 3 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {CTA_PRESETS.map((p) => (
                    <button
                      key={p.type} type="button"
                      onClick={() => addCta(p.type)}
                      className="rounded-full border border-border-soft bg-bg-card px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-bg-secondary"
                    >+ {p.label}</button>
                  ))}
                </div>
              )}
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
