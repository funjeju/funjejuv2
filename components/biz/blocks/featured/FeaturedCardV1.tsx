"use client";

import Image from "next/image";
import type { BlockProps } from "../BlockProps";
import { getThemeTokens } from "@/lib/biz/tokens";

interface FeaturedItem {
  title: string;
  description: string;
  imageUrl?: string;
  badge?: string;
}

export function FeaturedCardV1({ block, site }: BlockProps) {
  const theme = getThemeTokens(site.designTokens.themeId);
  const title = (block.data.title as string) || "추천";
  const items = (block.data.items as FeaturedItem[]) || [];

  if (items.length === 0) return null;

  return (
    <section className="py-16 px-6" style={{ backgroundColor: theme.surface }}>
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-8" style={{ color: theme.text }}>{title}</h2>
        <div className="space-y-4">
          {items.map((item, i) => (
            <div
              key={i}
              className="flex gap-4 rounded-2xl overflow-hidden border"
              style={{ borderColor: theme.border }}
            >
              {item.imageUrl && (
                <div className="relative w-28 flex-shrink-0">
                  <Image src={item.imageUrl} alt={item.title} fill className="object-cover" />
                </div>
              )}
              <div className="flex-1 py-4 pr-4">
                {item.badge && (
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full mb-1 inline-block"
                    style={{ backgroundColor: theme.primary, color: theme.primaryFg }}
                  >
                    {item.badge}
                  </span>
                )}
                <p className="font-semibold" style={{ color: theme.text }}>{item.title}</p>
                <p className="text-sm mt-0.5" style={{ color: theme.textMuted }}>{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
