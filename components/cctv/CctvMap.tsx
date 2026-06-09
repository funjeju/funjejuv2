"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { HlsPlayer } from "@/components/cctv/HlsPlayer";

type CctvLike = {
  id: string;
  name: string;
  region?: string;
  category?: string;
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
};

const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
const PROXY_URL = process.env.NEXT_PUBLIC_PROXY_URL ?? "";

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
      yAnchor?: number;
      xAnchor?: number;
      clickable?: boolean;
    }) => { setMap: (map: unknown) => void };
  };
};

type Props = { cctvs: CctvLike[] };

export function CctvMap({ cctvs }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<CctvLike | null>(null);

  useEffect(() => {
    if (!KAKAO_KEY) {
      console.error("NEXT_PUBLIC_KAKAO_MAP_KEY 미설정");
      return;
    }
    if (!containerRef.current) return;

    const valid = cctvs
      .map((c) => ({
        ...c,
        _lat: c.lat ?? c.latitude,
        _lng: c.lng ?? c.longitude,
      }))
      .filter((c) => typeof c._lat === "number" && typeof c._lng === "number");
    if (valid.length === 0) return;

    function loadMap() {
      const kakao = (window as unknown as { kakao: KakaoNS }).kakao;
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

        // ★ 핀: 작은 점 + 호버 시 라벨 표시. xAnchor 0.5, yAnchor 0.5 → 점 중심이 정확히 좌표.
        const el = document.createElement("div");
        el.style.cssText = "position:relative;cursor:pointer;";
        el.innerHTML = `
          <div style="
            width:14px;height:14px;border-radius:9999px;
            background:#1e3a5f;
            border:3px solid white;
            box-shadow:0 2px 6px rgba(0,0,0,0.35);
            transition:transform .15s;
          "></div>
          <div class="cctv-label" style="
            position:absolute;left:50%;bottom:calc(100% + 6px);
            transform:translateX(-50%);
            background:rgba(30,58,95,0.95);
            color:white;
            padding:3px 8px;border-radius:9999px;
            font-size:11px;font-weight:700;
            white-space:nowrap;
            pointer-events:none;
            opacity:0;transition:opacity .15s;
            box-shadow:0 2px 8px rgba(0,0,0,0.25);
          ">📷 ${c.name}</div>
        `;
        const dot = el.firstElementChild as HTMLDivElement;
        const label = el.querySelector(".cctv-label") as HTMLDivElement;
        el.onmouseenter = () => {
          dot.style.transform = "scale(1.3)";
          label.style.opacity = "1";
        };
        el.onmouseleave = () => {
          dot.style.transform = "scale(1)";
          label.style.opacity = "0";
        };
        el.onclick = () => setSelected(c);

        new kakao.maps.CustomOverlay({
          position: pos,
          content: el,
          xAnchor: 0.5,
          yAnchor: 0.5, // ★ 좌표가 점 중심
          clickable: true,
        }).setMap(map);
      });

      map.setBounds(bounds);
    }

    const w = window as unknown as { kakao?: KakaoNS };
    if (w.kakao?.maps) {
      w.kakao.maps.load(loadMap);
      return;
    }

    const existing = document.getElementById("kakao-map-sdk") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () =>
        (window as unknown as { kakao: KakaoNS }).kakao.maps.load(loadMap)
      );
      return;
    }
    const script = document.createElement("script");
    script.id = "kakao-map-sdk";
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&autoload=false`;
    script.async = true;
    script.onload = () => (window as unknown as { kakao: KakaoNS }).kakao.maps.load(loadMap);
    script.onerror = () => console.error("Kakao Maps SDK 로드 실패");
    document.head.appendChild(script);
  }, [cctvs]);

  const proxyUrl = selected && PROXY_URL ? `${PROXY_URL}/cctv/${selected.id}` : null;

  return (
    <>
      <div
        ref={containerRef}
        className="h-[60vh] w-full rounded-2xl border border-border-soft bg-bg-secondary overflow-hidden"
      />

      {/* CCTV 미리보기 모달 */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-bg-card shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border-soft px-4 py-3">
              <div>
                <h3 className="text-base font-bold text-text-primary">📷 {selected.name}</h3>
                <p className="text-xs text-text-secondary">
                  {selected.region}
                  {selected.category && ` · ${selected.category}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-full bg-bg-secondary p-2 text-text-secondary hover:bg-bg-primary transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="bg-black">
              <HlsPlayer
                proxyUrl={proxyUrl}
                label={selected.name}
                cctvId={selected.id}
                cctvName={selected.name}
              />
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border-soft px-4 py-3">
              <Link
                href={`/cctv/${selected.id}`}
                className="flex-1 rounded-full bg-brand-orange px-4 py-2 text-center text-xs font-bold text-white hover:bg-brand-orange/90 transition-colors"
              >
                자세히 보기 →
              </Link>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-full border border-border-soft bg-bg-secondary px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-bg-primary transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
