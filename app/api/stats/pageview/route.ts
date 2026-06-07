import { NextRequest, NextResponse } from "next/server";
import { logPageView, type UserTier } from "@/lib/firestore-stats";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { path, userId, userTier } = await req.json() as {
      path: string;
      userId: string;
      userTier: UserTier;
    };

    if (!path) return NextResponse.json({ error: "path 필수" }, { status: 400 });

    // admin 로그는 제외 (관리자가 로그 보러 들어가는 게 통계에 잡히면 곤란)
    if (path.startsWith("/admin")) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    await logPageView({
      path,
      userId: userId || "anonymous",
      userTier: userTier || "anonymous",
      userAgent: req.headers.get("user-agent") ?? "",
      referer:   req.headers.get("referer") ?? "",
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
