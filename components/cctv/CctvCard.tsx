"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Play, ExternalLink } from "lucide-react";
import { CctvFavoriteButton } from "@/components/common/CctvFavoriteButton";
import { ShareButton } from "@/components/common/ShareButton";
import { isVurixId } from "@/constants/vurix";
import type { CctvEntry } from "@/types/cctv";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://funjeju.com";

function scenery(category: string, index: number) {
  if (/산|오름|숲/.test(category)) return "/cctv-editorial/hallasan-mountain.jpg";
  if (/해변|바다|항|해안/.test(category)) return index % 2 ? "/cctv-editorial/seongsan-panorama.jpg" : "/cctv-editorial/seongsan-coast.jpg";
  return null;
}

export function CctvCard({ cctv, index = 0, onOpen }: { cctv: CctvEntry; index?: number; onOpen: () => void }) {
  const popup = isVurixId(cctv.id) && !cctv.youtubeId;
  const photo = scenery(cctv.category, index);
  const credit = photo?.includes("hallasan")
    ? { author: "Letmeuseflowers", source: "https://commons.wikimedia.org/wiki/File:Hallasan_Mountain.jpg", license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/" }
    : photo?.includes("panorama")
      ? { author: "Bernard Gagnon", source: "https://commons.wikimedia.org/wiki/File:Seongsan,_Jeju_Island.jpg", license: "CC0", licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/" }
      : { author: "A. D. Prakasa", source: "https://commons.wikimedia.org/wiki/File:Seongsan_Ilchulbong_cliff_facing_the_sea.jpg", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/" };
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const hasPhoto = photo !== null && failedPhoto !== photo;
  return (
    <article className="editorial-camera-card group min-w-0 text-[#172524]">
      <button type="button" onClick={onOpen} disabled={!cctv.active} className="block w-full text-left focus-visible:rounded-[18px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#224de8] disabled:cursor-not-allowed" aria-label={`${cctv.name} 영상과 상태 확인`}>
        <div className={`relative aspect-[4/3] overflow-hidden rounded-[18px] ${index % 3 === 0 ? "bg-[#b9c7ee]" : index % 3 === 1 ? "bg-[#d9ff60]" : "bg-[#d7e3dc]"}`}>
          {hasPhoto ? <><Image src={photo} alt="" fill sizes="(max-width:640px) 100vw, (max-width:1280px) 50vw, 33vw" className={`object-cover transition-transform duration-700 group-hover:scale-[1.04] ${index % 2 ? "object-left" : "object-center"}`} onError={() => setFailedPhoto(photo)} /><div className="absolute inset-0 bg-gradient-to-t from-[#071413]/80 via-black/0 to-[#071413]/20" /></> : <div aria-hidden="true" className="absolute inset-0 overflow-hidden"><div className="absolute -right-8 top-8 h-48 w-48 rounded-full border-[35px] border-[#172524]/15" /><div className="absolute -left-10 bottom-[-30%] h-[70%] w-[140%] rotate-[-18deg] border-t-2 border-[#172524]/35 bg-[#172524]/10" /><span className="absolute bottom-14 left-5 text-[70px] font-black leading-none tracking-[-.08em] text-[#172524]/70">{cctv.direction || "JEJU"}<span className="text-[22px]"> / </span></span></div>}
          <span className="absolute left-4 top-4 rounded-md bg-[#f6f7f2] px-2.5 py-1.5 text-[10px] font-extrabold tracking-[.1em] text-[#172524]">{!cctv.active ? "공개 대기" : cctv.youtubeId ? "YOUTUBE" : popup ? "외부 플레이어" : "CCTV"}</span>
          <span className="absolute right-4 top-4 font-mono text-[11px] font-bold text-white mix-blend-difference">{String(index + 1).padStart(2, "0")}</span>
          <span className={`absolute bottom-4 left-4 max-w-[calc(100%_-_5rem)] text-[10px] font-medium ${hasPhoto ? "text-white/90" : "text-[#172524]/75"}`}>{hasPhoto ? "풍경 이미지 · 실시간 화면 아님" : "지역 그래픽 · 실시간 화면 아님"}</span>
          <span className="absolute bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#d9ff60] text-[#172524] transition-transform duration-300 group-hover:rotate-[-12deg]">{popup ? <ExternalLink size={20} /> : <Play size={20} fill="currentColor" strokeWidth={1} />}</span>
        </div>
        <div className="pt-4"><p className="text-[10px] font-bold tracking-[.06em] text-[#59675e]">{cctv.region} <span className="px-1.5 text-[#8b968c]">/</span> {cctv.category}</p><div className="mt-2 flex items-start justify-between gap-3"><h3 className="text-[23px] font-black leading-tight tracking-[-.055em]">{cctv.name}</h3><ArrowUpRight size={23} strokeWidth={1.5} className="mt-0.5 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></div><p className="mt-2 line-clamp-1 min-h-5 text-xs leading-5 text-[#59675e]">{cctv.description || "영상으로 확인하는 제주의 지금."}</p></div>
      </button>
      {hasPhoto && <p className="mt-2 text-[9px] leading-4 text-[#657168]">풍경 사진 <a href={credit.source} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{credit.author}</a> · <a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{credit.license}</a> · 화면 비율로 자름</p>}
      <div className="mt-3 flex items-center gap-2 border-t border-[#172524]/20 pt-2.5">
        <Link href={`/cctv/${cctv.id}`} className="py-2 text-[11px] font-bold underline decoration-[#172524]/30 underline-offset-4 hover:decoration-[#172524]">상세 정보</Link>
        <span className="hidden text-[10px] text-[#59675e] min-[400px]:inline">· {cctv.active ? "재생 시 상태 확인" : "공개 대기"}</span>
        <div className="ml-auto flex shrink-0 items-center gap-1"><ShareButton title={`${cctv.name} — 제주 CCTV | FunJeju`} url={`${BASE_URL}/cctv/${cctv.id}`} description={cctv.description} compact /><CctvFavoriteButton id={cctv.id} label={false} /></div>
      </div>
    </article>
  );
}
