"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Camera, MapPin, Play, ExternalLink } from "lucide-react";
import { CctvFavoriteButton } from "@/components/common/CctvFavoriteButton";
import { ShareButton } from "@/components/common/ShareButton";
import { isVurixId } from "@/constants/vurix";
import type { CctvEntry } from "@/types/cctv";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://funjeju.com";

export function CctvCard({ cctv }: { cctv: CctvEntry }) {
  const popup = isVurixId(cctv.id) && !cctv.youtubeId;
  return (
    <article className="group overflow-hidden rounded-2xl border border-[#dedfd5] bg-white transition-shadow hover:shadow-[0_10px_35px_rgba(30,65,45,.08)]">
      <Link href={`/cctv/${cctv.id}`} className="block focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#ef623e]" aria-label={`${cctv.name} 영상과 상태 확인`}>
        <div className="relative aspect-video overflow-hidden bg-[#e2e9e1]">
          {cctv.youtubeId ? <><Image src={`https://img.youtube.com/vi/${cctv.youtubeId}/mqdefault.jpg`} alt={`${cctv.name} YouTube 미리보기 (현재 영상 아님)`} fill sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-105" unoptimized /><div className="absolute inset-0 bg-black/15" /></> : <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[radial-gradient(ellipse_at_50%_90%,#c5d5c4_0%,#e7eddf_72%)] text-[#718b74]"><Camera size={38} strokeWidth={1} /><span className="text-[10px] font-medium tracking-wider">CCTV · 영상을 열어 확인하세요</span></div>}
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[9px] font-bold tracking-wide text-[#4d6d57] backdrop-blur">{!cctv.active ? "공개 대기" : cctv.youtubeId ? "YOUTUBE" : popup ? "새 창에서 보기" : "CCTV"}</span>
          <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-[#385b45] shadow-sm transition-transform group-hover:scale-110">{popup ? <ExternalLink size={15} /> : <Play size={16} fill="currentColor" strokeWidth={1} />}</span>
        </div>
        <div className="px-4 pt-4">
          <p className="flex items-center gap-1 text-[10px] text-[#829181]"><MapPin size={10} />{cctv.region} <span className="px-1">·</span>{cctv.category}</p>
          <div className="mt-1.5 flex items-center justify-between gap-2"><h3 className="text-base font-extrabold tracking-[-0.4px] text-[#2d513d]">{cctv.name}</h3><ArrowUpRight size={15} className="shrink-0 text-[#80917f]" /></div>
          <p className="mt-2 line-clamp-1 min-h-5 text-[11px] leading-5 text-[#8b958a]">{cctv.description || "지금 이곳의 풍경이 궁금하다면"}</p>
        </div>
      </Link>
      <div className="mx-4 mt-3 flex items-center gap-2 border-t border-[#edf0e8] py-3">
        <span className="text-[10px] text-[#8d978c]">{cctv.active ? "재생 시 상태 확인" : "관리자 확인 중"}</span>
        <div className="ml-auto flex items-center gap-1"><ShareButton title={`${cctv.name} — 제주 CCTV | FunJeju`} url={`${BASE_URL}/cctv/${cctv.id}`} description={cctv.description} compact /><CctvFavoriteButton id={cctv.id} label={false} /></div>
      </div>
    </article>
  );
}
