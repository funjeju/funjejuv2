"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DolmangyiIcon } from "@/components/common/DolmangyiIcon";

/**
 * 모바일 전용 플로팅 챗봇 버튼.
 * 우하단에 떠 있다가 탭하면 도슨트 챗봇(/chat)으로 이동.
 * 하단 네비(h-16)와 안 겹치도록 bottom-20에 배치.
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
      className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-orange shadow-lg ring-2 ring-white/70 active:scale-95 transition-transform md:hidden"
    >
      <DolmangyiIcon size={40} />
    </Link>
  );
}
