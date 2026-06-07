import { NextRequest, NextResponse } from "next/server";
import { upsertSession, type UserTier } from "@/lib/firestore-stats";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { sessionId, userId, userTier, cctvId, cctvName } = await req.json() as {
      sessionId: string;
      userId: string;
      userTier: UserTier;
      cctvId: string;
      cctvName: string;
    };

    if (!sessionId || !cctvId) {
      return NextResponse.json({ error: "필수 파라미터 누락" }, { status: 400 });
    }

    await upsertSession({
      sessionId,
      userId: userId || `anon_${sessionId.slice(0, 8)}`,
      userTier: userTier || "anonymous",
      cctvId,
      cctvName: cctvName || "",
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
