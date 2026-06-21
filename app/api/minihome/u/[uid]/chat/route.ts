import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { listChat, postChat, touchPresence, onlineCount } from "@/lib/biz/chat-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 채팅 조회(공개) — 메시지 + 현재 접속자 수
export async function GET(_req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  try {
    const [messages, online] = await Promise.all([listChat(uid), onlineCount(uid)]);
    return NextResponse.json({ messages, online });
  } catch (e) {
    console.error("[chat GET]", e);
    return NextResponse.json({ messages: [], online: 0 });
  }
}

// 접속 핑(ping) 또는 메시지 전송 — 로그인 필요
export async function POST(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  const auth = await verifyFirebaseToken(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  const { uid } = await params;
  try {
    const body = await req.json().catch(() => ({}));
    const name = auth.name || "여행자";
    await touchPresence(uid, auth.uid, name); // 핑/전송 모두 접속 갱신
    if (body.ping) return NextResponse.json({ ok: true });
    if (!body.text || !String(body.text).trim()) return NextResponse.json({ error: "내용이 비어있습니다" }, { status: 400 });
    const msg = await postChat(uid, auth.uid, name, String(body.text));
    return NextResponse.json({ msg });
  } catch (e) {
    console.error("[chat POST]", e);
    return NextResponse.json({ error: "전송 실패" }, { status: 500 });
  }
}
