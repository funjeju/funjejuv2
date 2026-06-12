"use client";

import type { BlockProps } from "../BlockProps";
import { getThemeTokens } from "@/lib/biz/tokens";
import { Clock } from "lucide-react";

interface DayHour {
  day: string;
  hours: string;
  closed?: boolean;
}

export function BusinessHoursV1({ block, site }: BlockProps) {
  const theme = getThemeTokens(site.designTokens.themeId);
  const title = (block.data.title as string) || "영업시간";
  const schedule = (block.data.schedule as DayHour[]) || [];
  const note = block.data.note as string | undefined;

  const simpleHours = site.merchantInfo.businessHours;

  return (
    <section className="py-12 px-6" style={{ backgroundColor: theme.surface }}>
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Clock size={20} style={{ color: theme.primary }} />
          <h2 className="text-xl font-bold" style={{ color: theme.text }}>{title}</h2>
        </div>

        {schedule.length > 0 ? (
          <div className="space-y-2">
            {schedule.map((s, i) => (
              <div key={i} className="flex justify-between py-2 border-b" style={{ borderColor: theme.border }}>
                <span className="text-sm font-medium" style={{ color: theme.text }}>{s.day}</span>
                <span className="text-sm" style={{ color: s.closed ? theme.textMuted : theme.text }}>
                  {s.closed ? "휴무" : s.hours}
                </span>
              </div>
            ))}
          </div>
        ) : simpleHours ? (
          <p className="text-sm" style={{ color: theme.text }}>{simpleHours}</p>
        ) : null}

        {note && (
          <p className="text-xs mt-4 p-3 rounded-xl" style={{ backgroundColor: theme.surfaceAlt, color: theme.textMuted }}>
            {note}
          </p>
        )}
      </div>
    </section>
  );
}
