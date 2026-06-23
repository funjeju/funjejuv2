"use client";

import Link from "next/link";
import Image from "next/image";
import { CctvFavoriteButton } from "@/components/common/CctvFavoriteButton";
import { ShareButton } from "@/components/common/ShareButton";
import { DIRECTION_META } from "@/constants/cctv-directions";
import { useT } from "@/lib/i18n";
import type { CctvDirection, CctvEntry } from "@/types/cctv";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://funjeju.com";

const PROXY_BASE = process.env.NEXT_PUBLIC_WORKER_URL || process.env.NEXT_PUBLIC_PROXY_URL || "";

const DIR_KEY: Record<CctvDirection, string> = { 북: "cctv.dir.north", 동: "cctv.dir.east", 남: "cctv.dir.south", 서: "cctv.dir.west" };

export function CctvCard({ cctv }: { cctv: CctvEntry }) {
  const t = useT();
  const streamUrl = !cctv.youtubeId && PROXY_BASE ? `${PROXY_BASE}/cctv/${cctv.id}` : null;

  return (
    <article className="group overflow-hidden rounded-2xl border border-border-soft bg-bg-card shadow-card transition-shadow hover:shadow-soft">
      <Link href={`/cctv/${cctv.id}`} className="block">
        {cctv.youtubeId ? (
          /* YouTube 썸네일 */
          <div className="relative aspect-video overflow-hidden bg-gray-900">
            <Image
              src={`https://img.youtube.com/vi/${cctv.youtubeId}/mqdefault.jpg`}
              alt={cctv.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              unoptimized
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600/90 shadow-lg">
                <svg className="ml-1 h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
            <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5">
              <span className="text-[9px] font-bold text-white">▶ YouTube</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
              <p className="text-sm font-bold text-white">{cctv.name}</p>
              <p className="text-[10px] text-white/70">{cctv.region}</p>
            </div>
          </div>
        ) : (
          /* HLS — 썸네일 플레이스홀더 (목록에서는 경량 표시, 클릭 시 재생) */
          <div className="relative aspect-video overflow-hidden bg-gray-800">
            <div className="flex h-full w-full items-center justify-center">
              <div className="flex flex-col items-center gap-1 text-white/50">
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
                  <path strokeWidth="1.5" d="M10 8l6 4-6 4V8z" />
                </svg>
                <span className="text-[10px]">{cctv.name}</span>
              </div>
            </div>
            <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-live-red px-2 py-0.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              <span className="text-[9px] font-bold text-white">LIVE</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
              <p className="text-sm font-bold text-white">{cctv.name}</p>
              <p className="text-[10px] text-white/70">{cctv.region}</p>
            </div>
          </div>
        )}
      </Link>

      <div className="flex items-center gap-2 px-3 py-2">
        <span className="rounded-full bg-bg-secondary px-2 py-0.5 text-[10px] font-medium text-text-secondary">
          {DIRECTION_META[cctv.direction].emoji} {t(DIR_KEY[cctv.direction])}
        </span>
        <span className="rounded-full bg-bg-secondary px-2 py-0.5 text-[10px] font-medium text-text-secondary">
          {cctv.category}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <ShareButton
            title={`${cctv.name} — 제주 실시간 CCTV | FunJeju`}
            url={`${BASE_URL}/cctv/${cctv.id}`}
            description={cctv.description}
            compact
          />
          <CctvFavoriteButton id={cctv.id} label={false} />
        </div>
      </div>

      {cctv.description && (
        <p className="truncate px-3 pb-3 text-[11px] text-text-secondary">{cctv.description}</p>
      )}
    </article>
  );
}
