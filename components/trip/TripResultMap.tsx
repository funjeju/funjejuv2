"use client";

import { useEffect, useRef } from "react";
import type { TripDay } from "@/types/trip";

const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;

// 일차별 마커/동선 색상
export const DAY_COLORS = ["#e8590c", "#2563eb", "#16a34a", "#9333ea", "#d97706", "#0891b2"];

type KakaoLatLng = unknown;
type KakaoMap = { setBounds: (bounds: unknown) => void; relayout: () => void };
type KakaoOverlay = { setMap: (map: unknown) => void };
type KakaoNS = {
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

function loadKakaoSdk(): Promise<KakaoNS> {
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

type Props = {
  days: TripDay[];
  activeDay: number; // 1-based, 0 = 전체
  onSpotClick?: (dayIndex: number, itemIndex: number) => void;
};

export function TripResultMap({ days, activeDay, onSpotClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const overlaysRef = useRef<KakaoOverlay[]>([]);

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

      const bounds = new kakao.maps.LatLngBounds();
      const targetDays = activeDay === 0 ? days : days.filter((d) => d.day === activeDay);

      for (const day of targetDays) {
        const color = DAY_COLORS[(day.day - 1) % DAY_COLORS.length];
        const path: KakaoLatLng[] = [];
        let order = 0;

        day.items.forEach((item, itemIdx) => {
          if (typeof item.lat !== "number" || typeof item.lng !== "number") return;
          order++;
          const pos = new kakao.maps.LatLng(item.lat, item.lng);
          path.push(pos);
          bounds.extend(pos);

          const el = document.createElement("div");
          el.style.cssText = "position:relative;cursor:pointer;";
          el.innerHTML = `
            <div style="
              display:flex;align-items:center;justify-content:center;
              width:28px;height:28px;border-radius:9999px;
              background:${item.isDominFood ? "#1d3557" : color};
              color:white;font-size:12px;font-weight:800;
              border:2.5px solid white;
              box-shadow:0 2px 6px rgba(0,0,0,0.45);
              transition:transform .15s;
            ">${item.isDominFood ? "🍴" : order}</div>
            <div class="trip-label" style="
              position:absolute;left:50%;bottom:calc(100% + 4px);
              transform:translateX(-50%);
              background:rgba(0,0,0,0.85);color:white;
              padding:2px 8px;border-radius:9999px;
              font-size:11px;font-weight:700;white-space:nowrap;
              pointer-events:none;opacity:0;transition:opacity .15s;
            ">${activeDay === 0 ? `D${day.day} · ` : ""}${item.time} ${item.name}</div>
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
      if (!bounds.isEmpty()) map.setBounds(bounds);
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
    <div
      ref={containerRef}
      className="h-[300px] w-full rounded-2xl border border-border-soft bg-bg-secondary overflow-hidden md:h-[380px]"
    />
  );
}
