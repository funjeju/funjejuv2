import { NextRequest, NextResponse } from "next/server";
import { getPublicHome } from "@/lib/biz/userhome-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 공개 미니홈 조회 (방문자 모드용)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  try {
    const home = await getPublicHome(uid);
    if (!home) return NextResponse.json({ error: "없는 미니홈피" }, { status: 404 });
    return NextResponse.json({ home });
  } catch (e) {
    console.error("[u home]", e);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
}
