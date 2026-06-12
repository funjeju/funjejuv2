import { NextRequest, NextResponse } from "next/server";
import { recordHeartbeat, type UserTier } from "@/lib/firestore-stats";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { sessionId, userId, userTier, cctvId, cctvName, activeStreams } = await req.json() as {
      sessionId: string;
      userId: string;
      userTier: UserTier;
      cctvId: string;
      cctvName: string;
      activeStreams?: number;
    };

    if (!sessionId || !cctvId) {
      return NextResponse.json({ error: "필수 파라미터 누락" }, { status: 400 });
    }

    // 세션 추적 + 계정 단위 시청예산 누적·판정을 한 번에
    const budget = await recordHeartbeat({
      sessionId,
      userId: userId || `anon_${sessionId.slice(0, 8)}`,
      userTier: userTier || "anonymous",
      cctvId,
      cctvName: cctvName || "",
      activeStreams: typeof activeStreams === "number" ? activeStreams : 1,
    });

    return NextResponse.json({ ok: true, budget });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
