"use client";

import Image from "next/image";
import type { BlockProps } from "../BlockProps";
import { getThemeTokens } from "@/lib/biz/tokens";
import { cn } from "@/lib/biz/utils";
import { Phone, MapPin, ArrowUpRight } from "lucide-react";
import { InlineEdit } from "@/components/biz/InlineEdit";

export function HeroCenteredV2({ block, site, isEditing, onEdit }: BlockProps) {
  const theme = getThemeTokens(site.designTokens.themeId);
  const heroImage = (block.data.heroImage as string) || site.contentAssets.heroImage;
  const title = (block.data.title as string) || site.merchantInfo.name;
  const subtitle = (block.data.subtitle as string) || site.merchantInfo.description;
  const region = site.merchantInfo.address?.split(" ").slice(0, 2).join(" ");

  // 이미지가 있으면 풀블리드로 크게, 없으면 휑하지 않게 적당한 높이 + 콘텐츠 중앙 정렬
  const heightClass = heroImage ? "min-h-[560px] md:min-h-[640px]" : "min-h-[420px] md:min-h-[480px]";
  const contentAlign = heroImage ? "justify-end" : "justify-center";

  return (
    <section className={cn("relative w-full flex flex-col overflow-hidden", heightClass)} style={{ backgroundColor: theme.ink }}>
      {heroImage ? (
        <>
          <Image src={heroImage} alt={title} fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/85" />
        </>
      ) : (
        <>
          <div className={cn("absolute inset-0 bg-gradient-to-br opacity-90", theme.gradient)} />
          <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />
        </>
      )}

      {/* 상단 라벨 바 */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-7">
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80">
          {site.merchantInfo.category || "Local Store"}
        </span>
        {region && (
          <span className="text-[11px] font-medium tracking-wide text-white/60">{region}</span>
        )}
      </div>

      {/* 메인 타이포 */}
      <div className={cn("relative z-10 flex-1 flex flex-col px-6 py-10 max-w-lg mx-auto w-full", contentAlign)}>
        {site.contentAssets.logoImage && (
          <Image src={site.contentAssets.logoImage} alt="" width={56} height={56} className="rounded-2xl object-cover mb-6 ring-1 ring-white/20" />
        )}
        <InlineEdit
          value={title}
          onChange={(v) => onEdit?.(block.blockId, { title: v })}
          isEditing={isEditing}
          tag="h1"
          className="text-[44px] leading-[1.05] md:text-6xl font-bold tracking-tight text-white mb-4"
          placeholder="가게 이름"
          multiline
        />
        <InlineEdit
          value={subtitle}
          onChange={(v) => onEdit?.(block.blockId, { subtitle: v })}
          isEditing={isEditing}
          tag="p"
          className="text-base md:text-lg text-white/75 leading-relaxed mb-8 max-w-md"
          placeholder="한 줄 소개"
          multiline
        />

        <div className="flex items-center gap-3">
          {site.merchantInfo.phone && (
            <a href={`tel:${site.merchantInfo.phone}`}
              className="group flex items-center gap-2 pl-5 pr-4 py-3.5 rounded-full bg-white font-semibold text-sm transition-transform hover:scale-[1.02]"
              style={{ color: theme.ink }}>
              <Phone size={16} />전화하기
              <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          )}
          {site.merchantInfo.address && (
            <a href={`https://map.naver.com/search/${encodeURIComponent(site.merchantInfo.address)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-3.5 rounded-full border border-white/25 text-white font-semibold text-sm backdrop-blur-sm hover:bg-white/10 transition-colors">
              <MapPin size={16} />길찾기
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
