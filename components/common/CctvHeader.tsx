"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, Grid2X2, Map, Search } from "lucide-react";
import { AuthButton } from "@/components/common/AuthButton";
import { LangSwitcher } from "@/components/common/LangSwitcher";
import { DolmangyiIcon } from "@/components/common/DolmangyiIcon";

export function CctvHeader() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-[#deddd3] bg-[#fbfaf5]/95 backdrop-blur-xl">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3">본문으로 건너뛰기</a>
      <div className="mx-auto flex min-h-20 max-w-7xl flex-wrap items-center justify-between gap-x-5 gap-y-3 px-5 py-4 md:px-9">
        <Link href="/" aria-label="펀제주 홈" className="flex items-center gap-2.5">
          <DolmangyiIcon size={38} />
          <span className="text-2xl font-black tracking-[-1.5px] text-[#254b40]">fun<span className="text-[#ef623e]">jeju</span><span className="ml-1 text-[#ef623e]">.</span></span>
          <span className="ml-3 hidden border-l border-[#deddd3] pl-4 text-[11px] leading-5 text-[#6a766e] lg:block">지금, 제주를<br />가장 가까이</span>
        </Link>
        <nav aria-label="주 메뉴" className="order-3 flex w-full items-center justify-center gap-5 text-xs font-bold text-[#506259] md:order-none md:w-auto md:gap-7 md:text-sm">
          <Link href="/cctv" aria-current={pathname === "/cctv" ? "page" : undefined} className="flex items-center gap-1.5 hover:text-[#e95f3c]"><Camera size={16} /> CCTV 목록</Link>
          <Link href="/cctv?view=map" className="flex items-center gap-1.5 hover:text-[#e95f3c]"><Map size={16} /> 지도로 보기</Link>
          <Link href="/cctv/multiview" aria-current={pathname === "/cctv/multiview" ? "page" : undefined} className="flex items-center gap-1.5 hover:text-[#e95f3c]"><Grid2X2 size={16} /> 멀티뷰</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/search" aria-label="CCTV 검색" className="rounded-full p-2 text-[#385a4e] hover:bg-[#e9ede3]"><Search size={19} /></Link>
          <span className="hidden sm:block"><LangSwitcher compact /></span>
          <AuthButton />
        </div>
      </div>
    </header>
  );
}
