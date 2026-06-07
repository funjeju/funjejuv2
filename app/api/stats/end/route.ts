import { NextRequest, NextResponse } from "next/server";
import { endSession } from "@/lib/firestore-stats";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json() as { sessionId: string };
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId 필수" }, { status: 400 });
    }
    await endSession(sessionId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
