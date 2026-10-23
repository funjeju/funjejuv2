"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { sidebarItems } from "@/constants/navigation";
export function BottomNavigation() {
  const pathname = usePathname();
  return <nav aria-label="CCTV 메뉴" className="fixed inset-x-0 bottom-0 z-30 border-t border-border-soft bg-bg-card pb-safe md:hidden">
    <div className="flex h-16 items-center justify-around">
      {sidebarItems.map(item => <Link key={item.href} href={item.href}
        aria-current={pathname === item.href ? "page" : undefined}
        className="flex flex-col items-center gap-1 text-xs">
        <span>{item.icon}</span><span>{item.label}</span>
      </Link>)}
    </div>
  </nav>;
}
