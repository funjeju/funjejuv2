import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { listIlchons, listIlchonRequests, requestIlchon } from "@/lib/biz/social-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await verifyFirebaseToken(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  try {
    const [ilchons, requests] = await Promise.all([listIlchons(auth.uid), listIlchonRequests(auth.uid)]);
    return NextResponse.json({ ilchons, requests });
  } catch { return NextResponse.json({ ilchons: [], requests: [] }); }
}

export async function POST(req: NextRequest) {
  const auth = await verifyFirebaseToken(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  try {
    const { to } = await req.json();
    if (!to) return NextResponse.json({ error: "대상이 없습니다" }, { status: 400 });
    const r = await requestIlchon(auth.uid, String(to));
    if (!r.ok) return NextResponse.json({ error: r.reason }, { status: 400 });
    return NextResponse.json({ ok: true, message: r.reason });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "신청 실패" }, { status: 400 }); }
}
