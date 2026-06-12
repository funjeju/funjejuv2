"use client";

import type { ThemeTokens } from "@/lib/biz/tokens";
import { InlineEdit } from "@/components/biz/InlineEdit";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  onTitleChange?: (v: string) => void;
  isEditing?: boolean;
  theme: ThemeTokens;
  align?: "left" | "center";
}

export function SectionHeader({
  eyebrow,
  title,
  onTitleChange,
  isEditing,
  theme,
  align = "left",
}: SectionHeaderProps) {
  return (
    <div className={align === "center" ? "text-center" : ""}>
      {eyebrow && (
        <div className={align === "center" ? "flex items-center justify-center gap-2 mb-4" : "flex items-center gap-2 mb-4"}>
          <span className="h-px w-6" style={{ backgroundColor: theme.primary }} />
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: theme.primary }}>
            {eyebrow}
          </span>
        </div>
      )}
      <InlineEdit
        value={title}
        onChange={(v) => onTitleChange?.(v)}
        isEditing={isEditing}
        tag="h2"
        className="text-[28px] md:text-4xl font-bold tracking-tight leading-[1.15]"
        style={{ color: theme.text } as React.CSSProperties}
        placeholder="섹션 제목"
      />
    </div>
  );
}
