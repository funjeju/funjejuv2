/**
 * funjeju.com 공개 화면 모드 (2026-11-02~).
 *
 * true  → 공개 화면은 CCTV 별자리(/), 업소 홍보 랜딩(/promo), 영상 새 창(/watch/*)만 연다.
 *         나머지 공개 경로는 middleware.ts 가 / 로 돌려보낸다(307, 임시).
 *         기존 페이지·API·데이터는 지우지 않고 그대로 둔다. 관리자(/admin)와 업소 홈페이지(/biz/*)는 계속 열린다.
 * false → 원래 펀제주 전체 화면으로 복귀(원래 홈은 components/legacy/LegacyHomePage.tsx).
 */
export const SKY_ONLY_PUBLIC = true;

/** SKY_ONLY_PUBLIC 일 때 열어 두는 공개 경로 */
export function isSkyPublicPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/promo" ||
    pathname.startsWith("/watch/") ||
    pathname.startsWith("/biz/")
  );
}

/** funjeju 공통 레이아웃(사이드바·헤더·챗봇·공지 팝업) 없이 전체 화면으로 그리는 경로 */
export function isSkyBarePath(pathname: string): boolean {
  return SKY_ONLY_PUBLIC && (pathname === "/" || pathname === "/promo" || pathname.startsWith("/watch/"));
}
