import type { Metadata } from "next";
import "./globals.css";
import { AppHeader } from "@/components/common/AppHeader";
import { BottomNavigation } from "@/components/common/BottomNavigation";
import { Sidebar } from "@/components/common/Sidebar";

export const metadata: Metadata = {
  metadataBase: new URL("https://funjeju.com"),
  title: {
    default: "FunJeju — 제주가 더 FUN해지는 여행",
    template: "%s | FunJeju",
  },
  description:
    "실시간 제주 CCTV 40개, 도민이 추천하는 맛집 589곳, AI 도슨트 챗봇, 유튜브 영상 요약, AI 여행 일정까지. 제주 여행 필수 플랫폼 펀제주.",
  keywords: ["제주 여행", "제주 맛집", "도민맛집", "제주 CCTV", "실시간 제주", "펀제주", "제주도 여행"],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://funjeju.com",
    siteName: "FunJeju",
    title: "FunJeju — 제주가 더 FUN해지는 여행",
    description: "실시간 제주 CCTV, 도민맛집 589곳, AI 도슨트까지 — 제주 여행 필수 플랫폼",
  },
  twitter: {
    card: "summary_large_image",
    title: "FunJeju — 제주가 더 FUN해지는 여행",
    description: "실시간 제주 CCTV, 도민맛집 589곳, AI 도슨트까지",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
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
