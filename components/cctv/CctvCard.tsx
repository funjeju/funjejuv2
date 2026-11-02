"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Play, ExternalLink } from "lucide-react";
import { CctvFavoriteButton } from "@/components/common/CctvFavoriteButton";
import { ShareButton } from "@/components/common/ShareButton";
import { cameraWatchUrl, requiresExternalPlayback, requiresPlaybackDetail } from "@/lib/cctv-playback-target";
import type { CctvEntry } from "@/types/cctv";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://funjeju.com";

function scenery(category: string, index: number) {
  if (/산|오름|숲/.test(category)) return "/cctv-editorial/hallasan-mountain.jpg";
  if (/해변|바다|항|해안/.test(category)) return index % 2 ? "/cctv-editorial/seongsan-panorama.jpg" : "/cctv-editorial/seongsan-coast.jpg";
  return null;
}

export function CctvCard({ cctv, index = 0, onOpen, variant = "editorial" }: { cctv: CctvEntry; index?: number; onOpen: () => void; variant?: "editorial" | "compact" }) {
  const needsDetail = requiresPlaybackDetail(cctv);
  const popup = requiresExternalPlayback(cctv);
  const photo = scenery(cctv.category, index);
  const credit = photo?.includes("hallasan")
    ? { author: "Letmeuseflowers", source: "https://commons.wikimedia.org/wiki/File:Hallasan_Mountain.jpg", license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/" }
    : photo?.includes("panorama")
      ? { author: "Bernard Gagnon", source: "https://commons.wikimedia.org/wiki/File:Seongsan,_Jeju_Island.jpg", license: "CC0", licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/" }
      : { author: "A. D. Prakasa", source: "https://commons.wikimedia.org/wiki/File:Seongsan_Ilchulbong_cliff_facing_the_sea.jpg", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/" };
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const hasPhoto = photo !== null && failedPhoto !== photo;
  if (variant === "compact") return (
    <article className="wind-camera-card min-w-0 overflow-hidden rounded-xl border border-[#e1e9e4] bg-white text-[#214e3e]">
      <button type="button" onClick={onOpen} disabled={!cctv.active}
        aria-label={`${cctv.name} ${popup ? "새 창에서 영상 보기" : needsDetail ? "상세 페이지에서 영상과 상태 확인" : "영상과 상태 확인"}`}
        className="wind-camera-open group flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-[#eaf4ed] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#285943] disabled:cursor-not-allowed disabled:opacity-60">
        <span className="wind-camera-thumb relative block h-[84px] w-[84px] shrink-0 overflow-hidden rounded-lg bg-[#e6eeea]">
          {hasPhoto ? <Image src={photo} alt="" fill sizes="84px" className="object-cover transition-transform duration-500 group-hover:scale-105" onError={() => setFailedPhoto(photo)} />
            : <span aria-hidden="true" className="absolute inset-0 overflow-hidden"><span className="absolute -right-5 -top-3 h-20 w-20 rounded-full border-[14px] border-[#4d7e65]/20" /><span className="absolute bottom-2 left-2 text-xl font-black text-[#37644e]/60">{cctv.direction || "JEJU"}</span></span>}
        </span>
        <span className="wind-camera-copy block min-w-0 flex-1">
          <span className="wind-camera-eyebrow mb-1 flex items-center gap-1.5 text-[9px] font-medium tracking-wide text-[#7a9186]"><span className="font-mono tabular-nums">{String(index + 1).padStart(2, "0")}</span><span aria-hidden="true">/</span><span>{cctv.category || "CCTV"}</span></span>
          <span className="wind-camera-name block truncate text-[16px] font-bold leading-5 tracking-[-.025em]">{cctv.name}</span>
          <span className="wind-camera-location mt-1 block truncate text-[12px] leading-4 text-[#648272]">{[cctv.region, cctv.direction ? `${cctv.direction}쪽` : ""].filter(Boolean).join(" · ")}</span>
          <span className="wind-camera-note mt-1.5 block text-[10px] leading-4 text-[#7b8e83]">{hasPhoto ? "풍경 사진 · 실시간 화면 아님" : "지역 그래픽 · 실시간 화면 아님"}</span>
        </span>
        <span className="wind-camera-arrow flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f0f5f2] text-[#537763]">{popup ? <ExternalLink size={15} strokeWidth={1.5} /> : <ArrowUpRight size={17} strokeWidth={1.5} />}</span>
      </button>
      <div className="wind-camera-footer grid grid-cols-[1fr_auto] items-start gap-x-2 border-t border-[#edf1ee] px-3 py-1">
      <div className="wind-camera-tools flex min-w-0 items-center gap-2">
        <Link href={`/cctv/${encodeURIComponent(cctv.id)}`} className="py-1 text-[9px] font-medium text-[#537763] underline decoration-[#acc4b5] underline-offset-2">상세 정보</Link>
        <div className="wind-camera-actions flex items-center gap-0.5"><ShareButton title={`${cctv.name} — 제주 CCTV | FunJeju`} url={`${BASE_URL}/cctv/${encodeURIComponent(cctv.id)}`} description={cctv.description} compact /><CctvFavoriteButton id={cctv.id} label={false} /></div>
      </div>
      <details className="wind-camera-credit text-[10px] leading-4 text-[#648272]">
        <summary className="cursor-pointer whitespace-nowrap py-1 focus-visible:outline-2 focus-visible:outline-[#285943]">{hasPhoto ? "안내·사진 출처" : "이용 안내"}</summary>
        <div className="wind-camera-credit-content pb-2 pt-1">
          <p>{!cctv.active ? "공개 대기 중입니다. " : popup ? "영상은 별도 창에서 열립니다. " : ""}{hasPhoto ? "풍경 이미지 · 실시간 화면 아님. " : "지역 그래픽 · 실시간 화면 아님. "}영상 연결 상태는 플레이어에서 확인해 주세요.</p>
          {popup && cctv.active && <a href={cameraWatchUrl(cctv)} target="_blank" rel="noopener noreferrer" className="mt-1 block font-bold underline underline-offset-2">팝업이 열리지 않으면 새 탭으로 보기</a>}
          {hasPhoto && <p className="mt-1"><a href={credit.source} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{credit.author}</a> · <a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{credit.license}</a> · 화면 비율로 자름</p>}
        </div>
      </details>
      </div>
    </article>
  );
  return (
    <article className="editorial-camera-card group min-w-0 text-[#172524]">
      <button type="button" onClick={onOpen} disabled={!cctv.active} className="block w-full text-left focus-visible:rounded-[18px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#224de8] disabled:cursor-not-allowed" aria-label={`${cctv.name} ${popup ? "새 창에서 영상 보기" : needsDetail ? "상세 페이지에서 영상과 상태 확인" : "영상과 상태 확인"}`}>
        <div className={`relative aspect-[4/3] overflow-hidden rounded-[18px] ${index % 3 === 0 ? "bg-[#b9c7ee]" : index % 3 === 1 ? "bg-[#d9ff60]" : "bg-[#d7e3dc]"}`}>
          {hasPhoto ? <><Image src={photo} alt="" fill sizes="(max-width:640px) 100vw, (max-width:1280px) 50vw, 33vw" className={`object-cover transition-transform duration-700 group-hover:scale-[1.04] ${index % 2 ? "object-left" : "object-center"}`} onError={() => setFailedPhoto(photo)} /><div className="absolute inset-0 bg-gradient-to-t from-[#071413]/80 via-black/0 to-[#071413]/20" /></> : <div aria-hidden="true" className="absolute inset-0 overflow-hidden"><div className="absolute -right-8 top-8 h-48 w-48 rounded-full border-[35px] border-[#172524]/15" /><div className="absolute -left-10 bottom-[-30%] h-[70%] w-[140%] rotate-[-18deg] border-t-2 border-[#172524]/35 bg-[#172524]/10" /><span className="absolute bottom-14 left-5 text-[70px] font-black leading-none tracking-[-.08em] text-[#172524]/70">{cctv.direction || "JEJU"}<span className="text-[22px]"> / </span></span></div>}
          <span className="absolute left-4 top-4 rounded-md bg-[#f6f7f2] px-2.5 py-1.5 text-[10px] font-extrabold tracking-[.1em] text-[#172524]">{!cctv.active ? "공개 대기" : cctv.youtubeId ? "YOUTUBE" : popup ? "새 창에서 보기" : needsDetail ? "상세에서 확인" : "CCTV"}</span>
          <span className="absolute right-4 top-4 font-mono text-[11px] font-bold text-white mix-blend-difference">{String(index + 1).padStart(2, "0")}</span>
          <span className={`absolute bottom-4 left-4 max-w-[calc(100%_-_5rem)] text-[10px] font-medium ${hasPhoto ? "text-white/90" : "text-[#172524]/75"}`}>{hasPhoto ? "풍경 이미지 · 실시간 화면 아님" : "지역 그래픽 · 실시간 화면 아님"}</span>
          <span className="absolute bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#d9ff60] text-[#172524] transition-transform duration-300 group-hover:rotate-[-12deg]">{popup ? <ExternalLink size={20} /> : needsDetail ? <ArrowUpRight size={20} /> : <Play size={20} fill="currentColor" strokeWidth={1} />}</span>
        </div>
        <div className="pt-4"><p className="text-[10px] font-bold tracking-[.06em] text-[#59675e]">{cctv.region} <span className="px-1.5 text-[#8b968c]">/</span> {cctv.category}</p><div className="mt-2 flex items-start justify-between gap-3"><h3 className="text-[23px] font-black leading-tight tracking-[-.055em]">{cctv.name}</h3><ArrowUpRight size={23} strokeWidth={1.5} className="mt-0.5 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></div><p className="mt-2 line-clamp-1 min-h-5 text-xs leading-5 text-[#59675e]">{cctv.description || "영상으로 확인하는 제주의 지금."}</p></div>
      </button>
      {needsDetail && cctv.active && <p className="mt-3 text-[11px] leading-5 text-[#52605a]">최신 영상 연결 정보는 상세 페이지에서 확인해 주세요.</p>}
      {popup && cctv.active && <p className="mt-3 text-[11px] leading-5 text-[#52605a]">영상은 별도 창에서 열려요. 재생 여부는 새 창에서 확인해 주세요. <a href={cameraWatchUrl(cctv)} target="_blank" rel="noopener noreferrer" className="font-bold underline underline-offset-4">팝업이 열리지 않으면 새 탭으로 보기</a></p>}
      {hasPhoto && <p className="mt-2 text-[9px] leading-4 text-[#657168]">풍경 사진 <a href={credit.source} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{credit.author}</a> · <a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{credit.license}</a> · 화면 비율로 자름</p>}
      <div className="mt-3 flex items-center gap-2 border-t border-[#172524]/20 pt-2.5">
        <Link href={`/cctv/${encodeURIComponent(cctv.id)}`} className="py-2 text-[11px] font-bold underline decoration-[#172524]/30 underline-offset-4 hover:decoration-[#172524]">상세 정보</Link>
        <span className="hidden text-[10px] text-[#59675e] min-[400px]:inline">· {cctv.active ? "재생 시 상태 확인" : "공개 대기"}</span>
        <div className="ml-auto flex shrink-0 items-center gap-1"><ShareButton title={`${cctv.name} — 제주 CCTV | FunJeju`} url={`${BASE_URL}/cctv/${cctv.id}`} description={cctv.description} compact /><CctvFavoriteButton id={cctv.id} label={false} /></div>
      </div>
    </article>
  );
}
