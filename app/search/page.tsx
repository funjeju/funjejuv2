import { Suspense } from "react";
import { CctvExplorer, ExplorerSkeleton } from "@/components/cctv/CctvExplorer";
import LegacySearchPage from "@/components/legacy/LegacySearchPage";
import { CCTV_FOCUSED_PUBLIC } from "@/constants/public-features";

export default function SearchPage() {
  if (!CCTV_FOCUSED_PUBLIC) return <LegacySearchPage />;
  return <Suspense fallback={<ExplorerSkeleton />}><CctvExplorer /></Suspense>;
}
