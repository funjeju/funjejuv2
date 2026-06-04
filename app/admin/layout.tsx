"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin/cctv", label: "📡 CCTV 관리" },
  { href: "/admin/users", label: "👥 사용자 관리" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin/login") return <>{children}</>;

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 border-b border-border-soft bg-bg-card shadow-card">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <Link href="/admin/cctv" className="flex items-center gap-1.5">
            <span className="text-base font-black text-brand-orange">Fun</span>
            <span className="text-base font-black text-brand-navy">jeju</span>
            <span className="ml-1 rounded-full bg-brand-navy px-2 py-0.5 text-[10px] font-bold text-white">
              ADMIN
            </span>
          </Link>

          <nav className="flex flex-1 gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors",
                  pathname === item.href
                    ? "bg-brand-orange/10 text-brand-orange"
                    : "text-text-secondary hover:bg-bg-secondary hover:text-text-primary",
                ].join(" ")}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <Link
            href="/"
            className="text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            ← 앱으로
          </Link>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
