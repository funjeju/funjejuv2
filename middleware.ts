import { NextRequest, NextResponse } from "next/server";
import { publicPreviewAccess } from "@/lib/cctv-public-preview-access";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (process.env.VERCEL_ENV === "preview") {
    const access = publicPreviewAccess(pathname, req.method);
    if (access === "deny") return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
    if (access === "cctv") return NextResponse.redirect(new URL("/cctv", req.url));
    const response = NextResponse.next();
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }

  // /admin/* 경로 보호 (login 페이지 제외)
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
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
  matcher: ["/((?!_next/static|_next/image).*)"],
};
