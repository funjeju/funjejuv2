import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import { AppShell } from "@/components/common/AppShell";

// GA4: 별도 GA_ID가 없으면 이미 설정된 Firebase 측정 ID(G-...)를 재사용 → 추가 env 불필요
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

export const metadata: Metadata = {
  metadataBase: new URL("https://funjeju.com"), // 네이버 등록·실제 200 응답 도메인(non-www)으로 통일
  title: {
    default: "펀제주 FunJeju — 제주가 더 FUN해지는 여행",
    template: "%s | 펀제주 FunJeju",
  },
  alternates: { canonical: "/" },
  // 네이버 권고: 80자 이내
  description:
    "제주 실시간 CCTV·지역별 날씨, 도민맛집, AI 도슨트·여행일정까지. 제주 여행 필수 플랫폼 펀제주.",
  keywords: [
    "펀제주", "펀제주 funjeju", "funjeju",
    "제주날씨", "제주 날씨", "제주도날씨", "제주도 날씨", "오늘 제주 날씨", "제주 실시간 날씨",
    "제주 cctv", "제주 CCTV", "제주도 cctv", "제주 실시간 cctv", "제주 라이브캠", "제주 실시간 영상",
    "실시간제주", "실시간 제주", "오늘제주", "오늘 제주", "지금 제주",
    "제주 여행", "제주도 여행", "제주 맛집", "도민맛집", "제주 가볼만한곳",
  ],
  // 검색엔진 사이트 소유확인 (네이버 서치어드바이저 / 구글 서치콘솔)
  verification: {
    other: {
      "naver-site-verification": "478ebb575ea38f998084d300bfca76b833d87001",
    },
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://funjeju.com",
    siteName: "FunJeju",
    title: "펀제주 FunJeju — 제주가 더 FUN해지는 여행",
    description: "실시간 제주 CCTV, 도민맛집 589곳, AI 도슨트까지 — 제주 여행 필수 플랫폼",
    images: [
      {
        url: "https://funjeju.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "FunJeju — 제주가 더 FUN해지는 여행",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "펀제주 FunJeju — 제주가 더 FUN해지는 여행",
    description: "실시간 제주 CCTV, 도민맛집 589곳, AI 도슨트까지",
    images: ["https://funjeju.com/og-image.png"],
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
        {/* 브랜드 구조화데이터 — "펀제주"/"funjeju" 브랜드 인식 + 사이트링크 검색창 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebSite",
                  "@id": "https://funjeju.com/#website",
                  url: "https://funjeju.com",
                  name: "펀제주",
                  alternateName: ["FunJeju", "funjeju", "펀제주 funjeju"],
                  inLanguage: "ko",
                  potentialAction: {
                    "@type": "SearchAction",
                    target: "https://funjeju.com/search?q={search_term_string}",
                    "query-input": "required name=search_term_string",
                  },
                },
                {
                  "@type": "Organization",
                  "@id": "https://funjeju.com/#org",
                  name: "펀제주",
                  alternateName: "FunJeju",
                  url: "https://funjeju.com",
                  logo: "https://funjeju.com/og-image.png",
                  // 권위·합의 신호 (E-E-A-T / GEO) — 공식 채널
                  sameAs: [
                    "https://www.instagram.com/funjeju",
                    "https://www.youtube.com/@funjeju",
                  ],
                },
              ],
            }),
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <AppShell>{children}</AppShell>
      </body>
      {GA_ID && <GoogleAnalytics gaId={GA_ID} />}
    </html>
  );
}
