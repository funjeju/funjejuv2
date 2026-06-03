"use client";

import { useSaved } from "@/hooks/useSaved";

type Props = { id: string; label?: boolean; className?: string };

export function SaveButton({ id, label = true, className = "" }: Props) {
  const { isSaved, toggle } = useSaved();
  const saved = isSaved(id);

  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); toggle(id); }}
      className={[
        "flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all active:scale-95",
        saved
          ? "bg-brand-orange text-white shadow-soft"
          : "border border-border-soft bg-bg-card text-text-secondary hover:border-brand-orange hover:text-brand-orange",
        className,
      ].join(" ")}
    >
      <span className={["transition-transform", saved ? "scale-110" : ""].join(" ")}>
        {saved ? "⭐" : "☆"}
      </span>
      {label && <span>{saved ? "저장됨" : "저장"}</span>}
    </button>
  );
}
