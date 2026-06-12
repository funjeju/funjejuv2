"use client";

import type { BlockProps } from "../BlockProps";
import { getThemeTokens } from "@/lib/biz/tokens";
import { SectionHeader } from "../SectionHeader";
import { Phone, MapPin, Clock, AtSign, ExternalLink } from "lucide-react";

export function ContactBlockV1({ block, site, isEditing, onEdit }: BlockProps) {
  const theme = getThemeTokens(site.designTokens.themeId);
  const title = (block.data.title as string) || "연락처";
  const { phone, address, businessHours } = site.merchantInfo;
  const { naverPlace, instagram } = site.externalLinks;

  return (
    <section className="py-20 px-6" style={{ backgroundColor: theme.surfaceAlt }}>
      <div className="max-w-lg mx-auto">
        <div className="mb-8">
          <SectionHeader eyebrow="Contact" title={title}
            onTitleChange={(v) => onEdit?.(block.blockId, { title: v })} isEditing={isEditing} theme={theme} />
        </div>
        <div className="space-y-4">
          {phone && (
            <a href={`tel:${phone}`} className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: theme.primary }}>
                <Phone size={18} color={theme.primaryFg} />
              </div>
              <div>
                <p className="text-xs" style={{ color: theme.textMuted }}>전화</p>
                <p className="font-semibold" style={{ color: theme.text }}>{phone}</p>
              </div>
            </a>
          )}
          {address && (
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: theme.surfaceAlt, border: `1px solid ${theme.border}` }}>
                <MapPin size={18} style={{ color: theme.primary }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: theme.textMuted }}>주소</p>
                <p className="font-medium" style={{ color: theme.text }}>{address}</p>
              </div>
            </div>
          )}
          {businessHours && (
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: theme.surfaceAlt, border: `1px solid ${theme.border}` }}>
                <Clock size={18} style={{ color: theme.primary }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: theme.textMuted }}>영업시간</p>
                <p className="font-medium" style={{ color: theme.text }}>{businessHours}</p>
              </div>
            </div>
          )}
          {instagram && (
            <a href={instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#E1306C" }}>
                <AtSign size={18} color="#fff" />
              </div>
              <div>
                <p className="text-xs" style={{ color: theme.textMuted }}>인스타그램</p>
                <p className="font-medium" style={{ color: theme.text }}>팔로우하기</p>
              </div>
            </a>
          )}
          {naverPlace && (
            <a href={naverPlace} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#03C75A" }}>
                <ExternalLink size={18} color="#fff" />
              </div>
              <div>
                <p className="text-xs" style={{ color: theme.textMuted }}>네이버 플레이스</p>
                <p className="font-medium" style={{ color: theme.text }}>플레이스 보기</p>
              </div>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
