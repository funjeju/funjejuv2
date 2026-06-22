import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { getOrCreateUserHome, updateUserHome } from "@/lib/biz/userhome-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await verifyFirebaseToken(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  try {
    const home = await getOrCreateUserHome(auth.uid, auth.name);
    return NextResponse.json({ home });
  } catch (e) {
    console.error("[minihome/me GET]", e);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await verifyFirebaseToken(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  try {
    const body = await req.json();
    const r = await updateUserHome(auth.uid, { minimi: body.minimi, concept: body.concept, background: body.background, specialMinimi: body.specialMinimi });
    if (!r.ok) return NextResponse.json({ error: r.reason, nextChangeAt: r.nextChangeAt }, { status: 429 });
    const home = await getOrCreateUserHome(auth.uid, auth.name);
    return NextResponse.json({ home });
  } catch (e) {
    console.error("[minihome/me PATCH]", e);
    return NextResponse.json({ error: "저장 실패" }, { status: 500 });
  }
}
