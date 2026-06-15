import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import { AppShell } from "@/components/common/AppShell";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export const metadata: Metadata = {
  metadataBase: new URL("https://www.funjeju.com"), // bare funjeju.com은 미작동 → www로 통일
  title: {
    default: "FunJeju — 제주가 더 FUN해지는 여행",
    template: "%s | FunJeju",
  },
  description:
    "실시간 제주 CCTV 40개, 도민이 추천하는 맛집 589곳, AI 도슨트 챗봇, 유튜브 영상 요약, AI 여행 일정까지. 제주 여행 필수 플랫폼 펀제주.",
  keywords: ["제주 여행", "제주 맛집", "도민맛집", "제주 CCTV", "실시간 제주", "펀제주", "제주도 여행"],
  // 검색엔진 사이트 소유확인 (네이버 서치어드바이저 / 구글 서치콘솔)
  verification: {
    other: {
      "naver-site-verification": "478ebb575ea38f998084d300bfca76b833d87001",
    },
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://www.funjeju.com",
    siteName: "FunJeju",
    title: "FunJeju — 제주가 더 FUN해지는 여행",
    description: "실시간 제주 CCTV, 도민맛집 589곳, AI 도슨트까지 — 제주 여행 필수 플랫폼",
    images: [
      {
        url: "https://www.funjeju.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "FunJeju — 제주가 더 FUN해지는 여행",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FunJeju — 제주가 더 FUN해지는 여행",
    description: "실시간 제주 CCTV, 도민맛집 589곳, AI 도슨트까지",
    images: ["https://www.funjeju.com/og-image.png"],
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
      <head>
        {/* Pretendard — 한글 동적 서브셋 (가장 가벼움) */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css"
        />
      </head>
      <body className="font-sans antialiased">
        <AppShell>{children}</AppShell>
      </body>
      {GA_ID && <GoogleAnalytics gaId={GA_ID} />}
    </html>
  );
}
