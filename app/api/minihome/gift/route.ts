import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { giftBomal } from "@/lib/biz/social-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await verifyFirebaseToken(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  try {
    const { to, bomal, msg } = await req.json();
    if (!to) return NextResponse.json({ error: "대상이 없습니다" }, { status: 400 });
    const r = await giftBomal(auth.uid, String(to), Number(bomal), String(msg || ""));
    if (!r.ok) return NextResponse.json({ error: r.reason }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "선물 실패" }, { status: 400 }); }
}
