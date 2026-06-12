"use client";

import { useRef } from "react";
import type { BlockProps } from "../BlockProps";
import { getThemeTokens } from "@/lib/biz/tokens";
import { SectionHeader } from "../SectionHeader";
import { EmptyBlockHint } from "../EmptyBlockHint";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";

interface ReviewItem { author: string; rating: number; text: string; date?: string; }

export function ReviewCarouselV1({ block, site, isEditing, onEdit }: BlockProps) {
  const theme = getThemeTokens(site.designTokens.themeId);
  const title = (block.data.title as string) || "고객 후기";
  const reviews = (block.data.reviews as ReviewItem[]) || [];
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  if (reviews.length === 0) {
    if (!isEditing) return null;
    return <EmptyBlockHint label="리뷰 (내용 없음)" hint="‘리뷰’ 탭에서 후기를 추가하세요." theme={theme} />;
  }

  return (
    <section className="py-20" style={{ backgroundColor: theme.accent }}>
      <div className="max-w-2xl mx-auto px-6 flex items-end justify-between gap-4">
        <SectionHeader
          eyebrow="Reviews"
          title={title}
          onTitleChange={(v) => onEdit?.(block.blockId, { title: v })}
          isEditing={isEditing}
          theme={theme}
        />
        {/* 좌우 화살표 (후기 2개 이상일 때) */}
        {reviews.length > 1 && (
          <div className="flex gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => scroll("left")}
              aria-label="이전 후기"
              className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
              style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}`, color: theme.text }}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => scroll("right")}
              aria-label="다음 후기"
              className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
              style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}`, color: theme.text }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      <div
        ref={scrollRef}
        className="mt-10 flex gap-4 overflow-x-auto hide-scrollbar px-6 snap-x snap-mandatory scroll-smooth"
      >
        {reviews.map((review, i) => (
          <figure
            key={i}
            className="flex-shrink-0 w-[78%] sm:w-80 snap-start rounded-3xl p-6 flex flex-col"
            style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}
          >
            <div className="flex gap-0.5 mb-4">
              {Array.from({ length: 5 }).map((_, j) => (
                <Star key={j} size={14}
                  fill={j < review.rating ? theme.primary : "transparent"}
                  stroke={j < review.rating ? theme.primary : theme.border} />
              ))}
            </div>
            <blockquote className="text-[15px] leading-relaxed flex-1" style={{ color: theme.text }}>
              “{review.text}”
            </blockquote>
            <figcaption className="mt-5 flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: theme.accent, color: theme.primary }}>
                {review.author?.[0] || "방"}
              </span>
              <span className="text-sm font-semibold" style={{ color: theme.text }}>{review.author}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
