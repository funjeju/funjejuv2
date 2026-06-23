import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { acceptIlchon } from "@/lib/biz/social-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await verifyFirebaseToken(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  try {
    const { from } = await req.json();
    if (!from) return NextResponse.json({ error: "대상이 없습니다" }, { status: 400 });
    await acceptIlchon(auth.uid, String(from));
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "수락 실패" }, { status: 400 }); }
}
