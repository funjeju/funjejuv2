import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { buyItem } from "@/lib/biz/userhome-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await verifyFirebaseToken(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  try {
    const { itemId } = await req.json();
    if (!itemId) return NextResponse.json({ error: "상품을 선택해주세요" }, { status: 400 });
    const result = await buyItem(auth.uid, String(itemId), auth.name);
    if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 400 });
    return NextResponse.json({ home: result.home });
  } catch (e) {
    console.error("[minihome/me/buy]", e);
    return NextResponse.json({ error: "구매 실패" }, { status: 500 });
  }
}
