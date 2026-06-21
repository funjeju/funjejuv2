"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DolmangyiIcon } from "@/components/common/DolmangyiIcon";

/**
 * 전역 플로팅 챗봇 버튼 (PC·모바일 공통).
 * 우하단에 마스코트 + "무엇이든 물어보살" 말풍선. 탭하면 도슨트 챗봇(/chat)으로.
 * 모바일은 하단 네비(h-16) 위(bottom-20), PC는 bottom-6.
 */
export function FloatingChat() {
  const pathname = usePathname();

  // 챗봇 화면 자체나 독립 레이아웃에선 숨김
  if (pathname.startsWith("/chat") || pathname.startsWith("/admin") || pathname.startsWith("/biz/")) {
    return null;
  }

  return (
    <Link
      href="/chat"
      aria-label="도슨트 챗봇 열기"
      className="fixed bottom-20 right-4 z-40 flex items-center gap-2 transition-transform active:scale-95 md:bottom-6"
    >
      <span className="whitespace-nowrap rounded-full bg-white px-3 py-2 text-xs font-bold text-brand-navy shadow-lg ring-1 ring-black/5">
        무엇이든 물어보살 🔮
      </span>
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-orange shadow-lg ring-2 ring-white/70">
        <DolmangyiIcon size={40} />
      </span>
    </Link>
  );
}
