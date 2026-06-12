"use client";

import type { BlockProps } from "../BlockProps";
import { getThemeTokens } from "@/lib/biz/tokens";
import { formatPrice } from "@/lib/biz/utils";

export function PriceListV1({ block, site }: BlockProps) {
  const theme = getThemeTokens(site.designTokens.themeId);
  const title = (block.data.title as string) || "가격표";

  if (site.menuData.items.length === 0) return null;

  return (
    <section className="py-16 px-6" style={{ backgroundColor: theme.surface }}>
      <div className="max-w-lg mx-auto">
        <h2 className="text-2xl font-bold mb-8 text-center" style={{ color: theme.text }}>
          {title}
        </h2>
        <div
          className="rounded-3xl overflow-hidden border"
          style={{ borderColor: theme.border }}
        >
          {site.menuData.items.map((item, idx) => (
            <div
              key={item.id}
              className="flex justify-between items-center px-6 py-4"
              style={{
                backgroundColor: idx % 2 === 0 ? theme.surface : theme.surfaceAlt,
                borderBottom: idx < site.menuData.items.length - 1 ? `1px solid ${theme.border}` : undefined,
              }}
            >
              <div>
                <p className="font-semibold" style={{ color: theme.text }}>{item.name}</p>
                {item.description && (
                  <p className="text-sm" style={{ color: theme.textMuted }}>{item.description}</p>
                )}
              </div>
              <p className="font-bold text-lg" style={{ color: theme.primary }}>
                {formatPrice(item.price)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
