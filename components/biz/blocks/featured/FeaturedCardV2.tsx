"use client";

import Image from "next/image";
import type { BlockProps } from "../BlockProps";
import { getThemeTokens } from "@/lib/biz/tokens";
import { SectionHeader } from "../SectionHeader";
import { EmptyBlockHint } from "../EmptyBlockHint";
import { InlineEdit } from "@/components/biz/InlineEdit";

interface FeaturedItem { title: string; description: string; imageUrl?: string; badge?: string; }

export function FeaturedCardV2({ block, site, isEditing, onEdit }: BlockProps) {
  const theme = getThemeTokens(site.designTokens.themeId);
  const title = (block.data.title as string) || "시그니처";
  // 빈 항목(이름 없는 번호만) 제거 + 최대 5개만 노출
  const items = ((block.data.items as FeaturedItem[]) || [])
    .filter((it) => it.title?.trim())
    .slice(0, 5);

  const updateItem = (idx: number, patch: Partial<FeaturedItem>) => {
    const next = items.map((it, i) => i === idx ? { ...it, ...patch } : it);
    onEdit?.(block.blockId, { items: next });
  };

  if (items.length === 0) {
    if (!isEditing) return null;
    return <EmptyBlockHint label="추천 메뉴 (내용 없음)" hint="‘메뉴’ 탭에서 항목을 추가하세요." theme={theme} />;
  }

  return (
    <section className="py-20 px-6" style={{ backgroundColor: theme.surface }}>
      <div className="max-w-2xl mx-auto">
        <SectionHeader
          eyebrow="Signature"
          title={title}
          onTitleChange={(v) => onEdit?.(block.blockId, { title: v })}
          isEditing={isEditing}
          theme={theme}
        />

        <div className="mt-10 divide-y" style={{ borderColor: theme.border }}>
          {items.map((item, i) => (
            <div key={i} className="group flex items-start gap-5 py-6 first:pt-0" style={{ borderColor: theme.border }}>
              {/* 숫자 인덱스 */}
              <span className="text-sm font-semibold tabular-nums pt-1 w-8 flex-shrink-0" style={{ color: theme.primary }}>
                {String(i + 1).padStart(2, "0")}
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <InlineEdit
                    value={item.title}
                    onChange={(v) => updateItem(i, { title: v })}
                    isEditing={isEditing}
                    tag="h3"
                    className="text-lg font-bold tracking-tight"
                    style={{ color: theme.text } as React.CSSProperties}
                    placeholder="메뉴명"
                  />
                  {item.badge && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: theme.accent, color: theme.primary }}>
                      {item.badge}
                    </span>
                  )}
                </div>
                <InlineEdit
                  value={item.description}
                  onChange={(v) => updateItem(i, { description: v })}
                  isEditing={isEditing}
                  tag="p"
                  className="text-sm leading-relaxed"
                  style={{ color: theme.textMuted } as React.CSSProperties}
                  placeholder="설명"
                  multiline
                />
              </div>

              {item.imageUrl && (
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0">
                  <Image src={item.imageUrl} alt={item.title} fill className="object-cover transition-transform duration-500 group-hover:scale-110" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
