"use client";

import { usePreviewRuntime } from "@/components/common/PreviewRuntimeProvider";

import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { cameraWatchUrl, openCameraWatch, requiresExternalPlayback, requiresPlaybackDetail } from "@/lib/cctv-playback-target";
import { CameraDialog, type DialogCamera } from "@/components/cctv/CameraDialog";

type CctvLike = DialogCamera & {
  id: string; name: string; region?: string; category?: string;
  lat?: number; lng?: number; latitude?: number; longitude?: number;
  youtubeId?: string; active?: boolean;
};
type PositionedCamera = CctvLike & { listOrdinal: number };
const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
type KakaoNS = {
  maps: {
    load: (cb: () => void) => void;
    LatLng: new (lat: number, lng: number) => unknown;
    LatLngBounds: new () => { extend: (latlng: unknown) => void };
    Map: new (container: HTMLElement, options: { center: unknown; level: number }) => { setBounds: (bounds: unknown) => void; relayout?: () => void };
    CustomOverlay: new (opts: { position: unknown; content: HTMLElement; yAnchor?: number; xAnchor?: number; clickable?: boolean }) => { setMap: (map: unknown) => void };
  };
};
function kakao() { return (window as unknown as { kakao?: KakaoNS }).kakao; }

export function CctvMap({ cctvs, compact = false, onCameraOpen }: { cctvs: readonly CctvLike[]; compact?: boolean; onCameraOpen?: (id: string) => void }) {
  const preview = usePreviewRuntime();
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapState, setMapState] = useState<"loading" | "ready" | "osm" | "static">("loading");
  const [retry, setRetry] = useState(0);
  // Public filters may return a fresh array on every UI render. Depend on the
  // serializable inventory content, not array identity, to retain pan/zoom.
  // Include all fields so source, coordinate and displayed metadata edits still rebuild.
  // Number before coordinate filtering: a missing position must not renumber later
  // pins away from their matching compact-list cards.
  const inventoryKey = JSON.stringify(cctvs
    .map((c, index) => ({ ...c, listOrdinal: index + 1, lat: c.lat ?? c.latitude, lng: c.lng ?? c.longitude }))
    .filter(c => c.active !== false && Number.isFinite(c.lat) && Number.isFinite(c.lng) && Math.abs(c.lat!) <= 90 && Math.abs(c.lng!) <= 180));
  const valid = useMemo(() => JSON.parse(inventoryKey) as PositionedCamera[], [inventoryKey]);
  const selected = cctvs.find(c => c.id === selectedId && c.active !== false && !requiresExternalPlayback(c) && !requiresPlaybackDetail(c));
  // Reconcile during render so the dialog disappears immediately and the discarded
  // selection cannot reopen if filters or the published inventory later restore it.
  if (selectedId !== null && !selected) setSelectedId(null);

  useEffect(() => {
    if (!containerRef.current || valid.length === 0) return;
    let disposed = false;
    let fallbackStarted = false;
    let leafletMap: import("leaflet").Map | undefined;
    let tileTimer: number | undefined;
    let resizeObserver: ResizeObserver | undefined;
    const overlays: { setMap: (map: unknown) => void }[] = [];
    const container = containerRef.current;
    let script: HTMLScriptElement | null = null;
    const choose = (camera: CctvLike) => {
      if (camera.active === false) return;
      onCameraOpen?.(camera.id);
      if (preview || requiresExternalPlayback(camera)) {
        setSelectedId(null);
        openCameraWatch(camera, preview); // Synchronous marker gesture, never an effect popup.
      } else if (requiresPlaybackDetail(camera)) {
        setSelectedId(null);
        window.location.assign(`/cctv/${encodeURIComponent(camera.id)}`);
      } else setSelectedId(camera.id);
    };
    const markerButton = (camera: PositionedCamera) => {
      const marker = document.createElement("button");
      marker.type = "button";
      marker.textContent = compact ? String(camera.listOrdinal) : `📷 ${camera.name}`;
      marker.title = camera.name;
      marker.className = compact ? "wind-map-pin" : "cctv-map-pin";
      marker.setAttribute("aria-label", `${camera.name} CCTV 보기${requiresExternalPlayback(camera) ? " (새 창)" : requiresPlaybackDetail(camera) ? " (상세에서 확인)" : ""}`);
      marker.style.cssText = compact
        ? "cursor:pointer;width:30px;height:30px;border:2px solid #ffffff;border-radius:50%;background:#171717;color:#ffffff;font-size:11px;font-weight:700;box-shadow:0 2px 5px #00000026"
        : "cursor:pointer;border:2px solid white;border-radius:6px;background:#172524;color:#d9ff60;padding:6px 10px;font-size:11px;font-weight:700;box-shadow:0 2px 6px #0004;white-space:nowrap";
      marker.onclick = () => choose(camera);
      return marker;
    };
    let fallbackExpired = false;
    const staticFallback = () => {
      if (disposed) return;
      fallbackExpired = true;
      window.clearTimeout(tileTimer);
      resizeObserver?.disconnect();
      leafletMap?.remove();
      leafletMap = undefined;
      container.replaceChildren();
      setMapState("static");
    };
    const startFallback = () => {
      if (disposed || fallbackStarted) return;
      fallbackStarted = true;
      window.clearTimeout(timeout);
      script?.removeEventListener("load", onLoad);
      script?.removeEventListener("error", startFallback);
      script?.remove(); // Do not keep a failed SDK element around for a user retry.
      overlays.forEach(overlay => overlay.setMap(null));
      resizeObserver?.disconnect();
      resizeObserver = undefined;
      container.replaceChildren();
      setMapState("loading");
      tileTimer = window.setTimeout(staticFallback, 12000);
      void import("leaflet").then(L => {
        if (disposed || !tileTimer) return;
        // A timed-out import must not replace the local diagram later.
        if (fallbackExpired) return;
        leafletMap = L.map(container, { scrollWheelZoom: false });
        const map = leafletMap;
        if (typeof ResizeObserver !== "undefined") {
          resizeObserver = new ResizeObserver(() => map.invalidateSize());
          resizeObserver.observe(container);
        }
        const points = valid.map(c => [c.lat!, c.lng!] as [number, number]);
        map.fitBounds(L.latLngBounds(points), { padding: [35, 35], maxZoom: 12 });
        let loaded = false;
        const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19, keepBuffer: 0, updateWhenIdle: true,
        });
        tiles.on("tileload", () => {
          if (disposed || fallbackExpired) return;
          loaded = true;
          window.clearTimeout(tileTimer);
          setMapState("osm");
        });
        tiles.on("load", () => { if (!loaded) staticFallback(); });
        tiles.addTo(map);
        valid.forEach(camera => {
          const button = markerButton(camera);
          L.marker([camera.lat!, camera.lng!], {
            icon: L.divIcon({ html: button, className: "cctv-map-marker", iconSize: compact ? [30, 30] : [120, 32], iconAnchor: compact ? [15, 15] : [60, 16] }),
            keyboard: false,
          }).addTo(map);
        });
      }).catch(staticFallback);
    };
    const timeout = window.setTimeout(startFallback, 8000);
    function loadMap() {
      if (disposed || fallbackStarted) return;
      const sdk = kakao();
      if (!sdk) { startFallback(); return; }
      try {
        container.replaceChildren();
        const bounds = new sdk.maps.LatLngBounds();
        const map = new sdk.maps.Map(container, { center: new sdk.maps.LatLng(33.38, 126.55), level: 10 });
        valid.forEach(camera => {
          const position = new sdk.maps.LatLng(camera.lat!, camera.lng!);
          bounds.extend(position);
          const overlay = new sdk.maps.CustomOverlay({ position, content: markerButton(camera), xAnchor: 0.5, yAnchor: 0.5, clickable: true });
          overlay.setMap(map);
          overlays.push(overlay);
        });
        map.setBounds(bounds);
        if (typeof ResizeObserver !== "undefined" && typeof map.relayout === "function") {
          resizeObserver = new ResizeObserver(() => { if (!disposed && !fallbackStarted) map.relayout?.(); });
          resizeObserver.observe(container);
        }
        window.clearTimeout(timeout);
        setMapState("ready");
      } catch { startFallback(); }
    }
    function onLoad() {
      if (disposed || fallbackStarted) return;
      try {
        const sdk = kakao();
        if (!sdk?.maps) startFallback();
        else sdk.maps.load(loadMap);
      } catch { startFallback(); }
    }
    if (!KAKAO_KEY) startFallback();
    else if (kakao()?.maps) onLoad();
    else {
      script = document.getElementById("kakao-map-sdk") as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement("script");
        script.id = "kakao-map-sdk";
        script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(KAKAO_KEY)}&autoload=false`;
        script.async = true;
        script.addEventListener("load", onLoad);
        script.addEventListener("error", startFallback);
        document.head.appendChild(script);
      } else {
        script.addEventListener("load", onLoad);
        script.addEventListener("error", startFallback);
      }
    }
    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      window.clearTimeout(tileTimer);
      script?.removeEventListener("load", onLoad);
      script?.removeEventListener("error", startFallback);
      if (!kakao()?.maps) script?.remove();
      overlays.forEach(overlay => overlay.setMap(null));
      resizeObserver?.disconnect();
      leafletMap?.remove();
      container.replaceChildren();
    };
  }, [valid, retry, compact, onCameraOpen, preview]);

  const available = cctvs.filter(camera => camera.active !== false);
  const message = !valid.length ? "현재 조건에 위치가 등록된 CCTV가 없어요. 아래 목록에서 선택해 주세요."
    : mapState === "static" ? "배경 지도를 불러오지 못했어요. 위치 관계도와 목록에서 CCTV를 선택할 수 있어요."
    : mapState === "osm" ? "OpenStreetMap 대체 지도를 표시하고 있어요."
    : mapState === "loading" ? "제주 지도를 불러오고 있어요… 아래 목록은 바로 이용할 수 있어요." : null;
  const selectCamera = (camera: CctvLike) => {
    if (camera.active === false) return;
    onCameraOpen?.(camera.id);
    if (preview || requiresExternalPlayback(camera)) { setSelectedId(null); openCameraWatch(camera, preview); }
    else if (requiresPlaybackDetail(camera)) {
      setSelectedId(null);
      window.location.assign(`/cctv/${encodeURIComponent(camera.id)}`);
    } else setSelectedId(camera.id);
  };
  const lats = valid.map(c => c.lat!);
  const lngs = valid.map(c => c.lng!);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const cameraIndex = (
    <section aria-label="지도 CCTV 목록" className={compact ? "wind-map-camera-index max-h-48 overflow-y-auto p-3" : "mt-4 rounded-2xl border border-[#172524]/20 p-5"}>
        <h3 className="mb-3 font-bold">CCTV 위치 목록</h3>
        {available.length === 0 ? <p className="text-sm">현재 조건에 맞는 CCTV가 없어요.</p> : <ul className={compact ? "grid gap-3" : "grid gap-3 sm:grid-cols-2"}>
          {available.map(camera => <li key={camera.id}>
            <button type="button" className="text-left text-sm font-bold underline underline-offset-4" onClick={() => selectCamera(camera)}>{compact ? `${cctvs.findIndex(c => c.id === camera.id) + 1}. ` : valid.findIndex(c => c.id === camera.id) >= 0 ? `${valid.findIndex(c => c.id === camera.id) + 1}. ` : ""}{camera.name}{(preview || requiresExternalPlayback(camera)) ? " · 새 창 ↗" : requiresPlaybackDetail(camera) ? " · 상세에서 확인" : ""}</button>
            <p className="mt-1 text-xs opacity-70">{valid.some(c => c.id === camera.id) ? [camera.region, camera.category].filter(Boolean).join(" · ") || "위치 등록됨" : "위치 미등록"}</p>
            {(preview || requiresExternalPlayback(camera)) && <a className="text-xs underline" href={cameraWatchUrl(camera, preview)} target="_blank" rel="noopener noreferrer">새 창이 열리지 않으면 직접 열기</a>}
          </li>)}
        </ul>}
      </section>
  );
  return (
    <>
      {message && <p role="status" className={compact ? "wind-map-status px-3 py-2 text-xs" : "rounded-2xl border border-[#172524]/20 bg-[#e9ede6] p-5 text-sm"}>{message}</p>}
      <div className="relative"><div ref={containerRef} aria-label="제주 CCTV 지도" className={(!valid.length ? "hidden " : mapState === "static" ? "invisible absolute left-0 top-0 pointer-events-none " : "relative ") + (compact ? "wind-map-canvas z-0 h-[420px] max-h-[55vh] min-h-[280px] w-full overflow-hidden bg-[#deeee5]" : "z-0 h-[60vh] w-full overflow-hidden rounded-2xl border border-[#172524]/20 bg-[#e9ede6]")} /></div>
      {mapState === "static" && valid.length > 0 && <section aria-label="CCTV 위치 관계도" className={compact ? "wind-map-diagram bg-[#deeee5] p-3" : "rounded-2xl border border-[#172524]/20 bg-[#e9ede6] p-5"}>
        <p className="text-sm">위치 관계도 · 북쪽 ↑ · 실제 지도 배경이 아닌 좌표 기준 배치</p>
        <div className={compact ? "relative my-3 h-64 overflow-hidden border border-dashed border-[#184c3b]/20" : "relative my-4 h-72 overflow-hidden rounded-xl border border-dashed border-[#172524]/30"}>
          {valid.map((camera, index) => <button key={camera.id} type="button" onClick={() => selectCamera(camera)} title={camera.name} aria-label={`${camera.name} CCTV 보기${requiresExternalPlayback(camera) ? " (새 창)" : requiresPlaybackDetail(camera) ? " (상세에서 확인)" : ""}`} className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#172524] px-2 py-1 text-xs text-[#d9ff60]" style={{ left: `${10 + 80 * (camera.lng! - minLng) / (maxLng - minLng || 1)}%`, top: `${90 - 80 * (camera.lat! - minLat) / (maxLat - minLat || 1)}%` }}>{compact ? camera.listOrdinal : index + 1}</button>)}
        </div>
        <button type="button" className="rounded-full border border-[#172524] px-4 py-2 text-sm" onClick={() => { setMapState("loading"); setRetry(value => value + 1); }}>지도 다시 시도</button>
      </section>}
      {compact ? <details className="wind-map-index" open={mapState === "static" || !valid.length}>
        <summary>위치 목록 · {available.length}곳 <span>이름으로 선택하기</span></summary>
        {cameraIndex}
      </details> : cameraIndex}
      {selected && <CameraDialog key={selected.id} camera={selected} onClose={() => setSelectedId(null)} />}
    </>
  );
}
