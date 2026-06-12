"use client";

import type { BlockProps } from "../BlockProps";
import { getThemeTokens } from "@/lib/biz/tokens";
import { Phone, MessageCircle, Calendar, ArrowUpRight } from "lucide-react";
import { InlineEdit } from "@/components/biz/InlineEdit";

export function CTABannerV1({ block, site, isEditing, onEdit }: BlockProps) {
  const theme = getThemeTokens(site.designTokens.themeId);
  const title = (block.data.title as string) || "방문을 기다립니다";
  const subtitle = (block.data.subtitle as string) || "궁금한 점은 언제든 연락주세요";

  return (
    <section className="relative overflow-hidden px-6 py-24" style={{ backgroundColor: theme.ink }}>
      <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "22px 22px" }} />
      <div className="relative max-w-lg mx-auto text-center">
        <div className="flex items-center justify-center gap-2 mb-5">
          <span className="h-px w-6" style={{ backgroundColor: theme.primary }} />
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: theme.primaryFg, opacity: 0.7 }}>
            Contact
          </span>
        </div>
        <InlineEdit
          value={title}
          onChange={(v) => onEdit?.(block.blockId, { title: v })}
          isEditing={isEditing}
          tag="h2"
          className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-3"
          placeholder="제목"
        />
        <InlineEdit
          value={subtitle}
          onChange={(v) => onEdit?.(block.blockId, { subtitle: v })}
          isEditing={isEditing}
          tag="p"
          className="text-white/65 mb-9"
          placeholder="부제목"
          multiline
        />

        <div className="flex flex-col gap-3 max-w-xs mx-auto">
          {site.merchantInfo.phone && (
            <a href={`tel:${site.merchantInfo.phone}`}
              className="group flex items-center justify-center gap-2 py-4 rounded-full bg-white font-semibold"
              style={{ color: theme.ink }}>
              <Phone size={18} />{site.merchantInfo.phone}
              <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          )}
          {site.externalLinks.kakaoTalk && (
            <a href={site.externalLinks.kakaoTalk} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-4 rounded-full bg-[#FEE500] text-[#3B1E08] font-semibold">
              <MessageCircle size={18} />카카오톡 문의
            </a>
          )}
          {site.externalLinks.booking && (
            <a href={site.externalLinks.booking} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-4 rounded-full border border-white/25 text-white font-semibold hover:bg-white/10 transition-colors">
              <Calendar size={18} />예약하기
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
