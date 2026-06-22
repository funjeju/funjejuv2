import { NextRequest, NextResponse } from "next/server";
import { listGrows } from "@/lib/biz/grow-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 공개 키우기 조회 (방문자가 구경+응원)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  try { return NextResponse.json({ grows: await listGrows(uid) }); }
  catch { return NextResponse.json({ grows: [] }); }
}
