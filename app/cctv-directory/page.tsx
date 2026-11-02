import { Suspense } from "react";
import { DirectoryExplorer } from "@/components/cctv/DirectoryExplorer";
export const metadata = { title: "전체 CCTV 목록 · 새 시스템", robots: {index:false,follow:false} };
export default function CctvDirectoryPage() {
  return <Suspense fallback={<p className="p-10">전체 목록을 준비하고 있어요.</p>}><DirectoryExplorer/></Suspense>;
}
