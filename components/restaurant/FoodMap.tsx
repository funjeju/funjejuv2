"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { RestaurantSummary } from "@/types/restaurant";

const KAKAO_KEY      = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
const KAKAO_REST_KEY = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY;

type KakaoNS = {
  maps: {
    load: (cb: () => void) => void;
    LatLng: new (lat: number, lng: number) => unknown;
    LatLngBounds: new () => { extend: (latlng: unknown) => void };
    Map: new (container: HTMLElement, options: { center: unknown; level: number }) => {
      setBounds: (bounds: unknown) => void;
    };
    CustomOverlay: new (opts: {
      position: unknown;
      content: HTMLElement;
      xAnchor?: number;
      yAnchor?: number;
      clickable?: boolean;
    }) => { setMap: (map: unknown) => void };
  };
};

type GeoCache = Record<string, { lat: number; lng: number; ts: number } | "fail">;

// ── 카테고리별 색상 ────────────────────────────────────
function categoryColor(menu: string): { bg: string; emoji: string } {
  const m = menu || "";
  if (/카페|커피|디저트|베이커리|브런치|빵/.test(m)) return { bg: "#a06d3a", emoji: "☕" };
  if (/흑돼지|돼지|고기|삼겹|오겹|구이/.test(m))       return { bg: "#c44545", emoji: "🥩" };
  if (/회|해물|해산물|성게|전복|갈치|조개|초밥|일식/.test(m)) return { bg: "#3a7ca5", emoji: "🐟" };
  if (/국수|면|라멘|짜장|중식/.test(m))                  return { bg: "#d4a017", emoji: "🍜" };
  if (/한식|백반|정식|국밥|찌개|탕/.test(m))             return { bg: "#5a8c3a", emoji: "🍚" };
  if (/분식|떡볶이|김밥|튀김/.test(m))                    return { bg: "#e07845", emoji: "🍢" };
  if (/양식|파스타|피자|스테이크|버거/.test(m))           return { bg: "#7c5fa3", emoji: "🍝" };
  return { bg: "#555555", emoji: "🍽️" };
}

// 검색용 region 정규화: "제주시 동(洞) 지역" → "제주시"
function normalizeRegion(region: string): string {
  if (!region) return "";
  return region
    .replace(/\s*동\s*\(\s*洞\s*\)\s*지역/g, "")
    .replace(/\s*동\s*지역/g, "")
    .trim();
}

// 제주 BBOX 체크 (엉뚱한 좌표 거르기)
function inJeju(lat: number, lng: number): boolean {
  return lat >= 33.10 && lat <= 33.65 && lng >= 126.10 && lng <= 127.00;
}

// ── 카카오 키워드 검색으로 좌표 얻기 (단계적 폴백) ──
async function geocode(restaurant: RestaurantSummary): Promise<{ lat: number; lng: number } | null> {
  if (!KAKAO_REST_KEY) return null;
  const cacheKey = "foodGeo:v2"; // v2: 폴백 로직 + 정규화
  let cache: GeoCache = {};
  try { cache = JSON.parse(localStorage.getItem(cacheKey) || "{}"); } catch { /* ignore */ }

  const hit = cache[restaurant.id];
  // fail 캐시는 3일만 (영구 X — 카카오 데이터 추가될 수 있음)
  if (hit === "fail") return null;
  if (hit && hit !== "fail" && Date.now() - hit.ts < 30 * 24 * 60 * 60 * 1000) {
    return { lat: hit.lat, lng: hit.lng };
  }

  // 검색어 우선순위: 좁은 → 넓은
  const region = normalizeRegion(restaurant.region);
  const queries = [
    `${region} ${restaurant.title}`,
    `${restaurant.title} 제주`,
    `제주 ${restaurant.title}`,
    restaurant.title,
  ].map((q) => q.trim()).filter((q, i, arr) => q && arr.indexOf(q) === i);

  for (const query of queries) {
    try {
      const res = await fetch(
        `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=5`,
        { headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` } }
      );
      if (!res.ok) continue;
      const data = await res.json() as { documents?: Array<{ x: string; y: string; place_name?: string }> };
      // 제주 좌표 + 가능한 한 첫번째 결과
      for (const doc of data.documents ?? []) {
        const lat = Number(doc.y);
        const lng = Number(doc.x);
        if (inJeju(lat, lng)) {
          cache[restaurant.id] = { lat, lng, ts: Date.now() };
          localStorage.setItem(cacheKey, JSON.stringify(cache));
          return { lat, lng };
        }
      }
    } catch { /* try next query */ }
  }

  // 4단계 모두 실패 → fail로 마킹 (3일 뒤 재시도)
  cache[restaurant.id] = "fail";
  localStorage.setItem(cacheKey, JSON.stringify(cache));
  return null;
}

type Props = { restaurants: RestaurantSummary[] };

export function FoodMap({ restaurants }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<RestaurantSummary | null>(null);
  const [progress, setProgress] = useState({ loaded: 0, total: 0, failed: 0 });

  useEffect(() => {
    if (!KAKAO_KEY) {
      console.error("NEXT_PUBLIC_KAKAO_MAP_KEY 미설정");
      return;
    }
    if (!containerRef.current || restaurants.length === 0) return;

    let cancelled = false;

    async function init() {
      // 1) 지도 SDK 로드
      await new Promise<void>((resolve) => {
        const w = window as unknown as { kakao?: KakaoNS };
        if (w.kakao?.maps) {
          w.kakao.maps.load(() => resolve());
          return;
        }
        const existing = document.getElementById("kakao-map-sdk") as HTMLScriptElement | null;
        if (existing) {
          existing.addEventListener("load", () =>
            (window as unknown as { kakao: KakaoNS }).kakao.maps.load(() => resolve())
          );
          return;
        }
        const script = document.createElement("script");
        script.id = "kakao-map-sdk";
        script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&autoload=false`;
        script.async = true;
        script.onload = () => (window as unknown as { kakao: KakaoNS }).kakao.maps.load(() => resolve());
        document.head.appendChild(script);
      });

      if (cancelled) return;

      const kakao = (window as unknown as { kakao: KakaoNS }).kakao;
      const container = containerRef.current!;
      container.innerHTML = "";

      const map = new kakao.maps.Map(container, {
        center: new kakao.maps.LatLng(33.38, 126.55),
        level: 10,
      });
      const bounds = new kakao.maps.LatLngBounds();
      let placed = 0;
      let failed = 0;
      setProgress({ loaded: 0, total: restaurants.length, failed: 0 });

      // 좌표가 데이터에 들어있으면 즉시 표시. 없는 것만 키워드 검색 폴백.
      const queue = [...restaurants];
      const workers = Array.from({ length: 6 }).map(async () => {
        while (queue.length > 0 && !cancelled) {
          const r = queue.shift()!;
          let coord: { lat: number; lng: number } | null = null;
          if (typeof r.lat === "number" && typeof r.lng === "number") {
            coord = { lat: r.lat, lng: r.lng };
          } else {
            coord = await geocode(r);
          }
          if (cancelled) return;
          if (!coord) {
            failed++;
            setProgress((p) => ({ ...p, failed }));
            continue;
          }
          placed++;
          const pos = new kakao.maps.LatLng(coord.lat, coord.lng);
          bounds.extend(pos);

          const { bg, emoji } = categoryColor(r.menu);
          const el = document.createElement("div");
          el.style.cssText = "position:relative;cursor:pointer;";
          el.innerHTML = `
            <div style="
              display:flex;align-items:center;justify-content:center;
              width:24px;height:24px;border-radius:9999px;
              background:${bg};color:white;font-size:13px;
              border:2px solid white;
              box-shadow:0 2px 6px rgba(0,0,0,0.4);
              transition:transform .15s;
            ">${emoji}</div>
            <div class="food-label" style="
              position:absolute;left:50%;bottom:calc(100% + 4px);
              transform:translateX(-50%);
              background:rgba(0,0,0,0.85);color:white;
              padding:2px 7px;border-radius:9999px;
              font-size:10.5px;font-weight:700;white-space:nowrap;
              pointer-events:none;
              opacity:0;transition:opacity .15s;
            ">${r.title}</div>
          `;
          const dot = el.firstElementChild as HTMLDivElement;
          const label = el.querySelector(".food-label") as HTMLDivElement;
          el.onmouseenter = () => { dot.style.transform = "scale(1.2)"; label.style.opacity = "1"; };
          el.onmouseleave = () => { dot.style.transform = "scale(1)"; label.style.opacity = "0"; };
          el.onclick = () => setSelected(r);

          new kakao.maps.CustomOverlay({
            position: pos,
            content: el,
            xAnchor: 0.5,
            yAnchor: 0.5,
            clickable: true,
          }).setMap(map);

          setProgress((p) => ({ ...p, loaded: placed }));
        }
      });

      await Promise.all(workers);
      if (!cancelled && placed > 0) map.setBounds(bounds);
    }

    init();
    return () => { cancelled = true; };
  }, [restaurants]);

  return (
    <>
      <div className="relative">
        <div
          ref={containerRef}
          className="h-[60vh] w-full rounded-2xl border border-border-soft bg-bg-secondary overflow-hidden"
        />
        {progress.total > 0 && progress.loaded + progress.failed < progress.total && (
          <div className="absolute right-3 top-3 rounded-full bg-bg-card/95 px-3 py-1.5 text-[11px] font-semibold shadow-card">
            📍 {progress.loaded}/{progress.total} 표시 중
            {progress.failed > 0 && <span className="ml-1 text-text-secondary">(좌표 없음 {progress.failed})</span>}
          </div>
        )}
      </div>

      {/* 카테고리 범례 */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {[
          { label: "한식",   emoji: "🍚", bg: "#5a8c3a" },
          { label: "고기",   emoji: "🥩", bg: "#c44545" },
          { label: "해산물", emoji: "🐟", bg: "#3a7ca5" },
          { label: "면·중식", emoji: "🍜", bg: "#d4a017" },
          { label: "분식",   emoji: "🍢", bg: "#e07845" },
          { label: "양식",   emoji: "🍝", bg: "#7c5fa3" },
          { label: "카페",   emoji: "☕", bg: "#a06d3a" },
        ].map((c) => (
          <span key={c.label} className="flex items-center gap-1 rounded-full bg-bg-card border border-border-soft px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
            <span style={{ background: c.bg }} className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] text-white border border-white shadow-sm">
              {c.emoji}
            </span>
            {c.label}
          </span>
        ))}
      </div>

      {/* 식당 모달 */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-bg-card shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {selected.thumbnail && (
              <div className="relative aspect-video bg-gray-800">
                <Image
                  src={selected.thumbnail}
                  alt={selected.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 500px"
                />
              </div>
            )}
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-text-primary">{selected.title}</h3>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    {selected.region}{selected.menu && ` · ${selected.menu}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-full bg-bg-secondary p-1.5 text-text-secondary hover:bg-bg-primary"
                >
                  ✕
                </button>
              </div>
              {selected.shortDescription && (
                <p className="mt-3 text-xs leading-relaxed text-text-secondary">
                  {selected.shortDescription}
                </p>
              )}
              <Link
                href={`/food/${selected.id}`}
                className="mt-4 block rounded-full bg-brand-orange py-2 text-center text-xs font-bold text-white hover:bg-brand-orange/90 transition-colors"
              >
                자세히 보기 →
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
