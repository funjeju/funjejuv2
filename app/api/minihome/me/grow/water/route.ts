import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { waterGrow } from "@/lib/biz/grow-store";
import { awardXp } from "@/lib/biz/userhome-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await verifyFirebaseToken(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  try {
    const { growId } = await req.json();
    if (!growId) return NextResponse.json({ error: "대상이 없습니다" }, { status: 400 });
    const r = await waterGrow(auth.uid, String(growId));
    if (!r.ok) return NextResponse.json({ error: r.reason, nextWaterInMs: r.nextWaterInMs }, { status: 400 });
    const progress = await awardXp(auth.uid, 10); // 물주기 +10 XP
    return NextResponse.json({ grow: r.grow, progress });
  } catch (e) {
    console.error("[grow water]", e);
    return NextResponse.json({ error: "성장 실패" }, { status: 500 });
  }
}
