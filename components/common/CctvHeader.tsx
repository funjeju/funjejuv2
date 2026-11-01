"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Grid2X2, Map, Search } from "lucide-react";
import { AuthButton } from "@/components/common/AuthButton";
import { LangSwitcher } from "@/components/common/LangSwitcher";

export function CctvHeader() {
  const pathname = usePathname();
  return (
    <header className="editorial-header">
      <a href="#main-content" className="editorial-skip-link">본문으로 건너뛰기</a>
      <div className="editorial-header-inner">
        <Link href="/" aria-label="펀제주 홈" className="editorial-logo"><span aria-hidden="true">✳</span>funjeju<span className="editorial-logo-dot">.</span></Link>
        <nav aria-label="주 메뉴" className="editorial-nav">
          <Link href="/cctv" aria-current={pathname === "/cctv" || pathname === "/" ? "page" : undefined}>CCTV 둘러보기 <ArrowUpRight size={14} /></Link>
          <Link href="/cctv?view=map"><Map size={15} />제주 지도</Link>
          <Link href="/cctv/multiview" aria-current={pathname === "/cctv/multiview" ? "page" : undefined}><Grid2X2 size={15} />멀티뷰</Link>
        </nav>
        <div className="editorial-header-actions"><Link href="/search" aria-label="CCTV 검색" className="editorial-search-link"><Search size={20} /></Link><span className="editorial-language"><LangSwitcher compact /></span><AuthButton /></div>
      </div>
    </header>
  );
}
