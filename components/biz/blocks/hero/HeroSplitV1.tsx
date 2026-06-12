"use client";

import Image from "next/image";
import type { BlockProps } from "../BlockProps";
import { getThemeTokens } from "@/lib/biz/tokens";
import { Phone, MapPin } from "lucide-react";

export function HeroSplitV1({ block, site }: BlockProps) {
  const theme = getThemeTokens(site.designTokens.themeId);
  const heroImage = (block.data.heroImage as string) || site.contentAssets.heroImage;
  const title = (block.data.title as string) || site.merchantInfo.name;
  const subtitle = (block.data.subtitle as string) || site.merchantInfo.description;

  return (
    <section className="w-full flex flex-col md:flex-row min-h-[70vh]">
      <div className="relative flex-1 min-h-[50vw] md:min-h-0">
        {heroImage ? (
          <Image src={heroImage} alt={title} fill className="object-cover" priority />
        ) : (
          <div className="absolute inset-0" style={{ backgroundColor: theme.primary }} />
        )}
      </div>

      <div
        className="flex-1 flex flex-col justify-center px-8 py-12"
        style={{ backgroundColor: theme.surface }}
      >
        <h1 className="text-3xl font-bold mb-3 leading-tight" style={{ color: theme.text }}>
          {title}
        </h1>
        {site.merchantInfo.category && (
          <p className="text-sm font-medium mb-4" style={{ color: theme.primary }}>
            {site.merchantInfo.category}
          </p>
        )}
        {subtitle && (
          <p className="text-base mb-8 leading-relaxed" style={{ color: theme.textMuted }}>
            {subtitle}
          </p>
        )}

        <div className="flex flex-col gap-3">
          {site.merchantInfo.phone && (
            <a
              href={`tel:${site.merchantInfo.phone}`}
              className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-semibold"
              style={{ backgroundColor: theme.primary }}
            >
              <Phone size={18} />
              {site.merchantInfo.phone}
            </a>
          )}
          {site.merchantInfo.address && (
            <a
              href={`https://map.naver.com/search/${encodeURIComponent(site.merchantInfo.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold border"
              style={{ color: theme.text, borderColor: theme.border }}
            >
              <MapPin size={18} />
              {site.merchantInfo.address}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
