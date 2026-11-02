import { NextRequest, NextResponse } from "next/server";
import { publicPreviewAccess } from "@/lib/cctv-public-preview-access";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (process.env.VERCEL_ENV === "preview") {
    // A narrow authenticated editor, not a blanket preview-admin exception.
    const read = req.method === "GET" || req.method === "HEAD";
    if (pathname === "/admin/cctv-directory" && read) {
      const secret = process.env.ADMIN_SECRET;
      if (!secret || req.cookies.get("admin_auth")?.value !== secret) {
        return NextResponse.redirect(new URL("/admin/login?next=%2Fadmin%2Fcctv-directory", req.url));
      }
      const response = NextResponse.next();
      response.headers.set("Cache-Control", "no-store");
      response.headers.set("X-Robots-Tag", "noindex, nofollow");
      return response;
    }
    const login = pathname === "/admin/login" && read;
    const session = pathname === "/api/admin/auth" && ["POST", "DELETE"].includes(req.method);
    const directoryApi = pathname === "/api/admin/cctv-directory" && ["GET", "HEAD", "POST"].includes(req.method);
    if (login || session || directoryApi) {
      // API handlers independently check existing admin authentication and CSRF.
      const response = NextResponse.next();
      response.headers.set("Cache-Control", "no-store");
      response.headers.set("X-Robots-Tag", "noindex, nofollow");
      return response;
    }
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
    if (!process.env.ADMIN_SECRET || cookie !== process.env.ADMIN_SECRET) {
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
