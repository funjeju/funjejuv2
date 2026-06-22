import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { setBgm } from "@/lib/biz/userhome-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await verifyFirebaseToken(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  try {
    const { url } = await req.json();
    await setBgm(auth.uid, String(url || ""));
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "저장 실패" }, { status: 400 }); }
}
