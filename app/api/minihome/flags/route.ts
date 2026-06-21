import { NextRequest, NextResponse } from "next/server";
import { upsertUserFlag, listFlags } from "@/lib/biz/flag-store";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { getOrCreateUserHome } from "@/lib/biz/userhome-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ flags: await listFlags() });
  } catch (e) {
    console.error("[flags GET]", e);
    return NextResponse.json({ flags: [] });
  }
}

// 1인 1깃발 — 로그인 필요. 레벨·미니미·이름은 내 계정 기준으로 반영.
export async function POST(req: NextRequest) {
  const auth = await verifyFirebaseToken(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  try {
    const body = await req.json();
    const home = await getOrCreateUserHome(auth.uid, auth.name);
    const flag = await upsertUserFlag(auth.uid, {
      name: body.name || home.displayName,
      lat: body.lat, lng: body.lng,
      minimi: body.minimi || home.minimi,
      concept: body.concept || home.concept,
      message: body.message,
      level: home.level,
    });
    return NextResponse.json({ flag });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "꽂기 실패";
    console.error("[flags POST]", msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
