"use client";

import type { BlockProps } from "../BlockProps";
import { getThemeTokens } from "@/lib/biz/tokens";
import { Star, Quote } from "lucide-react";

interface ReviewItem {
  author: string;
  rating: number;
  text: string;
  date?: string;
}

export function ReviewCardV2({ block, site }: BlockProps) {
  const theme = getThemeTokens(site.designTokens.themeId);
  const title = (block.data.title as string) || "고객 후기";
  const reviews = (block.data.reviews as ReviewItem[]) || [];

  if (reviews.length === 0) return null;

  return (
    <section className="py-16 px-6" style={{ backgroundColor: theme.surface }}>
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-8 text-center" style={{ color: theme.text }}>
          {title}
        </h2>
        <div className="space-y-4">
          {reviews.slice(0, 4).map((review, i) => (
            <div
              key={i}
              className="rounded-2xl p-5 relative"
              style={{ backgroundColor: theme.surfaceAlt }}
            >
              <Quote size={20} className="absolute top-4 right-4 opacity-20" style={{ color: theme.primary }} />
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: theme.primary, color: theme.primaryFg }}
                >
                  {review.author[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: theme.text }}>{review.author}</p>
                  <div className="flex gap-0.5">
                    {Array.from({ length: review.rating }).map((_, j) => (
                      <Star key={j} size={10} fill={theme.primary} stroke="none" />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: theme.text }}>{review.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
