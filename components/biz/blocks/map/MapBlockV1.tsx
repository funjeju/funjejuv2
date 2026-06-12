"use client";

import type { BlockProps } from "../BlockProps";
import { getThemeTokens } from "@/lib/biz/tokens";
import { SectionHeader } from "../SectionHeader";
import { KakaoMap } from "@/components/biz/KakaoMap";
import { MapPin, Clock, Navigation } from "lucide-react";

export function MapBlockV1({ block, site, isEditing, onEdit }: BlockProps) {
  const theme = getThemeTokens(site.designTokens.themeId);
  const title = (block.data.title as string) || "위치 안내";
  const { address, businessHours, name } = site.merchantInfo;
  const { lat, lng } = site.merchantInfo.coordinates || {};

  const hasLocation = !!(address || (lat && lng));

  // 길찾기: 카카오맵 우선 (주소/좌표 기반)
  const directionUrl = lat && lng
    ? `https://map.kakao.com/link/map/${encodeURIComponent(name)},${lat},${lng}`
    : `https://map.kakao.com/?q=${encodeURIComponent(address || name)}`;

  return (
    <section className="py-20 px-6" style={{ backgroundColor: theme.surface }}>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <SectionHeader eyebrow="Location" title={title}
            onTitleChange={(v) => onEdit?.(block.blockId, { title: v })} isEditing={isEditing} theme={theme} />
        </div>

        <div className="rounded-2xl overflow-hidden border mb-4" style={{ borderColor: theme.border }}>
          {hasLocation ? (
            <KakaoMap
              address={address}
              lat={lat}
              lng={lng}
              placeName={name}
              className="w-full h-56"
            />
          ) : (
            <div className="w-full h-56 flex flex-col items-center justify-center gap-2" style={{ backgroundColor: theme.surfaceAlt }}>
              <MapPin size={32} style={{ color: theme.primary }} />
              <p className="text-sm font-medium" style={{ color: theme.textMuted }}>주소를 입력하면 지도가 표시됩니다</p>
            </div>
          )}
        </div>

        <div className="space-y-3 mb-4">
          {address && (
            <div className="flex items-start gap-3">
              <MapPin size={18} className="flex-shrink-0 mt-0.5" style={{ color: theme.primary }} />
              <p className="text-sm" style={{ color: theme.text }}>{address}</p>
            </div>
          )}
          {businessHours && (
            <div className="flex items-start gap-3">
              <Clock size={18} className="flex-shrink-0 mt-0.5" style={{ color: theme.primary }} />
              <p className="text-sm" style={{ color: theme.text }}>{businessHours}</p>
            </div>
          )}
        </div>

        {hasLocation && (
          <a
            href={directionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-semibold border"
            style={{ color: theme.text, borderColor: theme.border }}
          >
            <Navigation size={18} style={{ color: theme.primary }} />
            카카오맵으로 길찾기
          </a>
        )}
      </div>
    </section>
  );
}
