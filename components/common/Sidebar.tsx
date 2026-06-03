"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { sidebarItems } from "@/constants/navigation";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <aside className="hidden md:flex md:w-52 md:flex-col md:shrink-0">
      <div className="sticky top-0 flex h-screen flex-col border-r border-border-soft bg-bg-card">
        {/* Logo */}
        <div className="px-5 py-5">
          <Link href="/" className="flex items-center gap-1">
            <span className="text-xl font-black text-brand-orange">Fun</span>
            <span className="text-xl font-black text-brand-navy">jeju</span>
          </Link>
          <p className="mt-0.5 text-[10px] text-text-secondary">제주가 더 FUN해지는 여행</p>
        </div>

        {/* Search */}
        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={() => router.push("/search")}
            className="flex w-full items-center gap-2 rounded-xl border border-border-soft bg-bg-secondary px-3 py-2 text-xs text-text-secondary hover:border-brand-orange/40 transition-colors"
          >
            <span>🔍</span>
            <span>제주에서 검색...</span>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-3">
          {sidebarItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "bg-brand-orange/10 text-brand-orange font-semibold"
                  : "text-text-secondary hover:bg-bg-secondary hover:text-text-primary",
              ].join(" ")}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Mascot */}
        <div className="px-4 py-5 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-bg-secondary text-3xl">
            🗿
          </div>
          <p className="mt-2 text-xs font-medium text-text-primary">안녕하세요!</p>
          <p className="text-[10px] text-text-secondary">제주 여행 도슨트</p>
          <p className="text-[10px] text-text-secondary">오늘도 즐거운 여행 되세요!</p>
          <button
            type="button"
            className="mt-3 w-full rounded-full border border-border-soft bg-bg-secondary py-1.5 text-[11px] font-medium text-text-secondary hover:bg-bg-primary transition-colors"
          >
            도슨트에게 물어보기 💬
          </button>
          <div className="mt-3 flex justify-center gap-2 text-sm text-text-secondary">
            <span>📸</span>
            <span>▶️</span>
            <span>🎵</span>
          </div>
          <p className="mt-3 text-[9px] text-text-secondary">© 2025 FunJeju</p>
        </div>
      </div>
    </aside>
  );
}
