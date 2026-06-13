"use client";

import type { SiteSchema, CtaButton } from "@/lib/biz/types";
import { BlockRenderer } from "./blocks/BlockRenderer";
import { Phone, MessageCircle, MapPin, Navigation, ExternalLink } from "lucide-react";

const CTA_STYLE: Record<CtaButton["type"], { cls: string; icon: typeof Phone }> = {
  call: { cls: "bg-gray-900 text-white", icon: Phone },
  naver: { cls: "bg-[#03C75A] text-white", icon: MapPin },
  directions: { cls: "bg-[#3B82F6] text-white", icon: Navigation },
  kakao: { cls: "bg-[#FEE500] text-[#3B1E08]", icon: MessageCircle },
  link: { cls: "bg-gray-700 text-white", icon: ExternalLink },
};

/**
 * 비즈 홈페이지 퍼블릭 렌더 — layout 블록들을 순서대로 그리고,
 * 하단에 최대 3개의 고정 CTA 버튼(전화·네이버·길찾기 등).
 */
export function PublicSite({ site }: { site: SiteSchema }) {
  const { phone } = site.merchantInfo;

  // ctaButtons 우선, 없으면 기존 전화/카카오톡으로 폴백
  let ctas: CtaButton[] = site.ctaButtons?.slice(0, 3) ?? [];
  if (ctas.length === 0) {
    if (phone) ctas.push({ type: "call", label: "전화하기", value: phone });
    if (site.externalLinks.kakaoTalk) ctas.push({ type: "kakao", label: "카카오톡", value: site.externalLinks.kakaoTalk });
  }

  return (
    <div className="min-h-screen bg-white">
      {site.layout.map((block) => (
        <BlockRenderer key={block.blockId} block={block} site={site} />
      ))}

      {ctas.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex gap-2 border-t border-gray-200 bg-white px-4 py-3">
          {ctas.map((cta, i) => {
            const { cls, icon: Icon } = CTA_STYLE[cta.type] ?? CTA_STYLE.link;
            const href = cta.type === "call" ? `tel:${cta.value}` : cta.value;
            const external = cta.type !== "call";
            return (
              <a
                key={i}
                href={href}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-semibold ${cls}`}
              >
                <Icon size={16} /> {cta.label}
              </a>
            );
          })}
        </div>
      )}

      <div className="h-20" />
    </div>
  );
}
