import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { cheerGrow } from "@/lib/biz/grow-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 응원 — 로그인 필요(스팸 방지). 방문자가 남의 키우기에 👏.
export async function POST(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  const auth = await verifyFirebaseToken(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  const { uid } = await params;
  try {
    const { growId } = await req.json();
    if (!growId) return NextResponse.json({ error: "대상이 없습니다" }, { status: 400 });
    const cheers = await cheerGrow(uid, String(growId), auth.uid);
    return NextResponse.json({ cheers });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "응원 실패" }, { status: 400 });
  }
}
