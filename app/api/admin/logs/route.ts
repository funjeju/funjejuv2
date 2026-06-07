import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getRecentViewLogs, getRecentPageViews } from "@/lib/firestore-stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_auth")?.value !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const type   = req.nextUrl.searchParams.get("type") ?? "views"; // views | pages
  const limit  = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? "200"), 500);

  try {
    if (type === "pages") {
      const logs = await getRecentPageViews(limit);
      return NextResponse.json({ logs });
    }
    const logs = await getRecentViewLogs(limit);
    return NextResponse.json({ logs });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
