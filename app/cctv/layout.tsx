import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "제주 CCTV - 목록과 지도로 찾아보기",
  description:
    "제주 전 지역의 CCTV를 목록과 지도에서 검색하세요. 해변, 한라산, 공항과 항구의 풍경을 직접 확인하고, 재생되지 않는 영상은 임시 오류 안내를 확인할 수 있어요.",
  alternates: { canonical: "https://funjeju.com/cctv" },
  openGraph: {
    title: "제주 CCTV - FunJeju",
    description: "제주 전 지역 CCTV 목록 · 지도 · 멀티뷰",
    url: "https://funjeju.com/cctv",
    type: "website",
    locale: "ko_KR",
  },
  keywords: [
    "제주 실시간 CCTV",
    "제주 라이브캠",
    "제주도 라이브",
    "제주 실시간 영상",
    "협재해변 실시간",
    "함덕해변 실시간",
    "성산일출봉 실시간",
    "제주 날씨 실시간",
    "제주 파도",
    "제주 여행 CCTV",
    "한라산 라이브",
    "마라도 라이브",
    "우도 라이브",
    "제주 해변 실시간",
  ],
};

export default function CctvLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
