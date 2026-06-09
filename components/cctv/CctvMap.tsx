"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type CctvLike = {
  id: string;
  name: string;
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
};

const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;

declare global {
  interface Window {
    kakao: {
      maps: {
        load: (cb: () => void) => void;
        LatLng: new (lat: number, lng: number) => unknown;
        LatLngBounds: new () => { extend: (latlng: unknown) => void };
        Map: new (container: HTMLElement, options: { center: unknown; level: number }) => {
          setBounds: (bounds: unknown) => void;
        };
        Marker: new (opts: { position: unknown; title?: string }) => {
          setMap: (map: unknown) => void;
        };
        CustomOverlay: new (opts: {
          position: unknown;
          content: HTMLElement;
          yAnchor?: number;
          clickable?: boolean;
        }) => { setMap: (map: unknown) => void };
        event: {
          addListener: (target: unknown, type: string, fn: (...args: unknown[]) => void) => void;
        };
      };
    };
  }
}

type Props = { cctvs: CctvLike[] };

export function CctvMap({ cctvs }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!KAKAO_KEY) {
      console.error("NEXT_PUBLIC_KAKAO_MAP_KEY 미설정");
      return;
    }
    if (!containerRef.current) return;

    // lat/lng 와 latitude/longitude 둘 다 지원
    const valid = cctvs
      .map((c) => ({
        ...c,
        _lat: c.lat ?? c.latitude,
        _lng: c.lng ?? c.longitude,
      }))
      .filter((c) => typeof c._lat === "number" && typeof c._lng === "number");
    if (valid.length === 0) return;

    function loadMap() {
      const kakao = window.kakao;
      const container = containerRef.current!;
      container.innerHTML = "";

      const bounds = new kakao.maps.LatLngBounds();
      const map = new kakao.maps.Map(container, {
        center: new kakao.maps.LatLng(33.38, 126.55),
        level: 10,
      });

      valid.forEach((c) => {
        const pos = new kakao.maps.LatLng(c._lat!, c._lng!);
        bounds.extend(pos);

        // 핀 오버레이
        const el = document.createElement("div");
        el.className = "cursor-pointer flex flex-col items-center -translate-y-full";
        el.innerHTML = `
          <div class="rounded-full bg-brand-orange px-2 py-0.5 text-[10px] font-bold text-white shadow-lg whitespace-nowrap">
            📷 ${c.name}
          </div>
          <div class="h-2 w-2 rounded-full bg-brand-orange shadow"></div>
        `;
        el.onclick = () => router.push(`/cctv/${c.id}`);

        new kakao.maps.CustomOverlay({
          position: pos,
          content: el,
          yAnchor: 1,
          clickable: true,
        }).setMap(map);
      });

      map.setBounds(bounds);
    }

    // 이미 로드된 경우 바로 실행
    if (window.kakao?.maps) {
      window.kakao.maps.load(loadMap);
      return;
    }

    // 스크립트 동적 로드
    const existing = document.getElementById("kakao-map-sdk") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => window.kakao.maps.load(loadMap));
      return;
    }
    const script = document.createElement("script");
    script.id = "kakao-map-sdk";
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&autoload=false`;
    script.async = true;
    script.onload = () => window.kakao.maps.load(loadMap);
    script.onerror = () => console.error("Kakao Maps SDK 로드 실패");
    document.head.appendChild(script);
  }, [cctvs, router]);

  return (
    <div
      ref={containerRef}
      className="h-[60vh] w-full rounded-2xl border border-border-soft bg-bg-secondary overflow-hidden"
    />
  );
}
