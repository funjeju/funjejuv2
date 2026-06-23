"use client";

import { useEffect, useRef, useState } from "react";
import { LANGS, LANG_LABELS, useI18n } from "@/lib/i18n";

const FLAG: Record<string, string> = { ko: "🇰🇷", en: "🇺🇸", ja: "🇯🇵", zh: "🇨🇳" };

export function LangSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Language"
        className={[
          "flex items-center gap-1 rounded-full border border-border-soft bg-bg-secondary text-text-secondary transition-colors hover:border-brand-orange/40",
          compact ? "px-2 py-1 text-xs" : "w-full justify-center px-3 py-2 text-xs",
        ].join(" ")}
      >
        <span>🌐</span>
        <span className="font-semibold">{FLAG[lang]} {compact ? lang.toUpperCase() : LANG_LABELS[lang]}</span>
      </button>

      {open && (
        <div
          className={[
            "absolute z-50 mt-1 min-w-[8rem] overflow-hidden rounded-xl border border-border-soft bg-bg-card shadow-soft",
            compact ? "right-0" : "left-0 w-full",
          ].join(" ")}
        >
          {LANGS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => { setLang(l); setOpen(false); }}
              className={[
                "flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-bg-secondary",
                l === lang ? "font-bold text-brand-orange" : "text-text-primary",
              ].join(" ")}
            >
              <span>{FLAG[l]}</span>
              <span>{LANG_LABELS[l]}</span>
              {l === lang && <span className="ml-auto text-brand-orange">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
