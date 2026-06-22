import { NextRequest, NextResponse } from "next/server";
import { listDiary } from "@/lib/biz/minihompy-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 공개 다이어리 조회 (방문자 모드)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  try { return NextResponse.json({ entries: await listDiary(uid, 80, "minihomes") }); }
  catch { return NextResponse.json({ entries: [] }); }
}
