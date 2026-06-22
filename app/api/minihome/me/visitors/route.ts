import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { listVisitors } from "@/lib/biz/minihompy-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await verifyFirebaseToken(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  try { return NextResponse.json({ visitors: await listVisitors(auth.uid, 20, "minihomes") }); }
  catch { return NextResponse.json({ visitors: [] }); }
}
