import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { bumpScrap } from "@/lib/biz/minihompy-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 스크랩(즐겨찾기) 카운트 +1. 로그인 필요. (실제 마이스팟 담기는 클라에서 addMySpot)
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const auth = await verifyFirebaseToken(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  const { slug } = await params;
  try { return NextResponse.json({ scrapCount: await bumpScrap(slug) }); }
  catch (e) { console.error("[scrap]", e); return NextResponse.json({ error: "실패" }, { status: 500 }); }
}
