import type { Metadata } from "next";
import "./globals.css";
import { AppHeader } from "@/components/common/AppHeader";
import { BottomNavigation } from "@/components/common/BottomNavigation";

export const metadata: Metadata = {
  title: "FunJeju",
  description: "실시간 제주 데이터를 기반으로 여행 발견, 저장, 일정 생성을 연결하는 AI 제주 여행 플랫폼"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="font-sans antialiased">
        <AppHeader />
        <main className="mx-auto min-h-screen w-full max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:px-8">
          {children}
        </main>
        <BottomNavigation />
      </body>
    </html>
  );
}
