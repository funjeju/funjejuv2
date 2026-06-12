"use client";

import type { BlockProps } from "../BlockProps";
import { getThemeTokens } from "@/lib/biz/tokens";
import { Phone, MessageCircle, Calendar } from "lucide-react";

export function CTABannerV2({ block, site }: BlockProps) {
  const theme = getThemeTokens(site.designTokens.themeId);
  const title = (block.data.title as string) || "예약 · 문의";
  const subtitle = (block.data.subtitle as string) || "";

  return (
    <section className="py-16 px-6" style={{ backgroundColor: theme.surface }}>
      <div className="max-w-lg mx-auto">
        <div
          className="rounded-3xl p-8 text-center border"
          style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }}
        >
          <h2 className="text-2xl font-bold mb-2" style={{ color: theme.text }}>{title}</h2>
          {subtitle && <p className="mb-6" style={{ color: theme.textMuted }}>{subtitle}</p>}

          <div className="flex flex-col gap-3">
            {site.merchantInfo.phone && (
              <a
                href={`tel:${site.merchantInfo.phone}`}
                className="flex items-center justify-center gap-3 py-4 rounded-2xl text-white font-semibold"
                style={{ backgroundColor: theme.primary }}
              >
                <Phone size={20} />
                전화 연결
              </a>
            )}
            {site.externalLinks.kakaoTalk && (
              <a
                href={site.externalLinks.kakaoTalk}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 py-4 rounded-2xl bg-[#FEE500] text-[#3B1E08] font-semibold"
              >
                <MessageCircle size={20} />
                카카오톡 문의
              </a>
            )}
            {site.externalLinks.booking && (
              <a
                href={site.externalLinks.booking}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 py-4 rounded-2xl font-semibold border"
                style={{ color: theme.text, borderColor: theme.border }}
              >
                <Calendar size={20} />
                예약하기
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
