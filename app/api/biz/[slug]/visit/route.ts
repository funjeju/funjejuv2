import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { bumpVisit } from "@/lib/biz/minihompy-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 미니홈피 방문 카운트 (공개). 로그인 토큰이 있으면 접속로그(방문자)도 기록.
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const auth = await verifyFirebaseToken(req.headers.get("authorization"));
    const visitor = auth ? { uid: auth.uid, name: auth.name || "여행자" } : undefined;
    return NextResponse.json(await bumpVisit(slug, visitor));
  } catch (e) {
    console.error("[visit]", e);
    return NextResponse.json({ today: 0, total: 0 });
  }
}
