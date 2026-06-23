import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { setIlchonNickname } from "@/lib/biz/social-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await verifyFirebaseToken(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  try {
    const { uid, nickname } = await req.json();
    if (!uid) return NextResponse.json({ error: "대상이 없습니다" }, { status: 400 });
    await setIlchonNickname(auth.uid, String(uid), String(nickname || "일촌"));
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "저장 실패" }, { status: 400 }); }
}
