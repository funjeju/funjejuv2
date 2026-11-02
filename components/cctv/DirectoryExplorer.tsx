"use client";

import { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, Compass, MapPin, RefreshCw } from "lucide-react";
import { CctvMap } from "@/components/cctv/CctvMap";
import { useCctvDirectory } from "@/hooks/useCctvDirectory";
import { directoryStatusLabel, directoryViewerHref } from "@/lib/cctv-directory-client";
import type { PublicDirectoryEntry } from "@/types/cctv-directory";

const directions=[{value:"",label:"제주 전체"},{value:"북",label:"북쪽"},{value:"동",label:"동쪽"},{value:"남",label:"남쪽"},{value:"서",label:"서쪽"},{value:"unknown",label:"지역 미확정"}];
const locationKnown=(entry:PublicDirectoryEntry)=>typeof entry.lat==="number"&&typeof entry.lng==="number";

/** Directory visibility is independent of source playback verification. */
export function DirectoryExplorer() {
  const params=useSearchParams();
  const {entries,loading,error,refresh}=useCctvDirectory();
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const query=params.get("q")??"",direction=params.get("direction")??"",category=params.get("category")??"";
  const view=params.get("view")==="map"?"map":"list";
  const terms=query.trim().normalize("NFKC").toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const filtered=entries.filter(entry=>entry.visible&&(!direction||(direction==="unknown"?!entry.direction:entry.direction===direction))&&(!category||entry.category===category)&&terms.every(term=>`${entry.name} ${entry.region} ${entry.category} ${entry.description}`.normalize("NFKC").toLocaleLowerCase().includes(term)));
  const selected=filtered.find(entry=>entry.id===selectedId);
  const categories=[...new Set(entries.map(entry=>entry.category).filter(Boolean))].sort();
  const missingLocations=filtered.filter(entry=>!locationKnown(entry)).length;
  const choose=useCallback((id:string)=>{
    const entry=entries.find(row=>row.id===id&&row.visible);
    if(!entry)return;
    setSelectedId(id);
    const href=directoryViewerHref(entry);
    if(href)window.open(href,"_blank","popup=yes,width=1100,height=760,resizable=yes,scrollbars=yes,noopener,noreferrer");
  },[entries]);
  function update(values:Record<string,string>){
    const next=new URLSearchParams(params.toString());
    Object.entries(values).forEach(([key,value])=>value?next.set(key,value):next.delete(key));
    window.history.replaceState(null,"",`${window.location.pathname}${next.size?`?${next}`:""}`);
  }
  const mapEntries=filtered.map(entry=>({id:entry.id,name:entry.name,region:entry.region,category:entry.category,active:true,originUrl:entry.sourceUrl,lat:entry.lat??undefined,lng:entry.lng??undefined}));
  return <div className="cctv-explorer wind-explorer">
    <aside className="wind-sidebar" aria-label="지역 탐색"><div className="wind-sidebar-brand"><Compass size={24}/><div>제주 탐색<small>CAMERA DIRECTORY</small></div></div><p className="wind-sidebar-label">어디로 떠나볼까요</p><nav className="wind-directions" aria-label="제주 방향">{directions.map(item=><button key={item.value} type="button" aria-pressed={direction===item.value} onClick={()=>update({direction:item.value})}><span><MapPin size={15}/>{item.label}</span></button>)}</nav><p className="p-5 text-xs leading-6">전체 장소를 보존합니다.<br/>목록 표시와 실제 재생 확인은 별개입니다.</p></aside>
    <div className="wind-content">
      <header className="wind-intro"><div><p className="wind-eyebrow">JEJU ISLAND · CAMERA DIRECTORY</p><h1 id="directory-title">바람의 좌표<span>.</span></h1><p className="wind-intro-description">제주의 CCTV를 빠짐없이, 목록과 지도에서.</p></div></header>
      <section aria-labelledby="directory-title">
        <p role="note" className="mb-4 border border-current/20 p-3 text-xs leading-6">재생 미확인·점검 중인 장소도 목록에 표시합니다. 영상은 제공처로 직접 새 창을 열며, HLS 원본은 브라우저에 따라 파일로 열릴 수 있습니다. 보안 경고를 우회하지 마세요.</p>
        <div className="wind-toolbar"><div className="wind-search"><label className="sr-only" htmlFor="directory-search">CCTV 이름 또는 지역 검색</label><input id="directory-search" type="search" placeholder="카메라 이름이나 지역을 검색하세요" value={query} onChange={event=>update({q:event.target.value})}/></div><label className="wind-category"><span className="sr-only">카메라 종류</span><select value={category} onChange={event=>update({category:event.target.value})}><option value="">모든 풍경</option>{categories.map(item=><option key={item}>{item}</option>)}</select></label><div className="wind-view-toggle" aria-label="보기 방식"><button type="button" aria-pressed={view==="list"} onClick={()=>update({view:"list"})}>목록</button><button type="button" aria-pressed={view==="map"} onClick={()=>update({view:"map"})}>지도</button></div><button type="button" disabled={loading} onClick={refresh} aria-label="CCTV 목록 새로고침" className="p-3"><RefreshCw size={16}/></button></div>
        <div className="wind-results"><p role="status">{loading?"전체 목록을 확인하고 있어요":error?"목록 연결 확인 필요":<><strong>{filtered.length}</strong>개 장소 · 위치 미확정 {missingLocations}개</>}</p><span>재생 상태는 각 장소에서 확인하세요</span></div>
        {loading?<p className="p-12 text-center">목록 불러오는 중…</p>:error?<div role="alert" className="wind-empty"><p>{error}</p><button type="button" onClick={refresh}>다시 불러오기</button></div>:<div className="wind-dashboard" data-view={view}>
          <section id="wind-list-panel" className="wind-list-panel" aria-labelledby="directory-list-title"><div className="wind-panel-heading"><h2 id="directory-list-title">카메라 목록 <span>{filtered.length}</span></h2><small>확인되지 않은 영상도 장소는 보존</small></div><ol className="wind-list-scroll p-3">{filtered.map((entry,index)=>{
            const href=directoryViewerHref(entry);
            return <li key={entry.id} className="border-b border-current/15 py-4"><div className="flex items-start gap-3"><span className="text-xs tabular-nums opacity-50">{String(index+1).padStart(2,"0")}</span><div className="min-w-0 flex-1"><h3 className="text-base font-bold">{entry.name}</h3><p className="mt-1 text-xs opacity-70">{entry.region||"지역 미확정"} · {entry.category||"기타"}</p><p className="mt-2 text-xs">{directoryStatusLabel(entry.playbackStatus)}{!locationKnown(entry)&&" · 위치 미확정"}</p>{entry.playbackNote&&<p className="mt-1 text-xs leading-5 opacity-70">{entry.playbackNote}</p>}<div className="mt-3 flex flex-wrap gap-3">{href?<><button type="button" onClick={()=>choose(entry.id)} className="text-xs font-bold underline" aria-label={`${entry.name} 제공처 새 창으로 보기`}>제공처 새 창 ↗</button><a href={href} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="text-xs underline">팝업 대신 새 탭</a></>:<span className="text-xs opacity-60">공개 시청 주소 확인 필요</span>}<button type="button" className="text-xs underline" onClick={()=>setSelectedId(entry.id)}>장소 정보</button></div></div></div></li>;
          })}</ol>{filtered.length===0&&<p className="p-6 text-sm">조건에 맞는 장소가 없습니다. 검색·지역 조건을 확인해 주세요.</p>}</section>
          <div className="wind-map-column"><section id="wind-map-panel" className="wind-map-panel" aria-labelledby="directory-map-title"><div className="wind-panel-heading"><h2 id="directory-map-title">제주, 한눈에</h2><small>좌표 미확정 장소는 목록에서 확인</small></div><CctvMap cctvs={mapEntries} compact selectionOnly onCameraOpen={choose}/></section>
            <section className="wind-window-panel" aria-labelledby="directory-selected-title"><div className="wind-window-top"><span>장소와 재생 상태</span><small>DIRECT VIEW</small></div><div className="p-6"><h2 id="directory-selected-title" className="text-xl font-bold">{selected?.name||"장소를 선택하세요"}</h2>{selected?<><p className="mt-2 text-sm">{selected.description||"등록된 설명이 없습니다."}</p><p className="mt-3 text-xs">{directoryStatusLabel(selected.playbackStatus)} · {locationKnown(selected)?"위치 등록됨":"위치 미확정 — 임의 좌표를 표시하지 않습니다."}</p>{selected.verifiedAt&&<p className="mt-1 text-xs">관리자 관찰: {selected.verifiedAt} · 현재 재생을 보장하지 않습니다.</p>}{directoryViewerHref(selected)&&<a className="mt-4 inline-flex items-center gap-2 text-sm font-bold underline" href={directoryViewerHref(selected)!} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">제공처 새 탭으로 열기 <ArrowUpRight size={14}/></a>}</>:<p className="mt-3 text-sm">목록·지도는 같은 신규 관리 데이터를 읽습니다. 영상은 자동 재생하지 않습니다.</p>}</div></section>
          </div>
        </div>}
      </section><footer className="wind-footer"><p>© FUNJEJU · 원본 장소 기록 보존</p><p>목록 수정 반영에는 최대 30초가 걸릴 수 있습니다.</p></footer>
    </div>
  </div>;
}
