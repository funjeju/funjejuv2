"use client";

import { useEffect, useMemo, useState } from "react";
import { DolmangyiIcon } from "@/components/common/DolmangyiIcon";
import { PageHeader } from "@/components/common/PageHeader";
import { TripResultView } from "@/components/trip/TripResultView";
import { AccommodationPicker } from "@/components/trip/AccommodationPicker";
import { MySpotsSelector } from "@/components/trip/MySpotsSelector";
import { useAuth } from "@/hooks/useAuth";
import { useSaved } from "@/hooks/useSaved";
import { saveTripPlan, listTripPlans, getTripPlan, deleteTripPlan } from "@/lib/trip-plans";
import { listMySpots } from "@/lib/my-spots";
import { mockCctvs } from "@/constants/mock-cctvs";
import type { TripPlan, TripPlanRequest, SavedTripPlan, BookedAccommodation } from "@/types/trip";
import type { MySpot } from "@/types/my-spot";

// ── 폼 상태 (TripPlannerModal 기반) ─────────────────────────
type FormState = {
  nights: number;
  days: number;
  arrivalHour: string;
  arrivalMinute: string;
  departureHour: string;
  departureMinute: string;
  companions: string[];
  transportation: string;
  accommodationStatus: "booked" | "not_booked" | null;
  bookedAccommodations: BookedAccommodation[];
  remainingNightsPlan: "stay_at_first" | "recommend_rest" | null;
  tripStyle: string;
  accommodationRecommendationStyle: "base_camp" | "daily_move" | null;
  preferredAccommodationRegion: string;
  accommodationType: string[];
  accommodationBudget: string;
  pace: string;
  interests: string[];
  interestWeights: { [key: string]: number };
  restaurantStyle: string;
  mustVisitRestaurants: string[];
  mustVisitSpots: string[];
};

const initialFormState: FormState = {
  nights: 2,
  days: 3,
  arrivalHour: "10",
  arrivalMinute: "00",
  departureHour: "18",
  departureMinute: "00",
  companions: [],
  transportation: "렌터카",
  accommodationStatus: null,
  bookedAccommodations: [],
  remainingNightsPlan: null,
  tripStyle: "",
  accommodationRecommendationStyle: null,
  preferredAccommodationRegion: "",
  accommodationType: [],
  accommodationBudget: "",
  pace: "보통",
  interests: [],
  interestWeights: {},
  restaurantStyle: "",
  mustVisitRestaurants: [""],
  mustVisitSpots: [""],
};

const COMPANION_OPTIONS = ["혼자", "친구와", "연인과", "아이를 동반한 가족", "부모님을 모시고", "반려견과 함께", "회사 동료와"];
const TRANSPORTATION_OPTIONS = ["렌터카", "대중교통", "택시/투어 상품 이용"];
const PACE_OPTIONS = ["여유롭게", "보통", "촘촘하게"];
const INTEREST_OPTIONS = ["#자연 (숲, 오름, 바다)", "#오션뷰 (카페, 식당, 숙소)", "#요즘 뜨는 핫플", "#쇼핑 & 소품샵", "#박물관 & 미술관", "#역사 & 문화 유적", "#짜릿한 액티비티", "#걷기 좋은 길"];
const RESTAURANT_STYLE_OPTIONS = ["가성비 좋은 현지인 맛집 위주", "유명하고 검증된 관광객 맛집 위주", "분위기 좋은 감성 맛집 위주"];
const ACCOMMODATION_TYPES = ["호텔", "펜션/풀빌라", "게스트하우스", "감성 숙소"];
const ACCOMMODATION_BUDGETS = ["10만원 이하", "10~20만원", "20~30만원", "30만원 이상"];
const TRIP_STYLE_OPTIONS = ["전체 저예산 위주", "중간 (적당히 절약 + 포인트 투자)", "고급 (숙소·식사·체험 모두 고급 위주)"];
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
const MINUTE_OPTIONS = ["00", "15", "30", "45"];

const LOADING_MESSAGES = [
  "🗿 여행 프로필 분석 중...",
  "🍴 도민맛집 데이터에서 고르는 중...",
  "🔍 구글에서 요즘 핫플 검색 중...",
  "🗺️ 동선 최적화하는 중...",
  "✨ 일정표 다듬는 중...",
];

// ── 공용 칩 버튼 ────────────────────────────────────────────
function Chips({ options, selected, onSelect }: { options: string[]; selected: string; onSelect: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onSelect(opt)}
          className={[
            "rounded-full px-3.5 py-2 text-xs font-semibold transition-colors",
            selected === opt ? "bg-brand-orange text-white" : "bg-bg-card border border-border-soft text-text-secondary hover:border-brand-orange hover:text-brand-orange",
          ].join(" ")}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function MultiChips({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onToggle(opt)}
          className={[
            "rounded-full px-3.5 py-2 text-xs font-semibold transition-colors",
            selected.includes(opt) ? "bg-brand-orange text-white" : "bg-bg-card border border-border-soft text-text-secondary hover:border-brand-orange hover:text-brand-orange",
          ].join(" ")}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function BigChoice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full rounded-xl border px-4 py-3 text-left text-xs font-semibold transition-colors",
        active ? "border-brand-orange bg-brand-orange/10 text-brand-orange" : "border-border-soft bg-bg-card text-text-primary hover:border-brand-orange/40",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function TimeSelect({ label, hour, minute, onHour, onMinute }: {
  label: string; hour: string; minute: string; onHour: (v: string) => void; onMinute: (v: string) => void;
}) {
  const cls = "rounded-lg border border-border-soft bg-bg-card px-2 py-2 text-xs outline-none focus:border-brand-orange";
  return (
    <div>
      <p className="mb-1 text-[11px] font-medium text-text-secondary">{label}</p>
      <div className="flex items-center gap-1.5">
        <select value={hour} onChange={(e) => onHour(e.target.value)} className={cls}>
          {HOUR_OPTIONS.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
        <span className="text-xs text-text-secondary">시</span>
        <select value={minute} onChange={(e) => onMinute(e.target.value)} className={cls}>
          {MINUTE_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <span className="text-xs text-text-secondary">분</span>
      </div>
    </div>
  );
}

function DynamicList({ label, items, onChange, onAdd, onRemove, placeholder }: {
  label: string; items: string[]; placeholder?: string;
  onChange: (i: number, v: string) => void; onAdd: () => void; onRemove: (i: number) => void;
}) {
  return (
    <div>
      {label && <p className="mb-1.5 text-[11px] font-medium text-text-secondary">{label}</p>}
      {items.map((item, i) => (
        <div key={i} className="mb-2 flex items-center gap-2">
          <input
            type="text"
            value={item}
            placeholder={placeholder}
            onChange={(e) => onChange(i, e.target.value)}
            className="flex-1 rounded-xl border border-border-soft bg-bg-secondary px-3 py-2 text-xs outline-none focus:border-brand-orange"
          />
          {items.length > 1 && (
            <button type="button" onClick={() => onRemove(i)} className="text-sm text-live-red">✕</button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={onAdd}
        className="rounded-full border border-border-soft bg-bg-card px-3 py-1.5 text-[11px] font-semibold text-text-secondary hover:border-brand-orange hover:text-brand-orange transition-colors"
      >
        + 추가
      </button>
    </div>
  );
}

// ── 메인 ────────────────────────────────────────────────────
export default function TripAiPage() {
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const { savedIds } = useSaved();
  const [mode, setMode] = useState<"rough" | "detailed" | null>(null);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [error, setError] = useState("");
  const [savedNotice, setSavedNotice] = useState(false);
  const [myPlans, setMyPlans] = useState<SavedTripPlan[]>([]);
  const [viewingSaved, setViewingSaved] = useState<SavedTripPlan | null>(null);
  const [mySpots, setMySpots] = useState<MySpot[]>([]);
  const [selectedMySpotIds, setSelectedMySpotIds] = useState<Set<string>>(new Set());

  // 내 저장 일정 로드 + ?plan= 딥링크 처리
  useEffect(() => {
    if (!user) { setMyPlans([]); return; }
    listTripPlans(user.uid).then(setMyPlans).catch(() => setMyPlans([]));
    // 마이스팟 로드 — 기본 전체 선택
    listMySpots(user.uid)
      .then((spots) => {
        setMySpots(spots);
        setSelectedMySpotIds(new Set(spots.map((s) => s.id)));
      })
      .catch(() => setMySpots([]));

    const planId = new URLSearchParams(window.location.search).get("plan");
    if (planId) {
      getTripPlan(user.uid, planId)
        .then((saved) => { if (saved) setViewingSaved(saved); })
        .catch(() => { /* 없는 일정이면 무시 */ });
    }
  }, [user]);

  const handleDeletePlan = async (planId: string) => {
    if (!user) return;
    setMyPlans((prev) => prev.filter((p) => p.id !== planId));
    try { await deleteTripPlan(user.uid, planId); } catch { /* 목록은 다음 로드에서 동기화 */ }
  };

  // 저장한 스팟 → 필수 방문지 프리필
  const savedSpotNames = useMemo(
    () => mockCctvs.filter((c) => savedIds.has(c.id)).map((c) => c.name),
    [savedIds]
  );

  useEffect(() => {
    if (!loading) return;
    setLoadingMsgIdx(0);
    const t = setInterval(() => setLoadingMsgIdx((i) => Math.min(i + 1, LOADING_MESSAGES.length - 1)), 4000);
    return () => clearInterval(t);
  }, [loading]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setError("");
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const listChange = (key: "mustVisitRestaurants" | "mustVisitSpots", i: number, v: string) => {
    const next = [...form[key]];
    next[i] = v;
    update(key, next);
  };
  const listAdd = (key: "mustVisitRestaurants" | "mustVisitSpots") =>
    update(key, [...form[key], ""]);
  const listRemove = (key: "mustVisitRestaurants" | "mustVisitSpots", i: number) =>
    update(key, form[key].filter((_, idx) => idx !== i));

  // 숙소 박수 합계
  const bookedNights = form.bookedAccommodations.reduce((s, a) => s + a.nights, 0);

  // 동적 스텝 (TripPlannerModal 로직 이식)
  const STEPS = useMemo(() => {
    if (mode === "rough") return ["duration", "companions", "transportation", "summary"];

    // 당일치기는 숙소 관련 스텝 전부 생략
    if (form.nights === 0) {
      const prefSteps0 = ["pace", "interests"];
      if (form.interests.length > 1) prefSteps0.push("interestWeights");
      return ["duration", "companions", "transportation", ...prefSteps0, "food", "mustVisits", "summary"];
    }

    const base = ["duration", "companions", "transportation", "accommodationStatus"];
    if (!form.accommodationStatus) return base;

    const accSteps: string[] = [];
    if (form.accommodationStatus === "booked") {
      accSteps.push("bookedAccommodations");
      if (form.bookedAccommodations.length > 0 && form.nights > bookedNights) {
        accSteps.push("bookedAccommodationsFollowUp");
      }
    }
    const needsRec = form.accommodationStatus === "not_booked" || form.remainingNightsPlan === "recommend_rest";
    if (needsRec) {
      accSteps.push("tripStyle");
      if (form.nights > 1) accSteps.push("accommodationRecommendationStyle");
      accSteps.push("accommodationPrefs");
    }
    const prefSteps = ["pace", "interests"];
    if (form.interests.length > 1) prefSteps.push("interestWeights");
    return [...base, ...accSteps, ...prefSteps, "food", "mustVisits", "summary"];
  }, [mode, form.accommodationStatus, form.bookedAccommodations, bookedNights, form.nights, form.remainingNightsPlan, form.interests.length]);

  const MAX_STEPS = mode === "rough" ? 4 : 15;

  // 가중치 재분배 (합 100 유지)
  const handleWeightChange = (changed: string, raw: number) => {
    const weights = { ...form.interestWeights };
    const newValue = Math.round(raw / 10) * 10;
    const delta = newValue - (weights[changed] || 0);
    if (delta === 0) return;
    weights[changed] = newValue;

    const others = form.interests.filter((i) => i !== changed);
    let remaining = delta;
    while (remaining > 0) {
      const largest = others.filter((i) => (weights[i] || 0) > 0).sort((a, b) => (weights[b] || 0) - (weights[a] || 0))[0];
      if (!largest) break;
      weights[largest] -= 10;
      remaining -= 10;
    }
    while (remaining < 0) {
      const smallest = others.filter((i) => (weights[i] || 0) < 100).sort((a, b) => (weights[a] || 0) - (weights[b] || 0))[0];
      if (!smallest) break;
      weights[smallest] += 10;
      remaining += 10;
    }
    const sum = Object.values(weights).reduce((s, v) => s + (v || 0), 0);
    const correction = 100 - sum;
    if (correction !== 0) {
      const fix = form.interests.find((i) => (weights[i] || 0) + correction >= 0 && (weights[i] || 0) + correction <= 100);
      if (fix) weights[fix] = (weights[fix] || 0) + correction;
    }
    update("interestWeights", weights);
  };

  async function generate() {
    setLoading(true);
    setError("");
    setPlan(null);
    setSavedNotice(false);

    const req: TripPlanRequest = {
      mode: mode!,
      nights: form.nights,
      days: form.days,
      arrivalTime: `${form.arrivalHour}:${form.arrivalMinute}`,
      departureTime: `${form.departureHour}:${form.departureMinute}`,
      companions: form.companions,
      transportation: form.transportation,
    };
    if (mode === "detailed") {
      Object.assign(req, {
        accommodationStatus: form.accommodationStatus ?? undefined,
        bookedAccommodations: form.bookedAccommodations.filter((a) => a.name.trim()),
        remainingNightsPlan: form.remainingNightsPlan ?? undefined,
        tripStyle: form.tripStyle || undefined,
        accommodationRecommendationStyle: form.accommodationRecommendationStyle ?? undefined,
        preferredAccommodationRegion: form.preferredAccommodationRegion || undefined,
        accommodationType: form.accommodationType,
        accommodationBudget: form.accommodationBudget || undefined,
        pace: form.pace,
        interestWeights: form.interestWeights,
        restaurantStyle: form.restaurantStyle || undefined,
        mustVisitRestaurants: form.mustVisitRestaurants.filter(Boolean),
        mustVisitSpots: [...new Set([...form.mustVisitSpots.filter(Boolean), ...savedSpotNames])],
        mySpots: mySpots
          .filter((s) => selectedMySpotIds.has(s.id))
          .map((s) => ({ name: s.name, category: s.category, lat: s.lat, lng: s.lng })),
      } satisfies Partial<TripPlanRequest>);
    }

    try {
      const res = await fetch("/api/trip-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "일정 생성 실패");
      const newPlan = data as TripPlan;
      setPlan(newPlan);

      // 마이페이지에 자동 저장
      if (user) {
        try {
          await saveTripPlan(
            user.uid,
            { nights: form.nights, days: form.days, transportation: form.transportation },
            newPlan
          );
          setSavedNotice(true);
          listTripPlans(user.uid).then(setMyPlans).catch(() => {});
        } catch { /* 저장 실패해도 일정은 보여줌 */ }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했어요");
    } finally {
      setLoading(false);
    }
  }

  const handleNext = () => {
    const step = STEPS[currentStep];
    if (step === "bookedAccommodations") {
      if (form.bookedAccommodations.length === 0) {
        setError("숙소를 1곳 이상 검색해서 추가해주세요.");
        return;
      }
      if (bookedNights > form.nights) {
        setError(`배정된 박수(${bookedNights}박)가 전체 여행(${form.nights}박)보다 많아요.`);
        return;
      }
    }
    if (step === "interests") {
      if (form.interests.length === 0 || form.interests.length > 4) {
        setError("관심사를 1개 이상, 4개 이하로 선택해주세요.");
        return;
      }
      // 균등 분배 후 10 단위 보정
      const n = form.interests.length;
      const weights: { [k: string]: number } = {};
      form.interests.forEach((it) => { weights[it] = Math.round(100 / n / 10) * 10; });
      let sum = Object.values(weights).reduce((s, v) => s + v, 0);
      let i = 0;
      while (sum !== 100 && i < 20) {
        const key = form.interests[i % n];
        const adj = Math.sign(100 - sum) * 10;
        if (weights[key] + adj >= 0 && weights[key] + adj <= 100) weights[key] += adj;
        sum = Object.values(weights).reduce((s, v) => s + v, 0);
        i++;
      }
      update("interestWeights", weights);
    }
    if (step === "interestWeights") {
      const total = Object.values(form.interestWeights).reduce((s, w) => s + (w || 0), 0);
      if (total !== 100) {
        setError(`가중치의 총합이 100%가 되어야 해요. (현재: ${total}%)`);
        return;
      }
    }
    if (step === "summary") {
      generate();
    } else {
      setCurrentStep((p) => p + 1);
    }
  };

  const handleBack = () => {
    if (currentStep === 0) setMode(null);
    else setCurrentStep((p) => p - 1);
  };

  const resetAll = () => {
    setPlan(null);
    setMode(null);
    setForm(initialFormState);
    setCurrentStep(0);
    setError("");
  };

  // ── 스텝 렌더링 ──────────────────────────────────────────
  const renderStep = () => {
    const step = STEPS[currentStep];
    const remainingNights = form.nights - bookedNights;

    switch (step) {
      case "duration": return (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-text-primary">총 몇 박 며칠 일정인가요?</h3>
          <div className="flex items-center gap-3">
            <select
              value={form.nights}
              onChange={(e) => { const n = parseInt(e.target.value); update("nights", n); update("days", n + 1); }}
              className="rounded-xl border border-border-soft bg-bg-card px-3 py-2 text-xs outline-none focus:border-brand-orange"
            >
              {Array.from({ length: 6 }, (_, i) => <option key={i} value={i}>{i === 0 ? "당일치기" : `${i}박`}</option>)}
            </select>
            <span className="text-xs font-bold text-text-secondary">{form.days}일</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TimeSelect label="도착 예상 시간" hour={form.arrivalHour} minute={form.arrivalMinute}
              onHour={(v) => update("arrivalHour", v)} onMinute={(v) => update("arrivalMinute", v)} />
            <TimeSelect label="출발 예상 시간" hour={form.departureHour} minute={form.departureMinute}
              onHour={(v) => update("departureHour", v)} onMinute={(v) => update("departureMinute", v)} />
          </div>
        </div>
      );
      case "companions": return (
        <div>
          <h3 className="mb-3 text-sm font-bold text-text-primary">누구와 함께 떠나시나요?</h3>
          <MultiChips options={COMPANION_OPTIONS} selected={form.companions}
            onToggle={(v) => update("companions", form.companions.includes(v) ? form.companions.filter((c) => c !== v) : [...form.companions, v])} />
        </div>
      );
      case "transportation": return (
        <div>
          <h3 className="mb-3 text-sm font-bold text-text-primary">주된 이동 수단은 무엇인가요?</h3>
          <Chips options={TRANSPORTATION_OPTIONS} selected={form.transportation} onSelect={(v) => update("transportation", v)} />
        </div>
      );
      case "accommodationStatus": return (
        <div>
          <h3 className="mb-3 text-sm font-bold text-text-primary">이미 예약하신 숙소가 있나요?</h3>
          <div className="flex flex-col gap-2">
            <BigChoice active={form.accommodationStatus === "booked"} onClick={() => update("accommodationStatus", "booked")}>네, 있습니다</BigChoice>
            <BigChoice active={form.accommodationStatus === "not_booked"} onClick={() => update("accommodationStatus", "not_booked")}>아니요, 추천해주세요</BigChoice>
          </div>
        </div>
      );
      case "bookedAccommodations": return (
        <div>
          <h3 className="mb-1 text-sm font-bold text-text-primary">예약하신 숙소를 검색해서 추가해주세요</h3>
          <p className="mb-3 text-[11px] text-text-secondary">
            숙소 위치를 정확히 알아야 동선이 꼬이지 않게 짤 수 있어요. 숙소마다 몇 박인지도 정해주세요!
          </p>
          <AccommodationPicker
            totalNights={form.nights}
            value={form.bookedAccommodations}
            onChange={(next) => update("bookedAccommodations", next)}
          />
        </div>
      );
      case "bookedAccommodationsFollowUp": return (
        <div>
          <h3 className="mb-3 text-sm font-bold text-text-primary">
            {`숙소 ${form.bookedAccommodations.length}곳에 ${bookedNights}박을 배정하셨네요. 남은 ${remainingNights}박은 어떻게 할까요?`}
          </h3>
          <div className="flex flex-col gap-2">
            <BigChoice active={form.remainingNightsPlan === "stay_at_first"} onClick={() => update("remainingNightsPlan", "stay_at_first")}>입력한 숙소에서 모두 숙박할게요</BigChoice>
            <BigChoice active={form.remainingNightsPlan === "recommend_rest"} onClick={() => update("remainingNightsPlan", "recommend_rest")}>남은 숙소는 돌맹이에게 추천받을게요</BigChoice>
          </div>
        </div>
      );
      case "tripStyle": return (
        <div>
          <h3 className="mb-1 text-sm font-bold text-text-primary">여행의 전반적인 스타일은요?</h3>
          <p className="mb-3 text-[11px] text-text-secondary">숙소뿐만 아니라 식사, 체험 추천에도 반영돼요.</p>
          <div className="flex flex-col gap-2">
            {TRIP_STYLE_OPTIONS.map((opt) => (
              <BigChoice key={opt} active={form.tripStyle === opt} onClick={() => update("tripStyle", opt)}>{opt}</BigChoice>
            ))}
          </div>
        </div>
      );
      case "accommodationRecommendationStyle": return (
        <div>
          <h3 className="mb-3 text-sm font-bold text-text-primary">숙소는 어떻게 추천해 드릴까요?</h3>
          <div className="mb-3 flex flex-col gap-2">
            <BigChoice active={form.accommodationRecommendationStyle === "base_camp"} onClick={() => update("accommodationRecommendationStyle", "base_camp")}>한 곳을 거점으로 여행할래요</BigChoice>
            <BigChoice active={form.accommodationRecommendationStyle === "daily_move"} onClick={() => update("accommodationRecommendationStyle", "daily_move")}>동선에 맞춰 매일 다른 곳에 머물래요</BigChoice>
          </div>
          {form.accommodationRecommendationStyle === "base_camp" && (
            <input
              type="text"
              value={form.preferredAccommodationRegion}
              onChange={(e) => update("preferredAccommodationRegion", e.target.value)}
              placeholder="선호 지역이 있다면? 예: 애월, 서귀포 (선택)"
              className="w-full rounded-xl border border-border-soft bg-bg-secondary px-3 py-2 text-xs outline-none focus:border-brand-orange"
            />
          )}
          {form.accommodationRecommendationStyle === "daily_move" && (
            <p className="rounded-xl bg-brand-navy/5 p-3 text-[11px] leading-5 text-brand-navy">
              알겠어요! 매일 그날 일정의 마지막 코스와 가까운 숙소를 추천해 드릴게요. 🗿
            </p>
          )}
        </div>
      );
      case "accommodationPrefs": return (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-text-primary">선호하는 숙소 유형과 1박 예산을 알려주세요</h3>
          <div>
            <p className="mb-1.5 text-[11px] font-medium text-text-secondary">유형 (복수 선택)</p>
            <MultiChips options={ACCOMMODATION_TYPES} selected={form.accommodationType}
              onToggle={(v) => update("accommodationType", form.accommodationType.includes(v) ? form.accommodationType.filter((c) => c !== v) : [...form.accommodationType, v])} />
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-medium text-text-secondary">1박 예산</p>
            <Chips options={ACCOMMODATION_BUDGETS} selected={form.accommodationBudget} onSelect={(v) => update("accommodationBudget", v)} />
          </div>
        </div>
      );
      case "pace": return (
        <div>
          <h3 className="mb-3 text-sm font-bold text-text-primary">여행 템포를 알려주세요</h3>
          <Chips options={PACE_OPTIONS} selected={form.pace} onSelect={(v) => update("pace", v)} />
        </div>
      );
      case "interests": return (
        <div>
          <h3 className="mb-3 text-sm font-bold text-text-primary">경험하고 싶은 스타일을 골라주세요 (1~4개)</h3>
          <MultiChips options={INTEREST_OPTIONS} selected={form.interests}
            onToggle={(v) => update("interests", form.interests.includes(v) ? form.interests.filter((c) => c !== v) : [...form.interests, v])} />
        </div>
      );
      case "interestWeights": return (
        <div>
          <h3 className="mb-3 text-sm font-bold text-text-primary">선택한 스타일의 중요도를 조절해주세요 (총합 100%)</h3>
          <div className="space-y-3">
            {form.interests.map((interest) => (
              <div key={interest} className="grid grid-cols-5 items-center gap-2">
                <label className="col-span-2 truncate text-[11px] text-text-primary" htmlFor={`w-${interest}`}>{interest}</label>
                <input
                  id={`w-${interest}`}
                  type="range" min="0" max="100" step="10"
                  value={form.interestWeights[interest] || 0}
                  onChange={(e) => handleWeightChange(interest, parseInt(e.target.value))}
                  className="col-span-2 accent-brand-orange"
                />
                <span className="col-span-1 text-right text-xs font-bold text-text-primary">{form.interestWeights[interest] || 0}%</span>
              </div>
            ))}
            <p className="text-right text-xs font-bold text-brand-navy">
              총합: {Object.values(form.interestWeights).reduce((a, b) => a + (b || 0), 0)}%
            </p>
          </div>
        </div>
      );
      case "food": return (
        <div>
          <h3 className="mb-1 text-sm font-bold text-text-primary">식사는 어떤 스타일을 선호하시나요?</h3>
          <p className="mb-3 text-[11px] text-text-secondary">맛집은 도민이 인증한 진짜 맛집에서 우선 추천해 드려요. 🗿</p>
          <div className="flex flex-col gap-2">
            {RESTAURANT_STYLE_OPTIONS.map((opt) => (
              <BigChoice key={opt} active={form.restaurantStyle === opt} onClick={() => update("restaurantStyle", opt)}>{opt}</BigChoice>
            ))}
          </div>
        </div>
      );
      case "mustVisits": return (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-text-primary">꼭 가고 싶은 곳이 있나요?</h3>
          {mySpots.length > 0 && (
            <MySpotsSelector
              spots={mySpots}
              selectedIds={selectedMySpotIds}
              onToggle={(id) =>
                setSelectedMySpotIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                })
              }
              days={form.days}
            />
          )}
          {savedSpotNames.length > 0 && (
            <p className="rounded-xl bg-brand-yellow/20 p-2.5 text-[11px] leading-5 text-text-primary">
              ⭐ 저장해둔 스팟 {savedSpotNames.length}곳({savedSpotNames.slice(0, 3).join(", ")}{savedSpotNames.length > 3 ? " 외" : ""})은 자동으로 반영돼요!
            </p>
          )}
          <DynamicList label="맛집/카페" items={form.mustVisitRestaurants} placeholder="예: 우진해장국"
            onChange={(i, v) => listChange("mustVisitRestaurants", i, v)}
            onAdd={() => listAdd("mustVisitRestaurants")}
            onRemove={(i) => listRemove("mustVisitRestaurants", i)} />
          <DynamicList label="관광지" items={form.mustVisitSpots} placeholder="예: 성산일출봉"
            onChange={(i, v) => listChange("mustVisitSpots", i, v)}
            onAdd={() => listAdd("mustVisitSpots")}
            onRemove={(i) => listRemove("mustVisitSpots", i)} />
        </div>
      );
      case "summary": return (
        <div className="text-center">
          <DolmangyiIcon size={56} />
          <h3 className="mt-3 text-sm font-bold text-text-primary">준비 끝!</h3>
          <p className="mt-1 text-[11px] leading-5 text-text-secondary">
            {form.nights === 0 ? "당일치기" : `${form.nights}박 ${form.days}일`} · {form.transportation}
            {form.companions.length > 0 && ` · ${form.companions.join(", ")}`}
            <br />아래 버튼을 누르면 돌맹이가 도민맛집과 함께 일정을 짜드려요.
          </p>
        </div>
      );
      default: return null;
    }
  };

  // ── 화면 분기 ────────────────────────────────────────────
  // 로그인 게이트
  if (!authLoading && !user) {
    return (
      <div className="mx-auto max-w-4xl px-0 md:px-4 md:py-6">
        <PageHeader title="AI 여행 일정" subtitle="도민맛집과 함께하는 나만의 제주 일정" emoji="🗓️" />
        <div className="flex flex-col items-center px-4 py-16 text-center">
          <DolmangyiIcon size={64} />
          <h2 className="mt-4 text-lg font-black text-text-primary">로그인이 필요해요</h2>
          <p className="mt-1 text-sm leading-6 text-text-secondary">
            돌맹이가 짜준 일정은 마이페이지에 차곡차곡 저장돼요.<br />
            로그인하고 나만의 제주 일정을 만들어보세요!
          </p>
          <button
            type="button"
            onClick={signInWithGoogle}
            className="mt-6 rounded-full bg-brand-navy px-6 py-3 text-sm font-bold text-white shadow-soft hover:bg-brand-navy/90 transition-colors"
          >
            Google로 시작하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-0 md:px-4 md:py-6">
      <PageHeader title="AI 여행 일정" subtitle="도민맛집과 함께하는 나만의 제주 일정" emoji="🗓️" />

      <div className="px-4 md:px-0">
        {viewingSaved ? (
          <TripResultView
            key={viewingSaved.id}
            plan={viewingSaved.plan}
            transportation={viewingSaved.transportation}
            savedToMyPage
            onReset={() => {
              setViewingSaved(null);
              window.history.replaceState(null, "", "/trip-ai");
            }}
          />
        ) : plan ? (
          <TripResultView
            plan={plan}
            transportation={form.transportation}
            savedToMyPage={savedNotice}
            onReset={resetAll}
            onRegenerate={generate}
            regenerating={loading}
          />
        ) : loading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border-soft bg-bg-card px-6 py-16 shadow-card">
            <DolmangyiIcon size={72} />
            <div className="mt-5 flex items-center gap-1.5">
              <span className="h-2 w-2 animate-bounce rounded-full bg-brand-orange" style={{ animationDelay: "-0.3s" }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-brand-orange" style={{ animationDelay: "-0.15s" }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-brand-orange" />
            </div>
            <p className="mt-4 text-sm font-bold text-text-primary">{LOADING_MESSAGES[loadingMsgIdx]}</p>
            <p className="mt-1 text-[11px] text-text-secondary">검색까지 하느라 20초 정도 걸려요. 조금만 기다려주세요!</p>
          </div>
        ) : mode === null ? (
          <div className="space-y-3">
            <p className="mb-4 text-center text-sm font-bold text-text-primary">어떻게 일정을 짜드릴까요?</p>
            <button
              type="button"
              onClick={() => setMode("rough")}
              className="w-full rounded-2xl border-2 border-border-soft bg-bg-card p-5 text-left transition-all hover:border-brand-orange hover:bg-brand-orange/5 group"
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl">⚡</span>
                <div>
                  <p className="text-sm font-black text-text-primary group-hover:text-brand-orange">빠른 일정 짜기</p>
                  <p className="mt-1 text-[11px] leading-5 text-text-secondary">3가지만 답하면 바로 일정 완성.<br />러프하게 큰 그림만 보고 싶을 때.</p>
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setMode("detailed")}
              className="w-full rounded-2xl border-2 border-border-soft bg-bg-card p-5 text-left transition-all hover:border-brand-orange hover:bg-brand-orange/5 group"
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl">🎯</span>
                <div>
                  <p className="text-sm font-black text-text-primary group-hover:text-brand-orange">맞춤 일정 짜기</p>
                  <p className="mt-1 text-[11px] leading-5 text-text-secondary">숙소·관심사·식사 스타일까지 전부 반영.<br />내 취향 100% 맞춤 일정이 필요할 때.</p>
                </div>
              </div>
            </button>
            <div className="rounded-2xl bg-brand-yellow/20 p-4 text-center">
              <p className="text-[11px] leading-5 text-text-primary">
                🗿 맛집은 <strong>도민이 인증한 진짜 맛집</strong>에서, 관광지는 <strong>실시간 검색</strong>으로!<br />
                완성된 일정은 지도 위에 동선까지 그려드려요.
              </p>
            </div>

            {/* 내가 만든 일정 */}
            {myPlans.length > 0 && (
              <section className="pt-2">
                <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-text-primary">
                  📂 내가 만든 일정
                  <span className="rounded-full bg-brand-orange/10 px-2 py-0.5 text-[10px] font-bold text-brand-orange">
                    {myPlans.length}
                  </span>
                </h2>
                <div className="space-y-2">
                  {myPlans.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 rounded-2xl border border-border-soft bg-bg-card px-4 py-3 shadow-card"
                    >
                      <button
                        type="button"
                        onClick={() => setViewingSaved(p)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-xs font-bold text-text-primary">{p.title}</p>
                        <p className="mt-0.5 text-[10px] text-text-secondary">
                          {p.nights === 0 ? "당일치기" : `${p.nights}박 ${p.days}일`} · {p.transportation}
                          {p.createdAt > 0 && ` · ${new Date(p.createdAt).toLocaleDateString("ko-KR")}`}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewingSaved(p)}
                        className="shrink-0 rounded-full bg-brand-orange/10 px-3 py-1.5 text-[10px] font-bold text-brand-orange hover:bg-brand-orange hover:text-white transition-colors"
                      >
                        보기
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePlan(p.id)}
                        className="shrink-0 text-xs text-text-secondary hover:text-live-red transition-colors"
                        aria-label="일정 삭제"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-border-soft bg-bg-card p-4 shadow-card md:p-6">
            {/* 진행 바 */}
            <div className="mb-5">
              <p className="mb-1 text-center text-[11px] font-semibold text-text-secondary">
                {currentStep + 1} / {MAX_STEPS} 단계
              </p>
              <div className="h-1.5 w-full rounded-full bg-bg-secondary">
                <div
                  className="h-1.5 rounded-full bg-brand-orange transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / MAX_STEPS) * 100}%` }}
                />
              </div>
            </div>

            <div className="min-h-[200px]">{renderStep()}</div>

            {error && <p className="mt-3 text-center text-[11px] font-semibold text-live-red">❌ {error}</p>}

            <div className="mt-5 flex items-center justify-between gap-3 border-t border-border-soft pt-4">
              <button
                type="button"
                onClick={handleBack}
                className="rounded-xl border border-border-soft bg-bg-card px-5 py-2.5 text-xs font-semibold text-text-secondary hover:bg-bg-secondary transition-colors"
              >
                이전
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="rounded-xl bg-brand-orange px-6 py-2.5 text-xs font-bold text-white hover:bg-brand-orange/90 transition-colors"
              >
                {STEPS[currentStep] === "summary" ? "✨ 일정 생성하기" : "다음"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
