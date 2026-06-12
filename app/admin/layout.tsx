"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin/stats",  label: "📊 통계",     short: "통계"  },
  { href: "/admin/origin", label: "🔴 Origin",  short: "Origin" },
  { href: "/admin/logs",   label: "📋 로그",     short: "로그"  },
  { href: "/admin/cctv",   label: "📡 CCTV",    short: "CCTV"  },
  { href: "/admin/food",   label: "🍽️ 도민맛집", short: "맛집"  },
  { href: "/admin/feed",   label: "📸 라이브피드",short: "피드"  },
  { href: "/admin/jejutube", label: "▶ 제주tube", short: "튜브" },
  { href: "/admin/contents", label: "📝 콘텐츠",  short: "콘텐츠" },
  { href: "/admin/spot-diff", label: "🔍 틀린그림", short: "틀린그림" },
  { href: "/admin/users",  label: "👥 사용자",   short: "사용자" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin/login") return <>{children}</>;

  return (
    <div className="min-h-screen bg-bg-primary">
      <header className="sticky top-0 z-40 border-b border-border-soft bg-bg-card shadow-card">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          {/* 로고 */}
          <Link href="/admin/cctv" className="flex shrink-0 items-center gap-1">
            <span className="text-base font-black text-brand-orange">Fun</span>
            <span className="text-base font-black text-brand-navy">jeju</span>
            <span className="ml-1 rounded-full bg-brand-navy px-2 py-0.5 text-[9px] font-black text-white">
              ADMIN
            </span>
          </Link>

          {/* 네비 */}
          <nav className="flex flex-1 gap-0.5 overflow-x-auto">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors",
                    active
                      ? "bg-brand-orange text-white"
                      : "text-text-secondary hover:bg-bg-secondary hover:text-text-primary",
                  ].join(" ")}
                >
                  <span className="hidden sm:inline">{item.label}</span>
                  <span className="sm:hidden">{item.short}</span>
                </Link>
              );
            })}
          </nav>

          <Link
            href="/"
            className="shrink-0 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            ← 앱
          </Link>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
