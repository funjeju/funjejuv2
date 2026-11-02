import type { Metadata } from "next";
import { SKY_ONLY_PUBLIC } from "@/constants/public-mode";
import { SkyHome } from "@/components/sky/SkyHome";
import { SkyFonts } from "@/components/sky/SkyFonts";
import LegacyHomePage from "@/components/legacy/LegacyHomePage";

// 홈 SEO — CCTV 전용 화면 기준. 원래 홈 메타데이터는 components/legacy/LegacyHomePage.tsx 의 legacyHomeMetadata 에 보존.
export const metadata: Metadata = {
  title: { absolute: "펀제주 — 제주 실시간 CCTV 53곳 | 지금 제주 바다와 한라산" },
  description:
    "펀제주(funjeju)에서 제주 해안과 한라산 실시간 CCTV 53곳을 별자리 지도로 확인하세요. 지금 제주날씨·파도·하늘을 새 창에서 바로 봅니다.",
  alternates: { canonical: "/" },
  keywords: [
    "펀제주", "funjeju", "제주 cctv", "제주도 cctv", "제주 실시간 cctv", "제주 라이브캠",
    "제주날씨", "제주도날씨", "오늘 제주 날씨", "제주 실시간 날씨", "실시간제주", "지금 제주", "한라산 cctv",
  ],
  openGraph: {
    title: "펀제주 — 제주를 비추는 53개의 별",
    description: "제주 해안과 한라산 실시간 CCTV 53곳. 별을 누르면 지금 그 바다와 하늘이 열립니다.",
    url: "https://funjeju.com",
    siteName: "FunJeju",
    locale: "ko_KR",
    type: "website",
  },
};

export const revalidate = false; // 영구 캐시 — 별자리 화면은 데이터 조회가 없다. 원래 홈도 revalidatePath("/")로 갱신되던 구조 그대로.

export default function HomePage() {
  if (!SKY_ONLY_PUBLIC) return <LegacyHomePage />;
  return (
    <>
      <SkyFonts />
      <SkyHome />
    </>
  );
}
