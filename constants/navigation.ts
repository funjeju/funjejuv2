export const sidebarItems = [
  { href: "/cctv", label: "실시간 CCTV", icon: "📷" },
  { href: "/cctv/multiview", label: "멀티뷰", icon: "📺" },
  { href: "/mypage", label: "마이페이지", icon: "👤" },
] as const;
export const bottomNavItems = [
  { href: "/cctv", label: "CCTV", icon: "cctv" },
  { href: "/cctv/multiview", label: "멀티뷰", icon: "cctv" },
  { href: "/mypage", label: "마이", icon: "my" },
] as const;
export const navigationItems = sidebarItems;
