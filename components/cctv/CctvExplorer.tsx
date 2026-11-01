"use client";

import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { ArrowDown, ArrowUpRight, Camera, Compass, Grid2X2, Map, Search, SlidersHorizontal, X } from "lucide-react";
import { CctvList } from "@/components/cctv/CctvList";
import { CctvMap } from "@/components/cctv/CctvMap";
import { useCctvs } from "@/hooks/useCctvs";
import { filterCctvs } from "@/lib/cctv-explorer";
import { cameraWatchUrl, requiresHttpsProxyWindow } from "@/lib/cctv-playback-target";

const DIRECTIONS = [{ value: "", label: "제주 전체", en: "ALL" }, { value: "북", label: "북쪽", en: "NORTH" }, { value: "동", label: "동쪽", en: "EAST" }, { value: "남", label: "남쪽", en: "SOUTH" }, { value: "서", label: "서쪽", en: "WEST" }];

export function CctvExplorer() {
  const params = useSearchParams();
  const { cctvs, loading, error } = useCctvs();
  const query = params.get("q") ?? "";
  const direction = params.get("direction") ?? "";
  const category = params.get("category") ?? "";
  const view = params.get("view") === "map" ? "map" : "list";
  const filtered = filterCctvs(cctvs, { query, direction, category });
  const categories = [...new Set(cctvs.map((c) => c.category))].sort();
  const activeFilters = !!(query || direction || category);
  const quickViews = !activeFilters && !loading && !error
    ? ["jeju_airport", "halla_baengnokdam"].flatMap(id => {
      const camera = cctvs.find(c => c.id === id && c.active && requiresHttpsProxyWindow(c));
      return camera ? [camera] : [];
    }) : [];

  function update(values: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    Object.entries(values).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    const search = next.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${search ? `?${search}` : ""}`);
  }
  function exploreMap() {
    update({ view: "map" });
    document.getElementById("camera-explorer")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }

  return (
    <div className="cctv-explorer editorial-explorer">
      <section className="editorial-hero" aria-labelledby="explorer-title">
        <div className="editorial-hero-copy">
          <div className="editorial-eyebrow"><span className="editorial-cross">✳</span> A WINDOW TO JEJU <span className="editorial-edition">01 — EXPLORE</span></div>
          <p className="editorial-hero-kicker">어디에 있든, 지금</p>
          <h1 id="explorer-title">제주를<br /><span>켜다.</span><span className="editorial-title-arrow" aria-hidden="true">↗</span></h1>
          <p className="editorial-hero-description">파도는 어떤지, 산은 맑은지.<br />궁금한 제주의 풍경을 한 화면에서.</p>
          <a href="#camera-explorer" className="editorial-primary-link">카메라 둘러보기 <ArrowDown size={17} /></a>
        </div>
        <div className="editorial-hero-visual">
          <Image src="/cctv-editorial/seongsan-coast.jpg" alt="성산일출봉의 절벽과 바다를 담은 풍경 사진" fill priority sizes="(max-width: 760px) 100vw, 55vw" className="editorial-hero-photo" />
          <div className="editorial-photo-shade" />
          <span className="editorial-coordinate">JEJU ISLAND<br />33° N / 126° E</span>
          <button type="button" onClick={exploreMap} className="editorial-map-stamp" aria-label="제주 CCTV 지도 펼치기"><Compass size={28} strokeWidth={1.2} /><span>지도로<br />펼쳐보기</span><ArrowUpRight size={18} /></button>
          <div className="editorial-photo-caption"><span>THE ISLAND, UP CLOSE.</span><p>풍경 이미지 · 현재 CCTV 화면이 아닙니다</p></div>
        </div>
      </section>

      <div className="editorial-ticker" aria-label="탐색 안내"><span>오늘의 목적지, 미리 만나기</span><span aria-hidden="true">✳</span><span>바다에서 한라산까지</span><span aria-hidden="true">✳</span><span>마음 가는 풍경을 골라보세요</span><ArrowUpRight size={20} aria-hidden="true" /></div>

      <section id="camera-explorer" className="editorial-cameras" aria-labelledby="camera-list-title">
        <div className="editorial-section-heading">
          <div><p className="editorial-section-label">FIND YOUR VIEW <span>— 01</span></p><h2 id="camera-list-title">어떤 제주가 궁금하세요<span className="editorial-lime-dot">?</span></h2></div>
          <p className="editorial-heading-note">발걸음보다 먼저,<br />풍경을 만나보세요.</p>
        </div>
        <div className="editorial-search-row">
          <div className="editorial-search"><Search size={21} aria-hidden="true" /><label htmlFor="cctv-search" className="sr-only">카메라 이름, 지역 또는 풍경 검색</label><input id="cctv-search" type="search" value={query} onChange={e => update({ q: e.target.value })} placeholder="장소, 지역, 보고 싶은 풍경을 검색하세요" />{query && <button type="button" onClick={() => update({ q: "" })} aria-label="검색어 지우기"><X size={17} /></button>}</div>
          <div className="editorial-view-toggle" aria-label="보기 방식">{([{ id: "list", label: "목록", icon: Grid2X2 }, { id: "map", label: "지도", icon: Map }] as const).map(({ id, label, icon: Icon }) => <button type="button" key={id} aria-label={label} onClick={() => update({ view: id })} aria-pressed={view === id}><Icon size={17} aria-hidden="true" /><span>{label}</span></button>)}</div>
        </div>
        <div className="editorial-filter-row"><div className="editorial-directions" aria-label="제주 방향">{DIRECTIONS.map(({ value, label, en }) => <button type="button" key={value} onClick={() => update({ direction: value })} aria-pressed={direction === value}><span>{label}</span><small>{en}</small></button>)}</div><label className="editorial-category"><SlidersHorizontal size={15} /><span className="sr-only">카메라 종류</span><select value={category} onChange={e => update({ category: e.target.value })}><option value="">모든 풍경</option>{categories.map(value => <option key={value}>{value}</option>)}</select></label></div>
        <div className="editorial-results-note"><p role="status">{loading ? "카메라 목록을 불러오는 중" : error ? "목록 연결을 확인해주세요" : <><strong>{filtered.length}</strong>개의 카메라 <span>· 재생 상태는 영상을 열어 확인해 주세요</span></>}</p>{activeFilters ? <button type="button" onClick={() => update({ q: "", direction: "", category: "" })}><X size={13} />필터 초기화</button> : <span className="editorial-list-hint">CLICK A VIEW, FEEL JEJU.</span>}</div>
        {quickViews.length > 0 && <nav aria-label="자주 찾는 풍경 새 창 보기" className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-[#172524]/20 bg-[#e9ede6] p-4"><span className="mr-2 text-xs font-bold">자주 찾는 풍경</span>{quickViews.map(camera => <a key={camera.id} href={cameraWatchUrl(camera)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#172524] px-4 py-2 text-xs font-bold text-[#d9ff60]">{camera.name} · 새 창 <ArrowUpRight size={14} aria-hidden="true" /></a>)}</nav>}
        {loading ? <ExplorerSkeleton /> : error ? <div role="alert" className="editorial-empty"><Camera size={32} strokeWidth={1.2} /><h3>목록 연결이 잠시 쉬고 있어요.</h3><p>카메라 고장으로 판단한 것은 아닙니다.<br />잠시 후 목록을 다시 불러와 주세요.</p><button type="button" onClick={() => window.location.reload()}>다시 불러오기 <ArrowUpRight size={15} /></button></div> : filtered.length === 0 ? <div className="editorial-empty"><Search size={32} strokeWidth={1.2} /><h3>{activeFilters ? "아직 찾지 못한 제주의 한 장면." : "카메라 목록을 준비하고 있어요."}</h3><p>{activeFilters ? "검색어나 지역을 바꾸면 다른 풍경을 만날 수 있어요." : "기존 기록을 삭제하지 않고 목록 연결을 확인하고 있습니다."}</p>{activeFilters && <button type="button" onClick={() => update({ q: "", direction: "", category: "" })}>전체 카메라 보기 <ArrowUpRight size={15} /></button>}</div> : view === "map" ? <CctvMap cctvs={filtered} /> : <CctvList cctvs={filtered} />}
      </section>

      <footer className="editorial-footer"><div className="editorial-footer-brand">funjeju<span>✳</span></div><div className="editorial-footer-row"><p>제주를 여는 가장 작은 창.<br /><span>© FunJeju. All views, one island.</span></p><p>외부 영상은 현장 통신·점검에 따라 중단될 수 있습니다.<br />목록의 사진은 풍경 이미지이며 실시간 영상이 아닙니다.</p><a href="mailto:naggu1999@naver.com">문의하기 ↗</a></div><div className="editorial-credits"><p>메인 풍경 사진: <a href="https://commons.wikimedia.org/wiki/File:Seongsan_Ilchulbong_cliff_facing_the_sea.jpg" target="_blank" rel="noopener noreferrer">A. D. Prakasa / Wikimedia Commons</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a> · 화면 비율에 맞춰 자름. 카드 사진의 출처는 각 카드에 표시합니다.</p></div></footer>
    </div>
  );
}

export function ExplorerSkeleton() {
  return <div aria-label="카메라 목록 로딩 중" className="editorial-skeleton-grid">{Array.from({ length: 6 }, (_, i) => <div key={i} className="editorial-skeleton"><div /><span /><span /></div>)}</div>;
}
