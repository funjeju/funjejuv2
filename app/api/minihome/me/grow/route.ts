import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { listGrows, startGrow } from "@/lib/biz/grow-store";
import { listCampaigns } from "@/lib/biz/campaign-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await verifyFirebaseToken(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  try {
    const [grows, campaigns] = await Promise.all([listGrows(auth.uid), listCampaigns(true)]);
    return NextResponse.json({ grows, campaigns });
  } catch (e) {
    console.error("[grow GET]", e);
    return NextResponse.json({ grows: [], campaigns: [] });
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyFirebaseToken(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  try {
    const { campaignId } = await req.json();
    if (!campaignId) return NextResponse.json({ error: "캠페인을 선택해주세요" }, { status: 400 });
    const grow = await startGrow(auth.uid, String(campaignId));
    return NextResponse.json({ grow });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "시작 실패" }, { status: 400 });
  }
}
