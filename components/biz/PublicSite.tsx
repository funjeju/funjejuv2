"use client";

import type { SiteSchema } from "@/lib/biz/types";
import { BlockRenderer } from "./blocks/BlockRenderer";
import { Phone, MessageCircle } from "lucide-react";

/**
 * 비즈 홈페이지 퍼블릭 렌더 — layout 블록들을 순서대로 그리고,
 * 하단에 전화·카카오톡 고정 CTA. (aiweb 원본의 다국어 번역은 후순위로 제외)
 */
export function PublicSite({ site }: { site: SiteSchema }) {
  const { phone } = site.merchantInfo;
  const kakaoTalk = site.externalLinks.kakaoTalk;

  return (
    <div className="min-h-screen bg-white">
      {site.layout.map((block) => (
        <BlockRenderer key={block.blockId} block={block} site={site} />
      ))}

      {(phone || kakaoTalk) && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex gap-3 border-t border-gray-200 bg-white px-4 py-3">
          {phone && (
            <a
              href={`tel:${phone}`}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-900 py-3 font-semibold text-white"
            >
              <Phone size={18} /> 전화하기
            </a>
          )}
          {kakaoTalk && (
            <a
              href={kakaoTalk}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#FEE500] py-3 font-semibold text-[#3B1E08]"
            >
              <MessageCircle size={18} /> 카카오톡
            </a>
          )}
        </div>
      )}

      <div className="h-20" />
    </div>
  );
}
