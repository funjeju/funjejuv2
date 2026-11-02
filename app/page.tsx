import { DirectoryExplorer } from "@/components/cctv/DirectoryExplorer";
import type { Metadata } from "next";
import { Suspense } from "react";
import { CctvExplorer, ExplorerSkeleton } from "@/components/cctv/CctvExplorer";
import LegacyHomePage from "@/components/legacy/LegacyHomePage";
import { CCTV_FOCUSED_PUBLIC } from "@/constants/public-features";

export const metadata: Metadata = {
  title: { absolute: "펀제주 — 지금, 제주를 가장 가까이 | 제주 CCTV" },
  description: "제주 해변, 한라산, 공항과 항구의 CCTV를 목록과 지도에서 찾아보세요. 지금 제주의 풍경과 재생 상태를 직접 확인할 수 있어요.",
  alternates: { canonical: "/" },
};
export const revalidate = false;
export default function HomePage() {
  if (process.env.VERCEL_ENV === "preview") return <Suspense fallback={<ExplorerSkeleton />}><DirectoryExplorer /></Suspense>;
  if (!CCTV_FOCUSED_PUBLIC) return <LegacyHomePage />;
  return <Suspense fallback={<ExplorerSkeleton />}><CctvExplorer /></Suspense>;
}
