"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Camera, Grid2X2, Map, Search, ArrowUpRight, SlidersHorizontal, X } from "lucide-react";
import { CctvList } from "@/components/cctv/CctvList";
import { CctvMap } from "@/components/cctv/CctvMap";
import { DolmangyiIcon } from "@/components/common/DolmangyiIcon";
import { useCctvs } from "@/hooks/useCctvs";
import { filterCctvs } from "@/lib/cctv-explorer";

const DIRECTIONS = [{ value: "", label: "제주 전체" }, { value: "북", label: "제주 북쪽" }, { value: "동", label: "제주 동쪽" }, { value: "남", label: "제주 남쪽" }, { value: "서", label: "제주 서쪽" }];

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

  function update(values: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    Object.entries(values).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    const search = next.toString();
    // Native history integrates with App Router without re-fetching server data on every keypress.
    window.history.replaceState(null, "", `${window.location.pathname}${search ? `?${search}` : ""}`);
  }

  return (
    <div className="cctv-explorer mx-auto max-w-7xl px-5 pb-16 pt-10 text-[#244b40] md:px-9 md:pt-14">
      <section className="relative mb-9 border-b border-[#deddd3] pb-10 md:mb-11" aria-labelledby="explorer-title">
        <div className="mb-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#6f8177]"><span className="h-1.5 w-1.5 rounded-full bg-[#ed643f]" /> A little window to Jeju</div>
        <div className="flex items-end justify-between gap-5">
          <div>
            <h1 id="explorer-title" className="text-4xl font-black leading-[1.24] tracking-[-2px] md:text-6xl md:tracking-[-3px]">오늘의 제주,<br /><span className="text-[#ec633f]">어떤 모습일까요?</span></h1>
            <p className="mt-5 max-w-lg text-sm leading-7 text-[#6c7971] md:text-base">바다의 표정부터 한라산의 구름까지.<br className="sm:hidden" /> 떠나기 전, 지금의 제주를 만나보세요.</p>
          </div>
          <div className="hidden -rotate-6 rounded-[44%] border border-[#d7dec9] bg-[#e9edda] px-9 py-7 text-center sm:block" aria-hidden="true"><DolmangyiIcon size={88} /><p className="mt-2 text-[10px] font-bold tracking-wider">혼저옵서예!</p></div>
        </div>
        <div className="mt-8 flex max-w-2xl items-center gap-3 rounded-2xl border border-[#d9dfd4] bg-white px-4 py-3.5 shadow-[0_5px_20px_rgba(38,73,56,.035)] focus-within:border-[#557e64]">
          <Search size={21} className="shrink-0 text-[#5d7467]" aria-hidden="true" />
          <label htmlFor="cctv-search" className="sr-only">카메라 이름, 지역 또는 풍경 검색</label>
          <input id="cctv-search" type="search" value={query} onChange={(e) => update({ q: e.target.value })} placeholder="어떤 제주가 궁금하세요? 카메라 · 지역 · 풍경 검색" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#8b958e]" />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#7e8a81]"><span className="mr-1">이런 풍경은 어때요?</span>{["해변", "한라산", "공항", "항구"].map((term) => <button key={term} onClick={() => update({ q: term, direction: "", category: "" })} className="rounded-full px-2 py-1 hover:bg-[#e9ede3]">#{term}</button>)}</div>
      </section>

      <section aria-labelledby="camera-list-title">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div><p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#8a958d]">Your Jeju, right now</p><h2 id="camera-list-title" className="flex items-center gap-2 text-xl font-extrabold tracking-tight md:text-2xl">제주를 보는 작은 창 <span className="rounded-full bg-[#e8eddc] px-2.5 py-1 text-xs font-bold text-[#55724c]">{loading ? "…" : filtered.length}</span></h2></div>
          <div className="flex items-center gap-1 rounded-full border border-[#dbdfd4] bg-white p-1" aria-label="보기 방식">{([{ id: "list", label: "목록", icon: Grid2X2 }, { id: "map", label: "지도", icon: Map }] as const).map(({ id, label, icon: Icon }) => <button key={id} onClick={() => update({ view: id })} aria-pressed={view === id} className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${view === id ? "bg-[#315c49] text-white" : "text-[#6e7c72] hover:bg-[#f0f2e9]"}`}><Icon size={14} />{label}</button>)}</div>
        </div>
        <div className="mb-5 flex flex-wrap items-center gap-2 border-y border-[#e1e3d9] py-4">
          {DIRECTIONS.map(({ value, label }) => <button key={value} onClick={() => update({ direction: value })} aria-pressed={direction === value} className={`rounded-full border px-3.5 py-2 text-xs font-bold transition-colors ${direction === value ? "border-[#ed643f] bg-[#ed643f] text-white" : "border-[#dedfd5] bg-transparent text-[#6c7a70] hover:border-[#91a18f]"}`}>{label}</button>)}
          <label className="ml-auto flex items-center gap-1.5 text-xs text-[#6c7a70]"><SlidersHorizontal size={14} /><span className="sr-only">카메라 종류</span><select value={category} onChange={(e) => update({ category: e.target.value })} className="max-w-32 rounded-lg bg-transparent py-2 pr-1 outline-offset-4"><option value="">모든 풍경</option>{categories.map((value) => <option key={value}>{value}</option>)}</select></label>
        </div>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-[11px] leading-5 text-[#7d897f]"><p role="status">{loading ? "제주 CCTV 목록을 불러오고 있어요." : `${filtered.length}개의 공개 카메라 · 실제 재생 상태는 영상을 열면 확인해요.`}</p>{activeFilters && <button onClick={() => update({ q: "", direction: "", category: "" })} className="flex items-center gap-1 font-semibold text-[#a75d44]"><X size={12} />필터 초기화</button>}</div>
        {loading ? <ExplorerSkeleton /> : error ? <div role="alert" className="rounded-2xl border border-[#e5d5bd] bg-[#faf2e5] p-8 text-center"><Camera className="mx-auto mb-3" /><h3 className="font-bold">목록을 잠시 불러올 수 없어요</h3><p className="mt-2 text-sm text-[#7c7466]">카메라의 고장이 아니라 목록 연결 문제일 수 있어요. 잠시 후 다시 시도해 주세요.</p><button onClick={() => window.location.reload()} className="mt-5 rounded-full border border-current px-5 py-2 text-xs font-bold">다시 불러오기</button></div> : filtered.length === 0 ? <div className="rounded-2xl border border-dashed border-[#cfd6ca] py-20 text-center"><Search size={30} className="mx-auto mb-4 text-[#8d9c8b]" /><h3 className="font-bold">{activeFilters ? "찾으시는 풍경이 아직 보이지 않네요" : "공개 준비 중인 카메라예요"}</h3><p className="mt-2 text-sm text-[#7d897f]">{activeFilters ? "다른 지역이나 이름으로 찾아보세요." : "관리자가 영상을 확인한 뒤 이곳에 표시됩니다."}</p></div> : view === "map" ? <CctvMap cctvs={filtered} /> : <CctvList cctvs={filtered} />}
      </section>
      <aside className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#dce1d2] bg-[#eff1e5] px-5 py-5"><div><p className="text-sm font-bold">여러 곳의 제주를 한 화면에</p><p className="mt-1 text-xs text-[#7d897f]">마음에 드는 풍경을 골라 멀티뷰로 만나보세요.</p></div><Link href="/cctv/multiview" className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-bold">멀티뷰 열기<ArrowUpRight size={15} /></Link></aside>
      <footer className="mt-12 flex flex-wrap justify-between gap-3 border-t border-[#deddd3] pt-6 text-[11px] leading-6 text-[#8a958d]"><p>© FunJeju. 지금, 제주를 가장 가까이.</p><p>외부 영상은 점검·현장 통신 상태에 따라 중단될 수 있어요.</p><a href="mailto:naggu1999@naver.com" className="underline underline-offset-4">문의하기</a></footer>
    </div>
  );
}

export function ExplorerSkeleton() {
  return <div aria-label="카메라 목록 로딩 중" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="overflow-hidden rounded-2xl border border-[#e1e4d8] bg-white"><div className="aspect-video animate-pulse bg-[#e8ecdf]" /><div className="space-y-3 p-5"><div className="h-3 w-2/5 animate-pulse rounded bg-[#edf0e8]" /><div className="h-4 w-3/5 animate-pulse rounded bg-[#edf0e8]" /></div></div>)}</div>;
}
