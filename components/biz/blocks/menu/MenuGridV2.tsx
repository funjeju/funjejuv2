"use client";

import type { BlockProps } from "../BlockProps";
import { getThemeTokens } from "@/lib/biz/tokens";
import { formatPrice } from "@/lib/biz/utils";

export function MenuGridV2({ block, site }: BlockProps) {
  const theme = getThemeTokens(site.designTokens.themeId);
  const title = (block.data.title as string) || "메뉴";

  const items = site.menuData.items.filter((it) => it.name?.trim()).slice(0, 5); // 빈 항목 제거 + 최대 5개
  if (items.length === 0) return null;

  const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
    const cat = item.category || "메뉴";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <section className="py-16 px-6" style={{ backgroundColor: theme.surfaceAlt }}>
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-8" style={{ color: theme.text }}>
          {title}
        </h2>
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="mb-8">
            <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider" style={{ color: theme.primary }}>
              {category}
            </h3>
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center py-3 border-b"
                  style={{ borderColor: theme.border }}
                >
                  <div>
                    <p className="font-medium" style={{ color: theme.text }}>{item.name}</p>
                    {item.description && (
                      <p className="text-sm" style={{ color: theme.textMuted }}>{item.description}</p>
                    )}
                  </div>
                  <p className="font-bold ml-4" style={{ color: theme.primary }}>
                    {formatPrice(item.price)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
