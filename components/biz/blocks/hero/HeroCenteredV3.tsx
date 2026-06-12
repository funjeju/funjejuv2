"use client";

import Image from "next/image";
import type { BlockProps } from "../BlockProps";
import { getThemeTokens } from "@/lib/biz/tokens";
import { cn } from "@/lib/biz/utils";
import { Phone, MapPin, Calendar } from "lucide-react";

export function HeroCenteredV3({ block, site }: BlockProps) {
  const theme = getThemeTokens(site.designTokens.themeId);
  const heroImage = (block.data.heroImage as string) || site.contentAssets.heroImage;
  const title = (block.data.title as string) || site.merchantInfo.name;
  const subtitle = (block.data.subtitle as string) || site.merchantInfo.description;
  const ctaText = (block.data.ctaText as string) || "예약하기";
  const ctaLink = (block.data.ctaLink as string) || site.externalLinks.booking;

  return (
    <section className="relative w-full min-h-screen flex flex-col">
      <div className="relative flex-1 min-h-[60vh] overflow-hidden">
        {heroImage ? (
          <>
            <Image src={heroImage} alt={title} fill className="object-cover" priority />
            <div className="absolute inset-0 bg-black/30" />
          </>
        ) : (
          <div className={cn("absolute inset-0 bg-gradient-to-br", theme.gradient)} />
        )}
      </div>

      <div
        className="relative z-10 px-6 py-8 -mt-8 rounded-t-3xl"
        style={{ backgroundColor: theme.surface }}
      >
        {site.contentAssets.logoImage && (
          <div className="flex justify-center -mt-16 mb-4">
            <Image
              src={site.contentAssets.logoImage}
              alt={`${title} 로고`}
              width={72}
              height={72}
              className="rounded-2xl object-cover shadow-lg border-2 border-white"
            />
          </div>
        )}

        <h1 className="text-2xl font-bold text-center mb-1" style={{ color: theme.text }}>
          {title}
        </h1>
        {site.merchantInfo.category && (
          <p className="text-sm text-center mb-3" style={{ color: theme.textMuted }}>
            {site.merchantInfo.category}
          </p>
        )}
        {subtitle && (
          <p className="text-sm text-center mb-6 leading-relaxed" style={{ color: theme.textMuted }}>
            {subtitle}
          </p>
        )}

        <div className="grid grid-cols-3 gap-3">
          {site.merchantInfo.phone && (
            <a
              href={`tel:${site.merchantInfo.phone}`}
              className="flex flex-col items-center gap-1.5 py-3 rounded-2xl"
              style={{ backgroundColor: theme.surfaceAlt }}
            >
              <Phone size={20} style={{ color: theme.primary }} />
              <span className="text-xs font-medium" style={{ color: theme.text }}>전화</span>
            </a>
          )}
          {site.merchantInfo.address && (
            <a
              href={`https://map.naver.com/search/${encodeURIComponent(site.merchantInfo.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 py-3 rounded-2xl"
              style={{ backgroundColor: theme.surfaceAlt }}
            >
              <MapPin size={20} style={{ color: theme.primary }} />
              <span className="text-xs font-medium" style={{ color: theme.text }}>길찾기</span>
            </a>
          )}
          {ctaLink && (
            <a
              href={ctaLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 py-3 rounded-2xl"
              style={{ backgroundColor: theme.primary }}
            >
              <Calendar size={20} style={{ color: theme.primaryFg }} />
              <span className="text-xs font-medium" style={{ color: theme.primaryFg }}>{ctaText}</span>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
