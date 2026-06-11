"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { DolmangyiIcon } from "@/components/common/DolmangyiIcon";
import { TripResultMap, DAY_COLORS, type BlinkTarget } from "@/components/trip/TripResultMap";
import type { TripPlan, TripItem } from "@/types/trip";

const KAKAO_REST_KEY = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY;

// ── 지오코딩 (카카오 키워드 검색) ───────────────────────────
type GeoCache = Record<string, { lat: number; lng: number; ts: number } | "fail">;
const GEO_CACHE_KEY = "tripGeo:v2";

function inJeju(lat: number, lng: number): boolean {
  return lat >= 33.1 && lat <= 33.65 && lng >= 126.1 && lng <= 127.0;
}

function saveGeoCache(key: string, value: GeoCache[string]) {
  let cache: GeoCache = {};
  try { cache = JSON.parse(localStorage.getItem(GEO_CACHE_KEY) || "{}"); } catch { /* ignore */ }
  cache[key] = value;
  try { localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(cache)); } catch { /* ignore */ }
}

async function geocodeSpot(item: TripItem): Promise<{ lat: number; lng: number } | null> {
  if (!KAKAO_REST_KEY) return null;
  let cache: GeoCache = {};
  try { cache = JSON.parse(localStorage.getItem(GEO_CACHE_KEY) || "{}"); } catch { /* ignore */ }

  const key = item.name.replace(/\s+/g, "");
  const hit = cache[key];
  if (hit === "fail") return null;
  if (hit && Date.now() - hit.ts < 30 * 24 * 60 * 60 * 1000) {
    return { lat: hit.lat, lng: hit.lng };
  }

  const queries = [item.searchKeyword, `제주 ${item.name}`, item.name]
    .map((q) => (q || "").trim())
    .filter((q, i, arr) => q && arr.indexOf(q) === i);

  let gotValidResponse = false;
  for (const query of queries) {
    try {
      const res = await fetch(
        `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=5`,
        { headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` } }
      );
      if (!res.ok) return null; // 쿼터/인증 오류 → fail 캐시 금지
      gotValidResponse = true;
      const data = (await res.json()) as { documents?: Array<{ x: string; y: string }> };
      for (const doc of data.documents ?? []) {
        const lat = Number(doc.y);
        const lng = Number(doc.x);
        if (inJeju(lat, lng)) {
          saveGeoCache(key, { lat, lng, ts: Date.now() });
          return { lat, lng };
        }
      }
    } catch { /* 다음 쿼리 */ }
  }
  if (gotValidResponse) saveGeoCache(key, "fail");
  return null;
}

// ── 편집용 스팟 검색 ─────────────────────────────────────────
type PlaceResult = { name: string; address: string; category: string; lat: number; lng: number };

async function searchPlaces(query: string): Promise<PlaceResult[]> {
  if (!KAKAO_REST_KEY) return [];
  try {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(`제주 ${query}`)}&size=7&rect=126.1,33.1,127.0,33.65`,
      { headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` } }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      documents?: Array<{ place_name: string; road_address_name?: string; address_name?: string; category_name?: string; x: string; y: string }>;
    };
    return (data.documents ?? [])
      .map((d) => ({
        name: d.place_name,
        address: d.road_address_name || d.address_name || "",
        category: d.category_name ?? "",
        lat: Number(d.y),
        lng: Number(d.x),
      }))
      .filter((d) => inJeju(d.lat, d.lng));
  } catch {
    return [];
  }
}

function categoryToType(category: string): { type: string; emoji: string } {
  if (category.includes("카페")) return { type: "카페", emoji: "☕" };
  if (category.includes("음식점")) return { type: "맛집", emoji: "🍴" };
  if (category.includes("숙박")) return { type: "숙소", emoji: "🏨" };
  return { type: "관광지", emoji: "📍" };
}

// ── 이동시간 추정 (하버사인 × 도로계수) ─────────────────────
function estimateTravel(
  a: TripItem, b: TripItem, transportation: string
): { label: string; minutes: number } | null {
  if (typeof a.lat !== "number" || typeof a.lng !== "number") return null;
  if (typeof b.lat !== "number" || typeof b.lng !== "number") return null;
  const dLat = (a.lat - b.lat) * 111;
  const dLng = (a.lng - b.lng) * 111 * Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180));
  const km = Math.sqrt(dLat * dLat + dLng * dLng) * 1.4;

  if (km < 0.4) return { label: "🚶 도보 5분 이내", minutes: 5 };

  const isTransit = transportation.includes("대중교통");
  const speed = isTransit ? 22 : 45;
  let minutes = Math.round((km / speed) * 60) + (isTransit ? 10 : 0);
  minutes = Math.max(minutes, 5);
  const emoji = isTransit ? "🚌" : "🚗";
  return { label: `${emoji} 약 ${minutes}분 이동`, minutes };
}

const TYPE_BADGE: Record<string, string> = {
  맛집: "🍴", 카페: "☕", 관광지: "📍", 자연: "🏞️",
  액티비티: "🎢", 쇼핑: "🛍️", 문화: "🏛️", 숙소: "🏨",
};

// ── 일자별 스팟 추가 박스 (편집 모드) ───────────────────────
function AddSpotBox({ onAdd }: { onAdd: (item: TripItem) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[] | null>(null);
  const [searching, setSearching] = useState(false);

  async function handleSearch() {
    const q = query.trim();
    if (!q || searching) return;
    setSearching(true);
    setResults(await searchPlaces(q));
    setSearching(false);
  }

  return (
    <div className="no-print mt-2 rounded-xl border border-dashed border-border-soft bg-bg-secondary/30 p-2">
      <div className="flex gap-1.5">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearch(); } }}
          placeholder="추가할 스팟 검색 (카카오맵)"
          className="flex-1 rounded-lg border border-border-soft bg-bg-card px-2.5 py-1.5 text-[11px] outline-none focus:border-brand-orange"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={!query.trim() || searching}
          className="shrink-0 rounded-lg bg-brand-navy px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-40"
        >
          {searching ? "..." : "🔍"}
        </button>
      </div>
      {results !== null && (
        <div className="mt-1.5 max-h-44 overflow-y-auto rounded-lg border border-border-soft bg-bg-card">
          {results.length === 0 ? (
            <p className="p-2 text-[10px] text-text-secondary">검색 결과가 없어요</p>
          ) : (
            results.map((r) => {
              const { type, emoji } = categoryToType(r.category);
              return (
                <button
                  key={`${r.name}-${r.lat}`}
                  type="button"
                  onClick={() => {
                    onAdd({
                      time: "", name: r.name, type, emoji,
                      comment: "내가 직접 추가한 스팟!", duration: "",
                      searchKeyword: r.name, isDominFood: false,
                      address: r.address, lat: r.lat, lng: r.lng,
                    });
                    setResults(null);
                    setQuery("");
                  }}
                  className="flex w-full items-center gap-1.5 border-b border-border-soft px-2 py-1.5 text-left last:border-b-0 hover:bg-brand-orange/5"
                >
                  <span>{emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-bold text-text-primary">{r.name}</span>
                    <span className="block truncate text-[9px] text-text-secondary">{r.address}</span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

type Props = {
  plan: TripPlan;
  transportation: string;
  savedToMyPage?: boolean;
  onReset: () => void;
  onRegenerate?: () => void;
  regenerating?: boolean;
};

export function TripResultView({ plan, transportation, savedToMyPage, onReset, onRegenerate, regenerating }: Props) {
  const [days, setDays] = useState(plan.days);
  const [activeDay, setActiveDay] = useState(plan.days.length === 1 ? 1 : 0);
  const [geocoding, setGeocoding] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [mapCompact, setMapCompact] = useState(false);
  const [mapPinned, setMapPinned] = useState(false);
  const [blink, setBlink] = useState<BlinkTarget>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => { setDays(plan.days); }, [plan]);

  // 스크롤이 내려가면 지도 축소
  useEffect(() => {
    const onScroll = () => {
      if (mapPinned) return;
      setMapCompact(window.scrollY > 260);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [mapPinned]);

  // 비도민 스팟 좌표 카카오 정밀 보정
  useEffect(() => {
    let cancelled = false;
    const pending: Array<{ dayIdx: number; itemIdx: number; item: TripItem }> = [];
    plan.days.forEach((d, dayIdx) =>
      d.items.forEach((item, itemIdx) => {
        if (!item.isDominFood && !item.address) pending.push({ dayIdx, itemIdx, item });
      })
    );
    if (pending.length === 0) return;

    setGeocoding(true);
    (async () => {
      const queue = [...pending];
      const results: Array<{ dayIdx: number; itemIdx: number; lat: number; lng: number }> = [];
      const workers = Array.from({ length: 2 }).map(async () => {
        while (queue.length > 0 && !cancelled) {
          const job = queue.shift()!;
          const coord = await geocodeSpot(job.item);
          if (coord) results.push({ dayIdx: job.dayIdx, itemIdx: job.itemIdx, ...coord });
        }
      });
      await Promise.all(workers);
      if (cancelled) return;
      setDays((prev) => {
        const next = prev.map((d) => ({ ...d, items: d.items.map((i) => ({ ...i })) }));
        for (const r of results) {
          const target = next[r.dayIdx]?.items[r.itemIdx];
          // 편집으로 항목이 바뀌었으면 이름 일치할 때만 적용
          if (target && target.name === plan.days[r.dayIdx]?.items[r.itemIdx]?.name) {
            target.lat = r.lat;
            target.lng = r.lng;
          }
        }
        return next;
      });
      setGeocoding(false);
    })();
    return () => { cancelled = true; };
  }, [plan]);

  const handleSpotClick = useCallback((day: number, itemIdx: number) => {
    const id = `trip-item-${day}-${itemIdx}`;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlight(id);
    setTimeout(() => setHighlight(null), 2000);
  }, []);

  // 목록 번호 클릭 → 지도 깜박임 (+필요 시 일차 탭 전환)
  const handleNumberClick = (day: number, itemIdx: number) => {
    if (activeDay !== 0 && activeDay !== day) setActiveDay(day);
    setBlink({ day, itemIdx, nonce: Date.now() });
  };

  // ── 편집 ──────────────────────────────────────────────────
  const updateDay = (dayNum: number, fn: (items: TripItem[]) => TripItem[]) => {
    setDays((prev) => prev.map((d) => (d.day === dayNum ? { ...d, items: fn([...d.items]) } : d)));
  };
  const moveItem = (dayNum: number, idx: number, dir: -1 | 1) => {
    updateDay(dayNum, (items) => {
      const to = idx + dir;
      if (to < 0 || to >= items.length) return items;
      [items[idx], items[to]] = [items[to], items[idx]];
      return items;
    });
  };
  const deleteItem = (dayNum: number, idx: number) => {
    updateDay(dayNum, (items) => items.filter((_, i) => i !== idx));
  };
  const addItem = (dayNum: number, item: TripItem) => {
    updateDay(dayNum, (items) => [...items, item]);
  };

  const handlePrint = () => {
    // 인쇄용: 전체 일차 마커 + 지도 확대 상태로
    setActiveDay(0);
    setMapPinned(true);
    setMapCompact(false);
    setTimeout(() => window.print(), 700);
  };

  const visibleDays = useMemo(
    () => (activeDay === 0 ? days : days.filter((d) => d.day === activeDay)),
    [days, activeDay]
  );

  return (
    <div className="space-y-4">
      <style>{`
        @media print {
          @page { margin: 10mm; }
          body * { visibility: hidden; }
          .printable-trip, .printable-trip * { visibility: visible; }
          .printable-trip { position: absolute; left: 0; top: 0; width: 100%; font-size: 10px; }
          .no-print, .no-print * { display: none !important; }
          .print-only { display: flex !important; }
          .printable-trip, .printable-trip * { color: #000 !important; }
          .printable-trip .trip-day-badge, .printable-trip .trip-num-badge { color: #fff !important; }
          /* 지도: 고정 해제하고 문서 상단에 포함 */
          .trip-map-wrap { position: static !important; margin: 0 0 4mm !important; padding: 0 !important; background: transparent !important; }
          /* Day 카드 2단 배치 */
          .trip-days { columns: 2; column-gap: 6mm; }
          .trip-day-card {
            padding: 6px 8px !important; margin: 0 0 3mm !important;
            box-shadow: none !important; border: 1px solid #bbb !important;
            border-radius: 6px !important;
          }
          .trip-item { break-inside: avoid; }
          .trip-item-card { padding: 4px 6px !important; background: #fff !important; }
          .trip-connector { padding: 0 0 0 20px !important; }
          .trip-connector > div { height: 8px !important; }
          .trip-comment { padding: 1px 5px !important; background: #f5f5f5 !important; margin-top: 2px !important; }
          .trip-comment p { font-size: 9px !important; line-height: 1.4 !important; }
          .trip-tips, .trip-closing { padding: 6px 8px !important; break-inside: avoid; }
        }
      `}</style>

      {/* 화면용 헤더 카드 */}
      <div className="no-print rounded-2xl bg-gradient-to-br from-brand-navy to-blue-600 p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] text-white/70">🗿 돌맹이가 짜준 일정</p>
            <h2 className="mt-1 text-lg font-black">{plan.title}</h2>
            <p className="mt-2 text-xs leading-5 text-white/90">{plan.overview}</p>
            {savedToMyPage && (
              <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold">
                ✓ 마이페이지에 저장됨
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onReset}
            className="shrink-0 rounded-full border border-white/30 px-3 py-1.5 text-[11px] font-medium hover:bg-white/10 transition-colors"
          >
            처음부터 다시
          </button>
        </div>
      </div>

      {/* ── 인쇄 가능 영역 (지도 포함) ── */}
      <div className="printable-trip space-y-4">
        {/* 인쇄 전용 문서 헤더 */}
        <div className="print-only hidden flex-col gap-2 border-b-2 border-black pb-3">
          <div className="flex items-center gap-2">
            <Image src="/dolmangyi.png" alt="돌맹이" width={36} height={36} className="h-9 w-9 object-contain" />
            <span className="text-xl font-black tracking-tight">Funjeju.com</span>
            <span className="ml-auto text-[10px]">AI 여행 일정 · {new Date().toLocaleDateString("ko-KR")}</span>
          </div>
          <div>
            <p className="text-base font-black">{plan.title}</p>
            <p className="text-[11px]">{plan.overview}</p>
          </div>
        </div>

        {/* 지도 + 일차 탭 (화면: 스크롤 고정·축소 / 인쇄: 문서 상단 포함) */}
        <div className="trip-map-wrap sticky top-14 z-10 -mx-4 bg-bg-primary px-4 pb-2 pt-2 md:top-0 md:mx-0 md:px-0">
          <div className="relative">
            <TripResultMap
              days={days}
              activeDay={activeDay}
              compact={mapCompact && !mapPinned}
              blink={blink}
              onSpotClick={handleSpotClick}
            />
            {mapCompact && (
              <button
                type="button"
                onClick={() => setMapPinned((p) => !p)}
                className="no-print absolute right-2 top-2 z-10 rounded-full bg-bg-card/95 px-2.5 py-1 text-[10px] font-bold text-text-primary shadow-card hover:bg-bg-card transition-colors"
              >
                {mapPinned ? "지도 접기 ▲" : "지도 크게 ▼"}
              </button>
            )}
          </div>
          <div className="no-print mt-2 flex flex-wrap items-center gap-1.5">
            {days.length > 1 && (
              <button
                type="button"
                onClick={() => setActiveDay(0)}
                className={[
                  "rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors",
                  activeDay === 0 ? "bg-brand-navy text-white" : "bg-bg-card border border-border-soft text-text-secondary hover:border-brand-navy",
                ].join(" ")}
              >
                전체
              </button>
            )}
            {days.map((d) => (
              <button
                key={d.day}
                type="button"
                onClick={() => setActiveDay(d.day)}
                className={[
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors",
                  activeDay === d.day ? "text-white" : "bg-bg-card border border-border-soft text-text-secondary",
                ].join(" ")}
                style={activeDay === d.day ? { background: DAY_COLORS[(d.day - 1) % DAY_COLORS.length] } : undefined}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: activeDay === d.day ? "white" : DAY_COLORS[(d.day - 1) % DAY_COLORS.length] }}
                />
                {d.day}일차
              </button>
            ))}
            <button
              type="button"
              onClick={() => setEditing((e) => !e)}
              className={[
                "ml-auto rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors",
                editing ? "bg-brand-orange text-white" : "bg-bg-card border border-border-soft text-text-secondary hover:border-brand-orange hover:text-brand-orange",
              ].join(" ")}
            >
              {editing ? "✓ 편집 완료" : "✏️ 일정 편집"}
            </button>
            {geocoding && (
              <span className="text-[10px] text-text-secondary">📍 위치 확인 중...</span>
            )}
          </div>
        </div>

        {/* 일정 타임라인 */}
        <div className="trip-days space-y-4">
          {visibleDays.map((d) => {
            const color = DAY_COLORS[(d.day - 1) % DAY_COLORS.length];
            return (
              <div key={d.day} className="trip-day-card rounded-2xl border border-border-soft bg-bg-card p-4 shadow-card md:p-5">
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className="trip-day-badge flex h-7 w-7 items-center justify-center rounded-full text-xs font-black text-white"
                    style={{ background: color }}
                  >
                    D{d.day}
                  </span>
                  <p className="text-sm font-bold text-text-primary">{d.theme}</p>
                </div>

                <div>
                  {d.items.map((item, i) => {
                    const itemId = `trip-item-${d.day}-${i}`;
                    const travel = i > 0 ? estimateTravel(d.items[i - 1], item, transportation) : null;
                    const noCoord = typeof item.lat !== "number";
                    return (
                      <div key={`${item.name}-${i}`} className="trip-item">
                        {i > 0 && (
                          <div className="trip-connector flex items-center gap-2 py-1 pl-[22px]">
                            <div className="h-6 w-px border-l border-dashed border-border-soft" />
                            <span className="text-[10px] font-semibold text-text-secondary">
                              {travel ? travel.label : "🚗 이동"}
                            </span>
                          </div>
                        )}

                        <div
                          id={itemId}
                          className={[
                            "flex gap-2 rounded-xl transition-shadow",
                            highlight === itemId ? "ring-2 ring-brand-orange" : "",
                          ].join(" ")}
                        >
                          {/* 번호 배지 (지도 마커와 동일 번호) — 클릭 시 지도에서 깜박임 */}
                          <button
                            type="button"
                            onClick={() => handleNumberClick(d.day, i)}
                            disabled={noCoord}
                            title={noCoord ? "지도에 표시할 수 없는 항목" : "지도에서 위치 보기"}
                            className="trip-num-badge mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white shadow-sm transition-transform hover:scale-110 disabled:opacity-35"
                            style={{ background: item.isDominFood ? "#1d3557" : color }}
                          >
                            {i + 1}
                          </button>

                          <div className="flex w-9 shrink-0 flex-col items-center pt-1">
                            <span className="text-[10px] font-bold text-brand-navy">{item.time || "—"}</span>
                            <span className="mt-0.5 text-[9px] text-text-secondary">{item.duration}</span>
                          </div>

                          <div className="trip-item-card mb-1 min-w-0 flex-1 rounded-xl bg-bg-secondary/50 p-3">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{item.emoji || TYPE_BADGE[item.type] || "📍"}</span>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <p className="text-sm font-bold text-text-primary">{item.name}</p>
                                  {item.isDominFood && (
                                    <span className="rounded-full bg-brand-navy px-2 py-0.5 text-[9px] font-bold text-white">
                                      🗿 도민 인증
                                    </span>
                                  )}
                                </div>
                                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                  <span className="rounded-full bg-bg-card px-2 py-0.5 text-[9px] font-medium text-text-secondary">
                                    {item.type}
                                  </span>
                                  {item.address && (
                                    <span className="truncate text-[10px] text-text-secondary">{item.address}</span>
                                  )}
                                  {noCoord && (
                                    <span className="no-print text-[9px] text-text-secondary/70">지도 표시 불가</span>
                                  )}
                                </div>
                              </div>
                              {item.isDominFood && item.thumbnail && (
                                <div className="no-print relative h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                                  <Image src={item.thumbnail} alt={item.name} fill className="object-cover" sizes="48px" />
                                </div>
                              )}
                              {/* 편집 컨트롤 */}
                              {editing && (
                                <div className="no-print flex shrink-0 flex-col gap-0.5">
                                  <button type="button" onClick={() => moveItem(d.day, i, -1)} disabled={i === 0}
                                    className="rounded bg-bg-card px-1.5 py-0.5 text-[10px] text-text-secondary hover:text-brand-orange disabled:opacity-25" title="위로">▲</button>
                                  <button type="button" onClick={() => moveItem(d.day, i, 1)} disabled={i === d.items.length - 1}
                                    className="rounded bg-bg-card px-1.5 py-0.5 text-[10px] text-text-secondary hover:text-brand-orange disabled:opacity-25" title="아래로">▼</button>
                                  <button type="button" onClick={() => deleteItem(d.day, i)}
                                    className="rounded bg-bg-card px-1.5 py-0.5 text-[10px] text-text-secondary hover:text-live-red" title="삭제">✕</button>
                                </div>
                              )}
                            </div>

                            {item.comment && (
                              <div className="trip-comment mt-2 flex items-start gap-1.5 rounded-lg bg-brand-yellow/20 p-2">
                                <DolmangyiIcon size={20} className="no-print shrink-0" />
                                <p className="text-[11px] leading-5 text-text-primary">{item.comment}</p>
                              </div>
                            )}

                            {item.isDominFood && item.restaurantId && (
                              <Link
                                href={`/food/${item.restaurantId}`}
                                className="no-print mt-2 block rounded-full bg-brand-orange/10 py-1.5 text-center text-[11px] font-bold text-brand-orange hover:bg-brand-orange hover:text-white transition-colors"
                              >
                                도민맛집 자세히 보기 →
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {editing && <AddSpotBox onAdd={(item) => addItem(d.day, item)} />}
                </div>
              </div>
            );
          })}
        </div>

        {/* 팁 */}
        {plan.tips.length > 0 && (
          <div className="trip-tips rounded-2xl border border-brand-navy/20 bg-brand-navy/5 p-5">
            <p className="mb-2 text-sm font-bold text-brand-navy">💡 돌맹이 꿀팁</p>
            <ul className="space-y-1.5">
              {plan.tips.map((tip, i) => (
                <li key={i} className="text-xs leading-5 text-text-primary">• {tip}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="trip-closing rounded-2xl bg-brand-yellow/20 p-5 text-center">
          <DolmangyiIcon size={48} className="no-print" />
          <p className="mt-2 text-sm font-medium text-text-primary">{plan.closing}</p>
        </div>
      </div>

      {/* 액션 */}
      <div className="no-print flex gap-2 pb-6">
        <button
          type="button"
          onClick={handlePrint}
          className="flex-1 rounded-xl border border-border-soft bg-bg-card py-3 text-sm font-semibold text-text-secondary hover:bg-bg-secondary transition-colors"
        >
          📥 PDF 저장
        </button>
        {onRegenerate && (
          <button
            type="button"
            onClick={onRegenerate}
            disabled={regenerating}
            className="flex-1 rounded-xl bg-brand-orange py-3 text-sm font-bold text-white hover:bg-brand-orange/90 disabled:opacity-50 transition-colors"
          >
            {regenerating ? "🗿 다시 짜는 중..." : "🔄 다시 만들기"}
          </button>
        )}
      </div>
    </div>
  );
}
