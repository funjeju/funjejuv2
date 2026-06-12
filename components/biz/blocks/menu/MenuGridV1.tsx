"use client";

import Image from "next/image";
import type { BlockProps } from "../BlockProps";
import { getThemeTokens } from "@/lib/biz/tokens";
import { SectionHeader } from "../SectionHeader";
import { EmptyBlockHint } from "../EmptyBlockHint";
import { formatPrice } from "@/lib/biz/utils";

export function MenuGridV1({ block, site, isEditing, onEdit }: BlockProps) {
  const theme = getThemeTokens(site.designTokens.themeId);
  const title = (block.data.title as string) || "메뉴";
  const items = site.menuData.items;

  if (items.length === 0) {
    if (!isEditing) return null;
    return <EmptyBlockHint label="메뉴 (내용 없음)" hint="‘메뉴’ 탭에서 메뉴를 추가하세요." theme={theme} />;
  }

  return (
    <section className="py-20 px-6" style={{ backgroundColor: theme.surface }}>
      <div className="max-w-2xl mx-auto">
        <SectionHeader
          eyebrow="Menu"
          title={title}
          onTitleChange={(v) => onEdit?.(block.blockId, { title: v })}
          isEditing={isEditing}
          theme={theme}
        />

        <div className="mt-10 grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-8">
          {items.map((item) => (
            <div key={item.id} className="group">
              <div className="relative aspect-square rounded-2xl overflow-hidden mb-3" style={{ backgroundColor: theme.accent }}>
                {item.imageUrl ? (
                  <Image src={item.imageUrl} alt={item.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-2xl opacity-40">🍽️</div>
                )}
              </div>
              <p className="font-semibold text-sm leading-snug" style={{ color: theme.text }}>{item.name}</p>
              {item.description && (
                <p className="text-xs mt-0.5 line-clamp-1" style={{ color: theme.textMuted }}>{item.description}</p>
              )}
              <p className="text-sm font-bold mt-1 tabular-nums" style={{ color: theme.primary }}>{formatPrice(item.price)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
