import { NextRequest, NextResponse } from "next/server";
import { listScraps } from "@/lib/biz/minihompy-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 공개 스크랩 조회 (방문자 모드)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  try { return NextResponse.json({ scraps: await listScraps(uid, 100, "minihomes") }); }
  catch { return NextResponse.json({ scraps: [] }); }
}
