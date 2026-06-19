import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "제주 실시간 CCTV 40곳 - 라이브캠 전체보기",
  description:
    "제주도 전 지역 40개 실시간 CCTV를 한곳에서. 협재해변, 함덕해변, 성산일출봉, 중문, 우도, 마라도 등 제주 주요 명소의 라이브 영상으로 지금 날씨와 현장을 확인하세요. 무료 24시간 스트리밍.",
  alternates: { canonical: "https://www.funjeju.com/cctv" },
  openGraph: {
    title: "제주 실시간 CCTV 40곳 - FunJeju 라이브캠",
    description: "제주 전 지역 라이브캠 무료 스트리밍",
    url: "https://www.funjeju.com/cctv",
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
