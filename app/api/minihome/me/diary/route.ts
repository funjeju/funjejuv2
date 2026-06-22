import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { listDiary, addDiary } from "@/lib/biz/minihompy-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await verifyFirebaseToken(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  try { return NextResponse.json({ entries: await listDiary(auth.uid, 80, "minihomes") }); }
  catch { return NextResponse.json({ entries: [] }); }
}

export async function POST(req: NextRequest) {
  const auth = await verifyFirebaseToken(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  try {
    const { date, text } = await req.json();
    if (!text || !String(text).trim()) return NextResponse.json({ error: "내용이 비어있습니다" }, { status: 400 });
    const entry = await addDiary(auth.uid, String(date || new Date().toISOString().slice(0, 10)), String(text), "minihomes");
    return NextResponse.json({ entry });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "저장 실패" }, { status: 400 }); }
}
