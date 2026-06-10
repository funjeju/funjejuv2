"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "홈", emoji: "🏠" },
  { href: "/cctv", label: "CCTV", emoji: "📷" },
  null, // center + button placeholder
  { href: "/saved", label: "저장", emoji: "⭐" },
  { href: "/mypage", label: "마이", emoji: "👤" },
];

export function BottomNavigation() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border-soft bg-bg-card/95 pb-safe backdrop-blur md:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        {items.map((item, i) => {
          if (!item) {
            return (
              <Link
                key="plus"
                href="/feed?write=1"
                className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand-orange text-2xl text-white shadow-soft"
                aria-label="라이브 피드 업로드"
              >
                +
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
              <span className={["text-xl transition-transform", active ? "scale-110" : "opacity-50"].join(" ")}>
                {item.emoji}
              </span>
              <span
                className={[
                  "text-[10px] font-medium",
                  active ? "text-brand-orange font-semibold" : "text-text-secondary",
                ].join(" ")}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
