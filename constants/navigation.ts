export const sidebarItems = [
  { href: "/",        label: "홈",          icon: "🏠" },
  { href: "/cctv",    label: "실시간 CCTV", icon: "📷" },
  // { href: "/places",  label: "탐색",        icon: "🧭" },  // 데이터 품질 이슈로 임시 숨김 (페이지는 보존)
  { href: "/feed",    label: "라이브 피드", icon: "🖼️" },
  { href: "/food",    label: "도민맛집",    icon: "🍽️" },
  { href: "/chat",    label: "AI 도슨트 챗봇", icon: "🤖" },
  { href: "/youtube", label: "제주tube",    icon: "▶️" },
  { href: "/trip-ai", label: "AI 여행 일정", icon: "🗓️" },
  { href: "/game/spot", label: "틀린그림찾기", icon: "🔍" },
  { href: "/pricing", label: "요금제",       icon: "💎" },
  { href: "/mypage",  label: "마이페이지",  icon: "👤" },
] as const;

export const bottomNavItems = [
  { href: "/",       label: "홈",   icon: "home" },
  { href: "/cctv",   label: "CCTV", icon: "cctv" },
  { href: "/feed",   label: "피드", icon: "feed" },
  { href: "/mypage", label: "마이", icon: "my"   },
] as const;

// legacy alias
export const navigationItems = sidebarItems;
