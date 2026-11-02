"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, Camera, Compass, ExternalLink, List, Map, MapPin, Search, SlidersHorizontal, Wind, X } from "lucide-react";
import { CctvList } from "@/components/cctv/CctvList";
import { CctvMap } from "@/components/cctv/CctvMap";
import { usePublicCctvs } from "@/hooks/usePublicCctvs";
import { CCTV_LAUNCH_OBSERVATIONS } from "@/constants/cctv-launch-observations";
import { filterCctvs } from "@/lib/cctv-explorer";
import { cameraWatchUrl, requiresHttpsProxyWindow } from "@/lib/cctv-playback-target";

import { usePreviewRuntime } from "@/components/common/PreviewRuntimeProvider";

const DIRECTIONS = [{ value: "", label: "제주 전체", en: "ALL JEJU" }, { value: "북", label: "북쪽", en: "NORTH" }, { value: "동", label: "동쪽", en: "EAST" }, { value: "남", label: "남쪽", en: "SOUTH" }, { value: "서", label: "서쪽", en: "WEST" }];
const QUICK_NAMES: Record<string, string> = { jeju_airport: "제주공항", halla_baengnokdam: "한라산 백록담" };
function scrollToView(view: "list" | "map") {
  document.getElementById(view === "map" ? "wind-map-panel" : "wind-list-panel")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
}
export function CctvExplorer() {
  const params = useSearchParams();
  const preview = usePreviewRuntime();
  const { cctvs, loading, error } = usePublicCctvs();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const query = params.get("q") ?? "";
  const direction = params.get("direction") ?? "";
  const category = params.get("category") ?? "";
  const view = params.get("view") === "map" ? "map" : "list";
  const pendingView = useRef<"list" | "map" | null>(null);
  useEffect(() => {
    if (pendingView.current !== view) return;
    pendingView.current = null;
    // Wait for the committed responsive order, not the previous panel offset.
    scrollToView(view);
  }, [view]);
  const filtered = filterCctvs(cctvs, { query, direction, category });
  const categories = [...new Set(cctvs.map(camera => camera.category))].sort();
  const activeFilters = !!(query || direction || category);
  const selected = !loading && !error ? filtered.find(camera => camera.id === selectedId) : undefined;
  if (selectedId !== null && !selected) setSelectedId(null);
  const lastObservedAt = CCTV_LAUNCH_OBSERVATIONS.reduce((latest, row) => row.observedAt > latest ? row.observedAt : latest, "");
  const quickViews = !activeFilters && !loading && !error ? ["jeju_airport", "halla_baengnokdam"].flatMap(id => {
    const camera = cctvs.find(row => row.id === id && row.active && requiresHttpsProxyWindow(row));
    return camera ? [{ ...camera, name: (typeof camera.name === "string" ? camera.name.trim() : "") || QUICK_NAMES[id] }] : [];
  }) : [];
  function update(values: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    Object.entries(values).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    window.history.replaceState(null, "", `${window.location.pathname}${next.size ? `?${next}` : ""}`);
  }
  function changeView(next: "list" | "map") {
    if (next === view) scrollToView(next);
    else { pendingView.current = next; update({ view: next }); }
  }
  return <div className="cctv-explorer wind-explorer">
    <aside className="wind-sidebar" aria-label="지역 탐색">
      <div className="wind-sidebar-brand"><Compass size={24} strokeWidth={1.3} aria-hidden="true" /><div>제주 탐색<small>ISLAND DIRECTORY</small></div></div>
      <p className="wind-sidebar-label">어디로 떠나볼까요</p>
      <nav className="wind-directions" aria-label="제주 방향">{DIRECTIONS.map(({ value, label, en }) => <button type="button" key={value} onClick={() => update({ direction: value })} aria-pressed={direction === value}><span><MapPin size={15} aria-hidden="true" />{label}</span><small>{en}</small></button>)}</nav>
      <div className="wind-sidebar-bottom"><Wind size={31} strokeWidth={1} aria-hidden="true" /><p>바람이 머무는 곳,<br />제주의 지금을 만나요.</p><span>33° N · 126° E</span>{!preview && <Link href="/mypage">내가 저장한 풍경 <ArrowUpRight size={14} aria-hidden="true" /></Link>}</div>
    </aside>
    <div className="wind-content">
      <header className="wind-intro"><div><p className="wind-eyebrow">JEJU ISLAND · CAMERA ATLAS</p><h1 id="explorer-title">바람의 좌표<span>.</span></h1><p className="wind-intro-description">보고 싶은 제주, 지도에서 찾고 새 창으로 만나세요.</p></div><div className="wind-coordinate" aria-hidden="true"><Compass size={48} strokeWidth={.8} /><span>JEJU ISLAND<br />CAMERA ATLAS</span></div></header>
      <section id="camera-explorer" aria-labelledby="explorer-title">
        <div className="wind-toolbar"><div className="wind-search"><Search size={18} strokeWidth={1.4} aria-hidden="true" /><label className="sr-only" htmlFor="cctv-search">카메라 이름, 지역 또는 풍경 검색</label><input id="cctv-search" type="search" value={query} onChange={event => update({ q: event.target.value })} placeholder="카메라 이름이나 지역을 검색하세요" />{query && <button type="button" onClick={() => update({ q: "" })} aria-label="검색어 지우기"><X size={16} /></button>}</div><label className="wind-category"><SlidersHorizontal size={16} aria-hidden="true" /><span className="sr-only">카메라 종류</span><select value={category} onChange={event => update({ category: event.target.value })}><option value="">모든 풍경</option>{categories.map(value => <option key={value}>{value}</option>)}</select></label><div className="wind-view-toggle" aria-label="보기 방식">{([{ id: "list", label: "목록", icon: List }, { id: "map", label: "지도", icon: Map }] as const).map(({ id, label, icon: Icon }) => <button type="button" key={id} aria-label={label} aria-pressed={view === id} onClick={() => changeView(id)}><Icon size={16} aria-hidden="true" /><span>{label}</span></button>)}</div></div>
        <div className="wind-results"><p role="status">{loading ? "공개 카메라를 확인하고 있어요" : error ? "목록 연결을 확인해 주세요" : <><strong>{filtered.length}</strong>개의 재생 확인 카메라</>}</p>{activeFilters && <button type="button" onClick={() => update({ q: "", direction: "", category: "" })}><X size={13} aria-hidden="true" />필터 초기화</button>}<span>영상은 별도 창에서 열립니다 <ExternalLink size={12} aria-hidden="true" /></span></div>
        {loading ? <ExplorerSkeleton /> : error ? <div role="alert" className="wind-empty"><Camera size={30} strokeWidth={1.2} /><h2>목록 연결이 잠시 쉬고 있어요.</h2><p>연결 상태를 확인하지 못해 영상을 표시하지 않습니다.</p><button type="button" onClick={() => window.location.reload()}>다시 불러오기 <ArrowUpRight size={15} /></button></div> : filtered.length === 0 ? <div className="wind-empty"><Search size={30} strokeWidth={1.2} /><h2>{activeFilters ? "조건에 맞는 풍경이 아직 없어요." : "최근 재생이 확인된 카메라가 아직 없어요."}</h2><p>{activeFilters ? "검색어나 지역을 바꾸면 다른 풍경을 만날 수 있어요." : "미확인 카메라는 공개 목록에서 제외했어요. 확인된 영상이 준비되면 표시됩니다."}</p>{activeFilters && <button type="button" onClick={() => update({ q: "", direction: "", category: "" })}>전체 카메라 보기 <ArrowUpRight size={15} /></button>}</div> : <div className="wind-dashboard" data-view={view}>
          <section id="wind-list-panel" className="wind-list-panel" aria-labelledby="wind-list-title"><div className="wind-panel-heading"><h2 id="wind-list-title">카메라 목록 <span>{filtered.length}</span></h2><small>마음 가는 풍경을 선택하세요</small></div><div className="wind-list-scroll"><CctvList cctvs={filtered} variant="compact" onCameraOpen={camera => setSelectedId(camera.id)} /></div></section>
          <div className="wind-map-column"><section id="wind-map-panel" className="wind-map-panel" aria-labelledby="wind-map-title"><div className="wind-panel-heading"><h2 id="wind-map-title"><Map size={15} aria-hidden="true" />제주, 한눈에</h2><small>번호를 누르면 영상 창이 열려요</small></div><CctvMap cctvs={filtered} compact onCameraOpen={setSelectedId} /></section>
            <section className="wind-window-panel" aria-labelledby="wind-window-title"><div className="wind-window-top"><span><ExternalLink size={14} aria-hidden="true" />영상 전용 창</span><small>SEPARATE WINDOW</small></div><div className="wind-window-body"><div className="wind-window-symbol" aria-hidden="true"><Wind size={42} strokeWidth={1} /></div><div><p className="wind-window-kicker">{selected ? `${selected.region} · ${selected.category}` : "A SMALL WINDOW TO JEJU"}</p><h2 id="wind-window-title">{selected ? selected.name : "풍경에만 집중할 수 있게."}</h2><p>{selected ? "선택한 카메라는 별도 영상 창에서 확인할 수 있어요." : "목록이나 지도에서 장소를 누르면\n영상만 담은 새 창으로 연결됩니다."}</p>{selected && requiresHttpsProxyWindow(selected) && <a className="wind-watch-link" href={cameraWatchUrl(selected)} target="_blank" rel="noopener noreferrer">{selected.name} 새 창으로 보기 <ArrowUpRight size={15} aria-hidden="true" /></a>}</div></div>{quickViews.length > 0 && <nav className="wind-quick-views" aria-label="최근 재생 확인 카메라 새 창 보기"><span>빠르게 보기</span>{quickViews.map(camera => <a className="wind-quick-link" key={camera.id} href={cameraWatchUrl(camera)} target="_blank" rel="noopener noreferrer" aria-label={`${camera.name} 새 창에서 보기`}><span>{camera.name}</span><ArrowUpRight size={14} aria-hidden="true" /></a>)}</nav>}</section>
          </div>
        </div>}
      </section>
      <footer className="wind-footer"><p>© FUNJEJU. 제주를 여는 작은 창.</p><div>{lastObservedAt && <p>영상 확인 <time dateTime={lastObservedAt}>{new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(lastObservedAt))} KST</time></p>}<p>현재 재생은 달라질 수 있습니다. 목록 사진은 풍경 이미지이며 실시간 화면이 아닙니다.</p></div><a href="mailto:naggu1999@naver.com">문의하기 <ArrowUpRight size={13} aria-hidden="true" /></a></footer>
    </div>
  </div>;
}
export function ExplorerSkeleton() {
  return <div className="wind-skeleton" aria-label="카메라 목록 로딩 중">{Array.from({ length: 5 }, (_, index) => <div key={index}><span /><span /><span /></div>)}</div>;
}
