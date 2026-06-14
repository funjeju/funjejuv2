"use client";

import type { BlockProps } from "../BlockProps";
import { getThemeTokens } from "@/lib/biz/tokens";
import { SectionHeader } from "../SectionHeader";
import { EmptyBlockHint } from "../EmptyBlockHint";

/** AI 종합 후기 — 개별 카드 대신 방문객 리뷰를 한 단락으로 요약해 큰따옴표로 보여줌 */
export function ReviewSummaryV1({ block, site, isEditing }: BlockProps) {
  const theme = getThemeTokens(site.designTokens.themeId);
  const title = (block.data.title as string) || "고객 후기";
  const summary = (block.data.summary as string) || "";
  const count = (block.data.count as number) || 0;

  if (!summary.trim()) {
    if (!isEditing) return null;
    return <EmptyBlockHint label="고객 후기 (요약 없음)" hint="리뷰 데이터가 있으면 AI가 종합 후기를 생성해요." theme={theme} />;
  }

  return (
    <section className="py-20 px-6" style={{ backgroundColor: theme.surface }}>
      <div className="mx-auto max-w-2xl text-center">
        <SectionHeader eyebrow="Reviews" title={title} isEditing={isEditing} theme={theme} />

        <div className="relative mt-10">
          {/* 큰 따옴표 */}
          <span
            className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 select-none font-serif text-[120px] leading-none opacity-15"
            style={{ color: theme.primary }}
            aria-hidden
          >
            “
          </span>
          <p
            className="relative text-lg font-medium leading-relaxed md:text-xl"
            style={{ color: theme.text }}
          >
            {summary}
          </p>
        </div>

        <p className="mt-8 text-xs font-semibold tracking-wide" style={{ color: theme.textMuted }}>
          ✦ AI가 방문객 후기{count > 0 ? ` ${count}건` : ""}을 종합했어요
        </p>
      </div>
    </section>
  );
}
