export const sidebarItems = [
  { href: "/", label: "홈", icon: "🏠" },
  { href: "/cctv", label: "실시간 CCTV", icon: "📷" },
  { href: "/food", label: "도민맛집", icon: "🍽️" },
  { href: "/feed", label: "라이브 피드", icon: "🖼️" },
  { href: "/chat", label: "AI 도슨트 챗봇", icon: "🤖" },
  // { href: "/youtube", label: "Jeju Tube", icon: "▶️" },
  { href: "/trip-ai", label: "AI 여행 일정", icon: "🗓️" },
  { href: "/mypage", label: "마이페이지", icon: "👤" },
  { href: "/saved", label: "저장한 스팟", icon: "⭐" },
] as const;

export const bottomNavItems = [
  { href: "/", label: "홈", icon: "home" },
  { href: "/cctv", label: "CCTV", icon: "cctv" },
  { href: "/saved", label: "저장", icon: "saved" },
  { href: "/mypage", label: "마이", icon: "my" },
] as const;

// legacy alias
export const navigationItems = sidebarItems;
