"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { CctvIcon } from "@/components/common/CctvIcon";
import { useT } from "@/lib/i18n";

const items: ({ href: string; emoji?: string; icon?: ReactNode } | null)[] = [
  { href: "/", emoji: "🏠" },
  { href: "/cctv", icon: <CctvIcon size={22} /> },
  null, // center 피드 버튼
  { href: "/game/spot", emoji: "🔍" },
  { href: "/mypage", emoji: "👤" },
];

export function BottomNavigation() {
  const pathname = usePathname();
  const t = useT();

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border-soft bg-bg-card/95 pb-safe backdrop-blur md:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        {items.map((item, i) => {
          if (!item) {
            const feedActive = pathname.startsWith("/feed");
            // /feed에 있으면 업로드(+), 아니면 피드로 이동(📷)
            const circle = (
              <span className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand-orange text-2xl text-white shadow-soft">
                {feedActive ? "+" : "📷"}
              </span>
            );
            const label = (
              <span className={["text-[10px] font-medium", feedActive ? "text-brand-orange font-semibold" : "text-text-secondary"].join(" ")}>
                {feedActive ? t("tab.feed.upload") : t("tab./feed")}
              </span>
            );
            return feedActive ? (
              <button
                key="feed"
                type="button"
                onClick={() => window.dispatchEvent(new Event("funjeju:feed-write"))}
                className="flex flex-col items-center gap-0.5"
                aria-label="피드 올리기"
              >
                {circle}{label}
              </button>
            ) : (
              <Link key="feed" href="/feed" className="flex flex-col items-center gap-0.5" aria-label="라이브 피드">
                {circle}{label}
              </Link>
            );
          }
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5"
            >
              <span className={["flex h-6 items-center text-xl transition-transform", active ? "scale-110 text-brand-orange" : "opacity-50"].join(" ")}>
                {item.icon ?? item.emoji}
              </span>
              <span
                className={[
                  "text-[10px] font-medium",
                  active ? "text-brand-orange font-semibold" : "text-text-secondary",
                ].join(" ")}
              >
                {t(`tab.${item.href}`)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
