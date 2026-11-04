import { NextRequest, NextResponse } from "next/server";
import { logDwell } from "@/lib/firestore-stats";

export const runtime = "nodejs";

/** 페이지를 떠날 때 보내는 체류시간 (hooks/usePageViewTracker.ts, sendBeacon) */
export async function POST(req: NextRequest) {
  try {
    const { path, sec, userId } = JSON.parse(await req.text()) as { path?: string; sec?: number; userId?: string };
    if (typeof path !== "string" || !path.startsWith("/") || typeof sec !== "number") {
      return NextResponse.json({ error: "path·sec 필수" }, { status: 400 });
    }
    // admin 화면은 통계 제외 (pageview와 같은 기준)
    if (path.startsWith("/admin")) return NextResponse.json({ ok: true, skipped: true });
    await logDwell(path, sec, typeof userId === "string" ? userId : undefined);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
