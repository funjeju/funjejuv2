"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Compass, Map, Search } from "lucide-react";
import { AuthButton } from "@/components/common/AuthButton";
import { LangSwitcher } from "@/components/common/LangSwitcher";
export function CctvHeader() {
 const pathname = usePathname();
 return <header className="wind-header"><a href="#main-content" className="editorial-skip-link">본문으로 건너뛰기</a><div className="wind-header-inner"><Link href="/" aria-label="펀제주 홈" className="wind-logo"><Compass size={28} strokeWidth={1.4} aria-hidden="true" /><span>FUNJEJU<span className="wind-logo-com">.com</span><small>제주를 여는 창</small></span></Link><nav aria-label="주 메뉴" className="wind-header-nav"><Link href="/cctv" aria-current={pathname === "/cctv" || pathname === "/" ? "page" : undefined}>제주 CCTV <ArrowUpRight size={13} aria-hidden="true" /></Link><Link href="/cctv?view=map"><Map size={14} aria-hidden="true" />CCTV 지도</Link><Link href="/mypage">즐겨찾기</Link></nav><div className="wind-header-actions"><Link href="/search" aria-label="CCTV 검색" className="wind-header-search"><Search size={18} aria-hidden="true" /></Link><span className="wind-language"><LangSwitcher compact /></span><AuthButton /></div></div></header>;
}
