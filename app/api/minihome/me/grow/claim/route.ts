import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { claimReward } from "@/lib/biz/grow-store";
import { awardXp } from "@/lib/biz/userhome-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await verifyFirebaseToken(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  try {
    const { growId } = await req.json();
    if (!growId) return NextResponse.json({ error: "대상이 없습니다" }, { status: 400 });
    const r = await claimReward(auth.uid, String(growId));
    if (!r.ok) return NextResponse.json({ error: r.reason }, { status: 400 });
    const progress = await awardXp(auth.uid, 30); // 완성 +30 XP (보말은 claimReward에서 이미 가산)
    return NextResponse.json({ reward: r.reward, bomal: progress.bomal, progress });
  } catch (e) {
    console.error("[grow claim]", e);
    return NextResponse.json({ error: "보상 실패" }, { status: 500 });
  }
}
