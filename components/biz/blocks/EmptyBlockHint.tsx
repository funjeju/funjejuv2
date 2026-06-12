"use client";

import type { ThemeTokens } from "@/lib/biz/tokens";

/** 데이터가 없는 블록을 편집 모드에서 안내하는 placeholder. */
export function EmptyBlockHint({ label, hint, theme }: { label: string; hint: string; theme: ThemeTokens }) {
  return (
    <section className="py-16 px-6" style={{ backgroundColor: theme.surfaceAlt }}>
      <div className="max-w-2xl mx-auto">
        <div
          className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center py-12 px-6"
          style={{ borderColor: theme.border }}
        >
          <p className="text-sm font-semibold mb-1" style={{ color: theme.text }}>{label}</p>
          <p className="text-xs" style={{ color: theme.textMuted }}>{hint}</p>
        </div>
      </div>
    </section>
  );
}
