"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { HlsPlayer } from "@/components/cctv/HlsPlayer";
import { YoutubePlayer } from "@/components/cctv/YoutubePlayer";
import { VurixLaunch } from "@/components/cctv/VurixLaunch";
import { isVurixId } from "@/constants/vurix";

type CctvLike = {
  id: string; name: string; region?: string; category?: string;
  lat?: number; lng?: number; latitude?: number; longitude?: number;
  youtubeId?: string; active?: boolean;
};
const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
const PROXY_URL = process.env.NEXT_PUBLIC_WORKER_URL || process.env.NEXT_PUBLIC_PROXY_URL || "";
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

export function CctvMap({ cctvs }: { cctvs: CctvLike[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapState, setMapState] = useState<"loading" | "ready" | "error">("loading");
  const valid = useMemo(() => cctvs.map(c => ({ ...c, lat: c.lat ?? c.latitude, lng: c.lng ?? c.longitude }))
    .filter(c => Number.isFinite(c.lat) && Number.isFinite(c.lng) && Math.abs(c.lat!) <= 90 && Math.abs(c.lng!) <= 180), [cctvs]);
  const selected = cctvs.find(c => c.id === selectedId);

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
          marker.style.cssText = "cursor:pointer;border:2px solid white;border-radius:20px;background:#1e3a5f;color:white;padding:6px 10px;font-size:11px;font-weight:700;box-shadow:0 2px 6px #0004;white-space:nowrap";
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
      {message && <p role="status" className="rounded-2xl border border-border-soft bg-bg-secondary p-5 text-sm">{message}</p>}
      <div ref={containerRef} aria-label="제주 CCTV 지도" className={(!KAKAO_KEY || !valid.length ? "hidden " : "") + "h-[60vh] w-full overflow-hidden rounded-2xl border border-border-soft bg-bg-secondary"} />
      {selected && <CameraDialog key={selected.id} camera={selected} onClose={() => setSelectedId(null)} />}
    </>
  );
}

function CameraDialog({ camera, onClose }: { camera: CctvLike; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => { dialog?.close(); previous?.focus(); };
  }, []);
  const proxyUrl = PROXY_URL ? `${PROXY_URL}/cctv/${camera.id}` : null;
  return (
    <dialog ref={dialogRef} onCancel={onClose} aria-labelledby="map-camera-title"
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}
      className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-2xl overflow-hidden rounded-2xl border-0 bg-bg-card p-0 text-text-primary shadow-2xl backdrop:bg-black/70">
      <div className="flex items-center justify-between gap-3 border-b border-border-soft px-4 py-3">
        <div><h2 id="map-camera-title" className="font-bold">{camera.name}</h2><p className="text-xs text-text-secondary">{camera.region} · {camera.category}</p></div>
        <button type="button" autoFocus onClick={onClose} aria-label="CCTV 미리보기 닫기" className="rounded-full p-3">✕</button>
      </div>
      {camera.active === false ? <p role="status" className="p-10 text-center">점검 또는 임시 오류로 재생이 중단되었어요.</p>
        : camera.youtubeId ? <YoutubePlayer youtubeId={camera.youtubeId} title={camera.name} />
        : isVurixId(camera.id) ? <VurixLaunch id={camera.id} name={camera.name} />
        : <HlsPlayer proxyUrl={proxyUrl} label={camera.name} cctvId={camera.id} cctvName={camera.name} />}
      <div className="flex gap-3 border-t border-border-soft p-4">
        <Link href={`/cctv/${camera.id}`} onClick={onClose} className="flex-1 rounded-full bg-brand-orange px-4 py-2 text-center text-sm font-bold text-white">자세히 보기 →</Link>
        <button type="button" onClick={onClose} className="rounded-full border border-border-soft px-4 py-2 text-sm">닫기</button>
      </div>
    </dialog>
  );
}
