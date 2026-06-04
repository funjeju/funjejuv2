"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/common/Sidebar";
import { AppHeader } from "@/components/common/AppHeader";
import { BottomNavigation } from "@/components/common/BottomNavigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Admin 경로는 사이드바/헤더 없이 단독 레이아웃
  if (pathname.startsWith("/admin")) {
    return <div className="min-h-screen bg-bg-primary">{children}</div>;
  }

  return (
    <>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader />
          <main className="flex-1 pb-20 md:pb-0">{children}</main>
        </div>
      </div>
      <BottomNavigation />
    </>
  );
}
