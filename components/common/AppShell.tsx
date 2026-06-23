"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/common/Sidebar";
import { AppHeader } from "@/components/common/AppHeader";
import { BottomNavigation } from "@/components/common/BottomNavigation";
import { FloatingChat } from "@/components/common/FloatingChat";
import { usePageViewTracker } from "@/hooks/usePageViewTracker";
import { LangProvider } from "@/lib/i18n";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  usePageViewTracker(); // 페이지 이동마다 자동 기록

  if (pathname.startsWith("/admin")) {
    return <div className="min-h-screen bg-bg-primary">{children}</div>;
  }

  // 비즈 홈페이지(/biz/[slug])는 독립 페이지 — funjeju 네비/사이드바 없이 풀스크린
  if (pathname.startsWith("/biz/")) {
    return <LangProvider>{children}</LangProvider>;
  }

  return (
    <LangProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader />
          <main className="flex-1 pb-20 md:pb-0">{children}</main>
        </div>
      </div>
      <FloatingChat />
      <BottomNavigation />
    </LangProvider>
  );
}
