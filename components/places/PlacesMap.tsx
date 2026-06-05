"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getCategoryMeta } from "@/constants/places-meta";

type Marker = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  region: string;
  img: string;
};

type Props = {
  places: { id: string; place_name: string; lat: number; lng: number; categories: string[]; region: string; imageUrl: string }[];
  category?: string;
};

declare global {
  interface Window {
    kakao: {
      maps: {
        load: (cb: () => void) => void;
        LatLng: new (lat: number, lng: number) => unknown;
        LatLngBounds: new () => { extend: (latlng: unknown) => void; getSouthWest: () => { getLat: () => number; getLng: () => number }; getNorthEast: () => { getLat: () => number; getLng: () => number } };
        Map: new (container: HTMLElement, options: { center: unknown; level: number }) => MapInstance;
        Marker: new (opts: { position: unknown; image?: unknown; title?: string }) => MarkerInstance;
        CustomOverlay: new (opts: { position: unknown; content: string | HTMLElement; xAnchor?: number; yAnchor?: number; clickable?: boolean }) => CustomOverlayInstance;
        MarkerImage: new (src: string, size: unknown, options?: { offset?: unknown }) => unknown;
        Size: new (w: number, h: number) => unknown;
        Point: new (x: number, y: number) => unknown;
        MarkerClusterer: new (opts: { map: MapInstance; averageCenter?: boolean; minLevel?: number; gridSize?: number }) => { addMarkers: (m: MarkerInstance[]) => void; clear: () => void };
        event: { addListener: (target: unknown, type: string, fn: (...args: unknown[]) => void) => void };
      };
    };
  }
}

type MapInstance = {
  setCenter: (latlng: unknown) => void;
  setLevel: (level: number) => void;
  getBounds: () => { getSouthWest: () => { getLat: () => number; getLng: () => number }; getNorthEast: () => { getLat: () => number; getLng: () => number } };
  getCenter: () => unknown;
  getLevel: () => number;
};
type MarkerInstance = {
  setMap: (m: MapInstance | null) => void;
};
type CustomOverlayInstance = {
  setMap: (m: MapInstance | null) => void;
};

const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;

export function PlacesMap({ places, category }: Props) {
  const mapRef     = useRef<HTMLDivElement>(null);
  const mapInst    = useRef<MapInstance | null>(null);
  const markersRef = useRef<MarkerInstance[]>([]);
  const [selected, setSelected] = useState<Marker | null>(null);
  const [boundsLoading, setBoundsLoading] = useState(false);
  const [boundsMarkers, setBoundsMarkers] = useState<Marker[]>([]);

  // 카카오맵 SDK 로드
  useEffect(() => {
    if (!KAKAO_KEY) {
      console.error("NEXT_PUBLIC_KAKAO_MAP_KEY 미설정");
      return;
    }
    if (window.kakao?.maps) {
      initMap();
      return;
    }
    const script = document.createElement("script");
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&libraries=clusterer&autoload=false`;
    script.async = true;
    script.onload = () => window.kakao.maps.load(initMap);
    document.head.appendChild(script);
    return () => { script.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function initMap() {
    if (!mapRef.current || mapInst.current) return;
    const kakao = window.kakao.maps;
    mapInst.current = new kakao.Map(mapRef.current, {
      center: new kakao.LatLng(33.38, 126.55), // 제주 중심
      level: 9, // 전체 보이는 줌
    });

    // 지도 이동 시 영역 마커 재조회
    kakao.event.addListener(mapInst.current, "idle", () => {
      if (mapInst.current!.getLevel() <= 7) {
        loadBoundsMarkers();
      } else {
        // 너무 줌아웃이면 필터 결과만
        renderFilteredMarkers();
      }
    });

    // 초기 렌더
    renderFilteredMarkers();
  }

  // 필터된 places 마커 표시 (줌아웃 시)
  function renderFilteredMarkers() {
    if (!mapInst.current) return;
    clearMarkers();
    const kakao = window.kakao.maps;
    places.forEach((p) => {
      const meta = getCategoryMeta(p.categories[0] ?? "Attraction");
      const overlay = new kakao.CustomOverlay({
        position: new kakao.LatLng(p.lat, p.lng),
        content: `<div style="background:white;border:2px solid #ff5722;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 4px rgba(0,0,0,0.2);cursor:pointer">${meta?.emoji ?? "📍"}</div>`,
        yAnchor: 0.5,
        clickable: true,
      });
      overlay.setMap(mapInst.current);
      // CustomOverlay는 click 이벤트 없음 → 마커도 같이 생성해서 click 처리
      const marker = new kakao.Marker({ position: new kakao.LatLng(p.lat, p.lng) });
      kakao.event.addListener(marker, "click", () => {
        setSelected({
          id: p.id, name: p.place_name, lat: p.lat, lng: p.lng,
          category: p.categories[0] ?? "Attraction", region: p.region, img: p.imageUrl,
        });
      });
      marker.setMap(mapInst.current);
      markersRef.current.push(marker);
    });
    setBoundsMarkers([]);
  }

  // 줌인 시 현재 영역 마커 로드
  async function loadBoundsMarkers() {
    if (!mapInst.current) return;
    setBoundsLoading(true);
    try {
      const bounds = mapInst.current.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      const sp = new URLSearchParams({
        swLat: String(sw.getLat()),
        swLng: String(sw.getLng()),
        neLat: String(ne.getLat()),
        neLng: String(ne.getLng()),
      });
      if (category) sp.set("category", category);
      const res = await fetch(`/api/places/map?${sp}`);
      if (!res.ok) return;
      const { markers } = (await res.json()) as { markers: Marker[] };
      setBoundsMarkers(markers);
      drawBoundsMarkers(markers);
    } finally {
      setBoundsLoading(false);
    }
  }

  function drawBoundsMarkers(markers: Marker[]) {
    if (!mapInst.current) return;
    clearMarkers();
    const kakao = window.kakao.maps;
    markers.forEach((m) => {
      const meta = getCategoryMeta(m.category);
      const overlay = new kakao.CustomOverlay({
        position: new kakao.LatLng(m.lat, m.lng),
        content: `<div data-id="${m.id}" style="background:white;border:2px solid #ff5722;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:12px;box-shadow:0 2px 4px rgba(0,0,0,0.2);cursor:pointer">${meta?.emoji ?? "📍"}</div>`,
        yAnchor: 0.5,
        clickable: true,
      });
      overlay.setMap(mapInst.current);
      const marker = new kakao.Marker({ position: new kakao.LatLng(m.lat, m.lng), title: m.name });
      kakao.event.addListener(marker, "click", () => setSelected(m));
      marker.setMap(mapInst.current);
      markersRef.current.push(marker);
    });
  }

  function clearMarkers() {
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
  }

  // places가 바뀌면 필터 마커 다시 그림
  useEffect(() => {
    if (mapInst.current) renderFilteredMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border-soft shadow-card">
      <div ref={mapRef} className="h-[500px] w-full bg-bg-secondary md:h-[600px]" />

      {/* 로딩 인디케이터 */}
      {boundsLoading && (
        <div className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-text-secondary shadow-card">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-brand-orange mr-1.5" />
          영역 로딩 중...
        </div>
      )}

      {/* 상태 표시 */}
      <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-text-primary shadow-card">
        🗺️ 마커 {boundsMarkers.length > 0 ? boundsMarkers.length : places.length}개
        {boundsMarkers.length > 0 && (
          <span className="ml-1 text-[10px] font-normal text-text-secondary">(현재 영역)</span>
        )}
      </div>

      {/* 안내 */}
      {boundsMarkers.length === 0 && places.length > 50 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-xl bg-brand-navy/90 px-3 py-1.5 text-[11px] font-medium text-white shadow-soft backdrop-blur">
          줌인하면 해당 영역의 모든 장소를 자동 로드해요
        </div>
      )}

      {/* 선택된 장소 카드 */}
      {selected && (
        <div className="absolute bottom-3 left-3 right-3 rounded-2xl border border-border-soft bg-white p-3 shadow-soft md:right-auto md:max-w-sm">
          <div className="flex gap-3">
            {selected.img && (
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-bg-secondary">
                <Image src={selected.img} alt={selected.name} fill className="object-cover" unoptimized />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-text-primary">{selected.name}</p>
              <p className="text-[11px] text-text-secondary">📍 {selected.region}</p>
              <div className="mt-1 flex gap-2">
                <Link href={`/places/${selected.id}`}
                  className="rounded-full bg-brand-orange px-3 py-1 text-[11px] font-bold text-white hover:bg-brand-orange/90 transition-colors">
                  자세히 →
                </Link>
                <button type="button" onClick={() => setSelected(null)}
                  className="rounded-full border border-border-soft bg-bg-card px-2 text-[11px] text-text-secondary">
                  ✕
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
