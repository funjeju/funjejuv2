import { DirectoryExplorer } from "@/components/cctv/DirectoryExplorer";
import { Suspense } from "react";
import { CctvExplorer, ExplorerSkeleton } from "@/components/cctv/CctvExplorer";
import LegacyCctvPage from "@/components/legacy/LegacyCctvPage";
import { CCTV_FOCUSED_PUBLIC } from "@/constants/public-features";

export default function CctvPage() {
  if (process.env.VERCEL_ENV === "preview") return <Suspense fallback={<ExplorerSkeleton />}><DirectoryExplorer /></Suspense>;
  if (!CCTV_FOCUSED_PUBLIC) return <LegacyCctvPage />;
  return <Suspense fallback={<ExplorerSkeleton />}><CctvExplorer /></Suspense>;
}
