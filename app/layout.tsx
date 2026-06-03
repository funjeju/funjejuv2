import type { Metadata } from "next";
import "./globals.css";
import { AppHeader } from "@/components/common/AppHeader";
import { BottomNavigation } from "@/components/common/BottomNavigation";
import { Sidebar } from "@/components/common/Sidebar";

export const metadata: Metadata = {
  title: "FunJeju — 제주가 더 FUN해지는 여행",
  description: "실시간 제주 CCTV, 라이브 피드, AI 도슨트, 유튜브 요약, AI 여행 일정을 한곳에",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="font-sans antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <AppHeader />
            <main className="flex-1 pb-20 md:pb-0">{children}</main>
          </div>
        </div>
        <BottomNavigation />
      </body>
    </html>
  );
}
