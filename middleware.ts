import { NextRequest, NextResponse } from "next/server";
import { SKY_ONLY_PUBLIC, isSkyPublicPath } from "@/constants/public-mode";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // /admin/* 경로 보호 (login 페이지 제외)
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const cookie = req.cookies.get("admin_auth")?.value;
    if (cookie !== process.env.ADMIN_SECRET) {
      // 로그인 페이지로 리다이렉트
      const loginUrl = new URL("/admin/login", req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // CCTV 전용 공개 모드 — 별자리(/)·홍보 랜딩·영상 새 창 외의 공개 화면은 / 로 (임시 307, 페이지는 지우지 않음)
  if (SKY_ONLY_PUBLIC && !pathname.startsWith("/admin") && !isSkyPublicPath(pathname)) {
    return NextResponse.redirect(new URL("/", req.url), 307);
  }

  return NextResponse.next();
}

export const config = {
  // _next 정적 파일, API, 확장자가 있는 파일(robots.txt, sitemap.xml, 이미지 등)은 건너뛴다
  // 이전 값: matcher: ["/admin/:path*"],
  matcher: ["/((?!_next/|api/|.*\\.[a-zA-Z0-9]+$).*)"],
};
