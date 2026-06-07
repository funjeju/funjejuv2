"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/common/Sidebar";
import { AppHeader } from "@/components/common/AppHeader";
import { BottomNavigation } from "@/components/common/BottomNavigation";
import { usePageViewTracker } from "@/hooks/usePageViewTracker";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  usePageViewTracker(); // 페이지 이동마다 자동 기록

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
