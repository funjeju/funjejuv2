"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "홈", emoji: "🏠" },
  { href: "/cctv", label: "CCTV", emoji: "📷" },
  null, // center 피드 버튼
  { href: "/youtube", label: "제주tube", emoji: "▶️" },
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
            const feedActive = pathname.startsWith("/feed");
            return (
              <Link
                key="feed"
                href="/feed"
                className="flex flex-col items-center gap-0.5"
                aria-label="라이브 피드"
              >
                <span className={[
                  "-mt-5 flex h-14 w-14 items-center justify-center rounded-full text-2xl text-white shadow-soft transition-transform",
                  feedActive ? "bg-brand-orange scale-105" : "bg-brand-orange",
                ].join(" ")}>
                  🖼️
                </span>
                <span className={["text-[10px] font-medium", feedActive ? "text-brand-orange font-semibold" : "text-text-secondary"].join(" ")}>
                  피드
                </span>
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
