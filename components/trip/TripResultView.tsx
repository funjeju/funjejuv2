"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { DolmangyiIcon } from "@/components/common/DolmangyiIcon";
import { TripResultMap, DAY_COLORS } from "@/components/trip/TripResultMap";
import type { TripPlan, TripItem } from "@/types/trip";

const KAKAO_REST_KEY = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY;

// ── 지오코딩 (카카오 키워드 검색, FoodMap 패턴 재사용) ──────
type GeoCache = Record<string, { lat: number; lng: number; ts: number } | "fail">;
const GEO_CACHE_KEY = "tripGeo:v2"; // v1: 쿼터 초과가 fail로 영구 캐시되던 버그

function inJeju(lat: number, lng: number): boolean {
  return lat >= 33.1 && lat <= 33.65 && lng >= 126.1 && lng <= 127.0;
}

// 동시 워커가 캐시를 덮어쓰지 않도록 저장 직전에 다시 읽어 병합
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
      // 쿼터 초과/인증 오류 등은 일시적 문제 → fail 캐시 금지, 즉시 중단
      if (!res.ok) return null;
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
    } catch { /* 네트워크 오류 → 다음 쿼리 */ }
  }
  // 정상 응답인데 결과가 없을 때만 fail 캐시 (영구 미존재 장소)
  if (gotValidResponse) saveGeoCache(key, "fail");
  return null;
}

// ── 이동시간 추정 (하버사인 × 도로계수) ─────────────────────
function estimateTravel(
  a: TripItem, b: TripItem, transportation: string
): { label: string; minutes: number } | null {
  if (typeof a.lat !== "number" || typeof a.lng !== "number") return null;
  if (typeof b.lat !== "number" || typeof b.lng !== "number") return null;
  const dLat = (a.lat - b.lat) * 111;
  const dLng = (a.lng - b.lng) * 111 * Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180));
  const km = Math.sqrt(dLat * dLat + dLng * dLng) * 1.4; // 도로 우회 계수

  if (km < 0.4) return { label: "🚶 도보 5분 이내", minutes: 5 };

  const isTransit = transportation.includes("대중교통");
  const speed = isTransit ? 22 : 45; // km/h
  let minutes = Math.round((km / speed) * 60) + (isTransit ? 10 : 0); // 대중교통 대기 보정
  minutes = Math.max(minutes, 5);
  const emoji = isTransit ? "🚌" : "🚗";
  return { label: `${emoji} 약 ${minutes}분 이동`, minutes };
}

const TYPE_BADGE: Record<string, string> = {
  맛집: "🍴", 카페: "☕", 관광지: "📍", 자연: "🏞️",
  액티비티: "🎢", 쇼핑: "🛍️", 문화: "🏛️", 숙소: "🏨",
};

type Props = {
  plan: TripPlan;
  transportation: string;
  onReset: () => void;
  onRegenerate: () => void;
  regenerating: boolean;
};

export function TripResultView({ plan, transportation, onReset, onRegenerate, regenerating }: Props) {
  const [days, setDays] = useState(plan.days);
  const [activeDay, setActiveDay] = useState(plan.days.length === 1 ? 1 : 0);
  const [geocoding, setGeocoding] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);

  useEffect(() => { setDays(plan.days); }, [plan]);

  // 비도민 스팟 좌표를 카카오 키워드 검색으로 정밀 보정
  // (AI 추정 좌표는 수 km 오차 가능 — 카카오 성공 시 교체, 실패/쿼터초과 시 AI 좌표 유지)
  useEffect(() => {
    let cancelled = false;
    const pending: Array<{ dayIdx: number; itemIdx: number; item: TripItem }> = [];
    plan.days.forEach((d, dayIdx) =>
      d.items.forEach((item, itemIdx) => {
        if (!item.isDominFood) pending.push({ dayIdx, itemIdx, item });
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
          if (target) { target.lat = r.lat; target.lng = r.lng; }
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

  const visibleDays = useMemo(
    () => (activeDay === 0 ? days : days.filter((d) => d.day === activeDay)),
    [days, activeDay]
  );

  return (
    <div className="space-y-4">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .printable-trip { padding: 0 !important; }
        }
      `}</style>

      {/* 헤더 카드 */}
      <div className="rounded-2xl bg-gradient-to-br from-brand-navy to-blue-600 p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] text-white/70">🗿 돌맹이가 짜준 일정</p>
            <h2 className="mt-1 text-lg font-black">{plan.title}</h2>
            <p className="mt-2 text-xs leading-5 text-white/90">{plan.overview}</p>
          </div>
          <button
            type="button"
            onClick={onReset}
            className="no-print shrink-0 rounded-full border border-white/30 px-3 py-1.5 text-[11px] font-medium hover:bg-white/10 transition-colors"
          >
            처음부터 다시
          </button>
        </div>
      </div>

      {/* 지도 + 일차 탭 (모바일 헤더 아래 고정) */}
      <div className="no-print sticky top-14 z-10 -mx-4 bg-bg-primary px-4 pb-2 pt-2 md:top-0 md:mx-0 md:px-0">
        <TripResultMap days={days} activeDay={activeDay} onSpotClick={handleSpotClick} />
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
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
          {geocoding && (
            <span className="ml-auto text-[10px] text-text-secondary">📍 위치 확인 중...</span>
          )}
        </div>
      </div>

      {/* 일정 타임라인 */}
      <div className="printable-trip space-y-4">
        {visibleDays.map((d) => {
          const color = DAY_COLORS[(d.day - 1) % DAY_COLORS.length];
          return (
            <div key={d.day} className="rounded-2xl border border-border-soft bg-bg-card p-4 shadow-card md:p-5">
              <div className="mb-3 flex items-center gap-2">
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-black text-white"
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
                    <div key={i}>
                      {/* 이동시간 커넥터 */}
                      {i > 0 && (
                        <div className="flex items-center gap-2 py-1 pl-[22px]">
                          <div className="h-6 w-px border-l border-dashed border-border-soft" />
                          <span className="text-[10px] font-semibold text-text-secondary">
                            {travel ? travel.label : "🚗 이동"}
                          </span>
                        </div>
                      )}

                      <div
                        id={itemId}
                        className={[
                          "flex gap-3 rounded-xl transition-shadow",
                          highlight === itemId ? "ring-2 ring-brand-orange" : "",
                        ].join(" ")}
                      >
                        <div className="flex w-11 shrink-0 flex-col items-center pt-1">
                          <span className="text-[10px] font-bold text-brand-navy">{item.time}</span>
                          <span className="mt-0.5 text-[9px] text-text-secondary">{item.duration}</span>
                        </div>

                        <div className="mb-1 flex-1 rounded-xl bg-bg-secondary/50 p-3">
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
                                  <span className="text-[9px] text-text-secondary/70">지도 표시 불가</span>
                                )}
                              </div>
                            </div>
                            {item.isDominFood && item.thumbnail && (
                              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                                <Image src={item.thumbnail} alt={item.name} fill className="object-cover" sizes="48px" />
                              </div>
                            )}
                          </div>

                          <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-brand-yellow/20 p-2">
                            <DolmangyiIcon size={20} className="shrink-0" />
                            <p className="text-[11px] leading-5 text-text-primary">{item.comment}</p>
                          </div>

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
              </div>
            </div>
          );
        })}

        {/* 팁 */}
        {plan.tips.length > 0 && (
          <div className="rounded-2xl border border-brand-navy/20 bg-brand-navy/5 p-5">
            <p className="mb-2 text-sm font-bold text-brand-navy">💡 돌맹이 꿀팁</p>
            <ul className="space-y-1.5">
              {plan.tips.map((tip, i) => (
                <li key={i} className="text-xs leading-5 text-text-primary">• {tip}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-2xl bg-brand-yellow/20 p-5 text-center">
          <DolmangyiIcon size={48} />
          <p className="mt-2 text-sm font-medium text-text-primary">{plan.closing}</p>
        </div>
      </div>

      {/* 액션 */}
      <div className="no-print flex gap-2 pb-6">
        <button
          type="button"
          onClick={() => window.print()}
          className="flex-1 rounded-xl border border-border-soft bg-bg-card py-3 text-sm font-semibold text-text-secondary hover:bg-bg-secondary transition-colors"
        >
          📥 저장하기
        </button>
        <button
          type="button"
          onClick={onRegenerate}
          disabled={regenerating}
          className="flex-1 rounded-xl bg-brand-orange py-3 text-sm font-bold text-white hover:bg-brand-orange/90 disabled:opacity-50 transition-colors"
        >
          {regenerating ? "🗿 다시 짜는 중..." : "🔄 다시 만들기"}
        </button>
      </div>
    </div>
  );
}
