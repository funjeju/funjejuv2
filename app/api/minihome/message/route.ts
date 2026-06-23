import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { listMessages, sendMessage } from "@/lib/biz/social-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await verifyFirebaseToken(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  try { return NextResponse.json({ messages: await listMessages(auth.uid) }); }
  catch { return NextResponse.json({ messages: [] }); }
}

export async function POST(req: NextRequest) {
  const auth = await verifyFirebaseToken(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  try {
    const { to, text } = await req.json();
    if (!to || !String(text || "").trim()) return NextResponse.json({ error: "받는사람/내용 필요" }, { status: 400 });
    await sendMessage(auth.uid, String(to), String(text), auth.name);
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "전송 실패" }, { status: 400 }); }
}
