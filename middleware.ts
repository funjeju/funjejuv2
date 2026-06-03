import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // /admin/* 경로 보호
  if (pathname.startsWith("/admin")) {
    const cookie = req.cookies.get("admin_auth")?.value;
    if (cookie !== process.env.ADMIN_SECRET) {
      // 로그인 페이지로 리다이렉트
      const loginUrl = new URL("/admin/login", req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
