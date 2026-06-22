import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { bumpVisit } from "@/lib/biz/minihompy-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 유저 미니홈 방문 카운트 + 접속로그(로그인 시). 자기 집은 카운트 안 함.
export async function POST(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  try {
    const auth = await verifyFirebaseToken(req.headers.get("authorization"));
    if (auth && auth.uid === uid) return NextResponse.json({ skipped: "self" });
    const visitor = auth ? { uid: auth.uid, name: auth.name || "여행자" } : undefined;
    return NextResponse.json(await bumpVisit(uid, visitor, "minihomes"));
  } catch (e) { console.error("[u visit]", e); return NextResponse.json({ today: 0, total: 0 }); }
}
