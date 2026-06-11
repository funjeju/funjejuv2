"use client";

import { useEffect, useRef } from "react";
import type { TripDay } from "@/types/trip";

const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;

// 일차별 마커/동선 색상
export const DAY_COLORS = ["#e8590c", "#2563eb", "#16a34a", "#9333ea", "#d97706", "#0891b2"];

export type KakaoLatLng = unknown;
export type KakaoMap = {
  setBounds: (bounds: unknown) => void;
  relayout: () => void;
  panTo: (latlng: KakaoLatLng) => void;
};
export type KakaoOverlay = { setMap: (map: unknown) => void };
export type KakaoNS = {
  maps: {
    load: (cb: () => void) => void;
    LatLng: new (lat: number, lng: number) => KakaoLatLng;
    LatLngBounds: new () => { extend: (latlng: KakaoLatLng) => void; isEmpty: () => boolean };
    Map: new (container: HTMLElement, options: { center: KakaoLatLng; level: number }) => KakaoMap;
    CustomOverlay: new (opts: {
      position: KakaoLatLng;
      content: HTMLElement;
      xAnchor?: number;
      yAnchor?: number;
      clickable?: boolean;
      zIndex?: number;
    }) => KakaoOverlay;
    Polyline: new (opts: {
      path: KakaoLatLng[];
      strokeWeight: number;
      strokeColor: string;
      strokeOpacity: number;
      strokeStyle: string;
    }) => KakaoOverlay;
  };
};

/** 카카오맵 SDK 로더 (공용) */
export function loadKakaoSdk(): Promise<KakaoNS> {
  return new Promise((resolve) => {
    const w = window as unknown as { kakao?: KakaoNS };
    if (w.kakao?.maps) {
      w.kakao.maps.load(() => resolve(w.kakao!));
      return;
    }
    const onReady = () =>
      (window as unknown as { kakao: KakaoNS }).kakao.maps.load(() =>
        resolve((window as unknown as { kakao: KakaoNS }).kakao)
      );
    const existing = document.getElementById("kakao-map-sdk") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", onReady);
      return;
    }
    const script = document.createElement("script");
    script.id = "kakao-map-sdk";
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&autoload=false`;
    script.async = true;
    script.onload = onReady;
    document.head.appendChild(script);
  });
}

export type BlinkTarget = { day: number; itemIdx: number; nonce: number } | null;

type Props = {
  days: TripDay[];
  activeDay: number; // 1-based, 0 = 전체
  compact?: boolean; // 스크롤 시 축소 모드
  blink?: BlinkTarget; // 목록에서 번호 클릭 시 해당 마커 깜박임
  onSpotClick?: (dayIndex: number, itemIndex: number) => void;
};

export function TripResultMap({ days, activeDay, compact = false, blink = null, onSpotClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const overlaysRef = useRef<KakaoOverlay[]>([]);
  const boundsRef = useRef<unknown>(null);
  // 깜박임용: "day:itemIdx" → { el, pos }
  const markersRef = useRef<Map<string, { el: HTMLElement; pos: KakaoLatLng }>>(new Map());

  // 높이 전환 후 지도 리레이아웃 + 범위 복원
  useEffect(() => {
    const t = setTimeout(() => {
      const map = mapRef.current;
      if (!map) return;
      map.relayout();
      if (boundsRef.current) map.setBounds(boundsRef.current);
    }, 350);
    return () => clearTimeout(t);
  }, [compact]);

  // 번호 클릭 → 마커 깜박임 + 지도 이동 (activeDay 전환 직후 재draw 대기 포함)
  useEffect(() => {
    if (!blink) return;
    const t = setTimeout(() => {
      const hit = markersRef.current.get(`${blink.day}:${blink.itemIdx}`);
      if (!hit) return;
      const dot = hit.el.firstElementChild as HTMLElement | null;
      if (dot) {
        dot.classList.add("trip-marker-blink");
        setTimeout(() => dot.classList.remove("trip-marker-blink"), 2500);
      }
      mapRef.current?.panTo(hit.pos);
    }, 450);
    return () => clearTimeout(t);
  }, [blink]);

  useEffect(() => {
    if (!KAKAO_KEY || !containerRef.current) return;
    let cancelled = false;

    async function draw() {
      const kakao = await loadKakaoSdk();
      if (cancelled || !containerRef.current) return;

      if (!mapRef.current) {
        mapRef.current = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(33.38, 126.55),
          level: 10,
        });
      }
      const map = mapRef.current;

      // 기존 오버레이 제거
      overlaysRef.current.forEach((o) => o.setMap(null));
      overlaysRef.current = [];
      markersRef.current.clear();

      const bounds = new kakao.maps.LatLngBounds();
      const targetDays = activeDay === 0 ? days : days.filter((d) => d.day === activeDay);

      for (const day of targetDays) {
        const color = DAY_COLORS[(day.day - 1) % DAY_COLORS.length];
        const path: KakaoLatLng[] = [];

        day.items.forEach((item, itemIdx) => {
          if (typeof item.lat !== "number" || typeof item.lng !== "number") return;
          const pos = new kakao.maps.LatLng(item.lat, item.lng);
          path.push(pos);
          bounds.extend(pos);

          // 목록과 동일한 번호 (해당 일차 내 순번, 좌표 없는 항목 포함해 매김)
          const num = itemIdx + 1;
          const el = document.createElement("div");
          el.style.cssText = "position:relative;cursor:pointer;";
          el.innerHTML = `
            <div style="
              display:flex;align-items:center;justify-content:center;
              width:26px;height:26px;border-radius:9999px;
              background:${item.isDominFood ? "#1d3557" : color};
              color:white;font-size:12px;font-weight:800;
              border:2.5px solid white;
              box-shadow:0 2px 6px rgba(0,0,0,0.45);
              transition:transform .15s;
            ">${num}</div>
            <div class="trip-label" style="
              position:absolute;left:50%;bottom:calc(100% + 4px);
              transform:translateX(-50%);
              background:rgba(0,0,0,0.85);color:white;
              padding:2px 8px;border-radius:9999px;
              font-size:11px;font-weight:700;white-space:nowrap;
              pointer-events:none;opacity:0;transition:opacity .15s;
            ">${activeDay === 0 ? `D${day.day}-` : ""}${num} ${item.isDominFood ? "🍴 " : ""}${item.name}</div>
          `;
          const dot = el.firstElementChild as HTMLDivElement;
          const label = el.querySelector(".trip-label") as HTMLDivElement;
          el.onmouseenter = () => { dot.style.transform = "scale(1.25)"; label.style.opacity = "1"; };
          el.onmouseleave = () => { dot.style.transform = "scale(1)"; label.style.opacity = "0"; };
          el.onclick = () => onSpotClick?.(day.day, itemIdx);

          const overlay = new kakao.maps.CustomOverlay({
            position: pos,
            content: el,
            xAnchor: 0.5,
            yAnchor: 0.5,
            clickable: true,
            zIndex: item.isDominFood ? 3 : 2,
          });
          overlay.setMap(map);
          overlaysRef.current.push(overlay);
          markersRef.current.set(`${day.day}:${itemIdx}`, { el, pos });
        });

        if (path.length >= 2) {
          const line = new kakao.maps.Polyline({
            path,
            strokeWeight: 3.5,
            strokeColor: color,
            strokeOpacity: 0.75,
            strokeStyle: "shortdash",
          });
          line.setMap(map);
          overlaysRef.current.push(line);
        }
      }

      map.relayout();
      if (!bounds.isEmpty()) {
        boundsRef.current = bounds;
        map.setBounds(bounds);
      }
    }

    draw();
    return () => { cancelled = true; };
  }, [days, activeDay, onSpotClick]);

  if (!KAKAO_KEY) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-2xl border border-border-soft bg-bg-secondary text-xs text-text-secondary">
        지도 키가 설정되지 않았어요
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes tripMarkerBlink {
          0%, 100% { transform: scale(1); box-shadow: 0 2px 6px rgba(0,0,0,0.45); }
          50% { transform: scale(1.6); box-shadow: 0 0 0 6px rgba(232,89,12,0.45); }
        }
        .trip-marker-blink { animation: tripMarkerBlink 0.55s ease-in-out 4; z-index: 50; }
      `}</style>
      <div
        ref={containerRef}
        className={[
          "w-full rounded-2xl border border-border-soft bg-bg-secondary overflow-hidden transition-[height] duration-300",
          compact ? "h-[130px]" : "h-[300px] md:h-[380px]",
        ].join(" ")}
      />
    </>
  );
}
