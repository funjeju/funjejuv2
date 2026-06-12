"use client";

import type { BlockProps } from "../BlockProps";
import { getThemeTokens } from "@/lib/biz/tokens";
import { SectionHeader } from "../SectionHeader";
import { EmptyBlockHint } from "../EmptyBlockHint";
import { Mountain, Clock, Footprints, Car, Ticket, Sun } from "lucide-react";

interface InfoItem { label: string; value: string; icon?: string; }

const ICON_MAP: Record<string, React.ReactNode> = {
  난이도: <Footprints size={18} />,
  소요시간: <Clock size={18} />,
  주차: <Car size={18} />,
  입장료: <Ticket size={18} />,
  추천계절: <Sun size={18} />,
  고도: <Mountain size={18} />,
};

function iconFor(label: string): React.ReactNode {
  for (const key of Object.keys(ICON_MAP)) {
    if (label.includes(key)) return ICON_MAP[key];
  }
  return <Mountain size={18} />;
}

export function AttractionInfoV1({ block, site, isEditing, onEdit }: BlockProps) {
  const theme = getThemeTokens(site.designTokens.themeId);
  const title = (block.data.title as string) || "탐방 정보";
  const items = (block.data.items as InfoItem[]) || [];

  if (items.length === 0) {
    if (!isEditing) return null;
    return <EmptyBlockHint label="탐방 정보 (내용 없음)" hint="'정보' 항목을 추가하세요 (난이도·소요시간·주차 등)." theme={theme} />;
  }

  return (
    <section className="py-20 px-6" style={{ backgroundColor: theme.accent }}>
      <div className="max-w-2xl mx-auto">
        <SectionHeader eyebrow="Guide" title={title}
          onTitleChange={(v) => onEdit?.(block.blockId, { title: v })} isEditing={isEditing} theme={theme} />

        <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map((item, i) => (
            <div key={i} className="rounded-2xl p-4 flex flex-col gap-2" style={{ backgroundColor: theme.surface }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: theme.accent, color: theme.primary }}>
                {iconFor(item.label)}
              </div>
              <div>
                <p className="text-xs" style={{ color: theme.textMuted }}>{item.label}</p>
                <p className="text-sm font-bold mt-0.5" style={{ color: theme.text }}>{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
