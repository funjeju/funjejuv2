"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CameraDialog, type DialogCamera } from "@/components/cctv/CameraDialog";

type CctvLike = DialogCamera & {
  id: string; name: string; region?: string; category?: string;
  lat?: number; lng?: number; latitude?: number; longitude?: number;
  youtubeId?: string; active?: boolean;
};
const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
type KakaoNS = {
  maps: {
    load: (cb: () => void) => void;
    LatLng: new (lat: number, lng: number) => unknown;
    LatLngBounds: new () => { extend: (latlng: unknown) => void };
    Map: new (container: HTMLElement, options: { center: unknown; level: number }) => { setBounds: (bounds: unknown) => void };
    CustomOverlay: new (opts: { position: unknown; content: HTMLElement; yAnchor?: number; xAnchor?: number; clickable?: boolean }) => { setMap: (map: unknown) => void };
  };
};
function kakao() { return (window as unknown as { kakao?: KakaoNS }).kakao; }

export function CctvMap({ cctvs }: { cctvs: readonly CctvLike[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapState, setMapState] = useState<"loading" | "ready" | "error">("loading");
  const valid = useMemo(() => cctvs.map(c => ({ ...c, lat: c.lat ?? c.latitude, lng: c.lng ?? c.longitude }))
    .filter(c => c.active !== false && Number.isFinite(c.lat) && Number.isFinite(c.lng) && Math.abs(c.lat!) <= 90 && Math.abs(c.lng!) <= 180), [cctvs]);
  const selected = cctvs.find(c => c.id === selectedId && c.active !== false);
  // Reconcile during render so the dialog disappears immediately and the discarded
  // selection cannot reopen if filters or the published inventory later restore it.
  if (selectedId !== null && !selected) setSelectedId(null);

  useEffect(() => {
    if (!KAKAO_KEY || !containerRef.current || valid.length === 0) return;
    let disposed = false;
    const overlays: { setMap: (map: unknown) => void }[] = [];
    const container = containerRef.current;
    const fail = () => { if (!disposed) setMapState("error"); };
    const timeout = window.setTimeout(fail, 15000);
    function loadMap() {
      if (disposed) return;
      const sdk = kakao();
      if (!sdk) { fail(); return; }
      try {
        container.replaceChildren();
        const bounds = new sdk.maps.LatLngBounds();
        const map = new sdk.maps.Map(container, { center: new sdk.maps.LatLng(33.38, 126.55), level: 10 });
        valid.forEach(c => {
          const pos = new sdk.maps.LatLng(c.lat!, c.lng!);
          bounds.extend(pos);
          // DOM textContent deliberately avoids interpreting camera names as markup.
          const marker = document.createElement("button");
          marker.type = "button";
          marker.textContent = `📷 ${c.name}`;
          marker.setAttribute("aria-label", `${c.name} CCTV 보기`);
          marker.style.cssText = "cursor:pointer;border:2px solid white;border-radius:6px;background:#172524;color:#d9ff60;padding:6px 10px;font-size:11px;font-weight:700;box-shadow:0 2px 6px #0004;white-space:nowrap";
          marker.onclick = () => setSelectedId(c.id);
          const overlay = new sdk.maps.CustomOverlay({ position: pos, content: marker, xAnchor: 0.5, yAnchor: 0.5, clickable: true });
          overlay.setMap(map);
          overlays.push(overlay);
        });
        map.setBounds(bounds);
        window.clearTimeout(timeout);
        setMapState("ready");
      } catch { fail(); }
    }
    const onLoad = () => { if (!disposed) kakao()?.maps.load(loadMap); };
    let script = document.getElementById("kakao-map-sdk") as HTMLScriptElement | null;
    if (kakao()?.maps) onLoad();
    else {
      if (!script) {
        script = document.createElement("script");
        script.id = "kakao-map-sdk";
        script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(KAKAO_KEY)}&autoload=false`;
        script.async = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", onLoad);
      script.addEventListener("error", fail);
    }
    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      script?.removeEventListener("load", onLoad);
      script?.removeEventListener("error", fail);
      overlays.forEach(overlay => overlay.setMap(null));
      container.replaceChildren();
    };
  }, [valid]);

  const message = !KAKAO_KEY ? "지도를 준비 중이에요. 목록에서 CCTV를 선택해 주세요."
    : valid.length === 0 ? "현재 조건에 위치가 등록된 CCTV가 없어요."
    : mapState === "error" ? "지도를 불러오지 못했어요. 목록에서 CCTV를 확인할 수 있어요."
    : mapState === "loading" ? "제주 지도를 불러오고 있어요…" : null;
  return (
    <>
      {message && <p role="status" className="rounded-2xl border border-[#172524]/20 bg-[#e9ede6] p-5 text-sm">{message}</p>}
      <div ref={containerRef} aria-label="제주 CCTV 지도" className={(!KAKAO_KEY || !valid.length ? "hidden " : "") + "h-[60vh] w-full overflow-hidden rounded-2xl border border-[#172524]/20 bg-[#e9ede6]"} />
      {selected && <CameraDialog key={selected.id} camera={selected} onClose={() => setSelectedId(null)} />}
    </>
  );
}
