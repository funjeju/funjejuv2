import { NextResponse } from "next/server";
import { listFlags } from "@/lib/biz/flag-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 파도타기 — 지도에 깃발 꽂은 미니홈피 중 랜덤 1곳
export async function GET() {
  try {
    const flags = await listFlags(500);
    if (!flags.length) return NextResponse.json({ uid: null });
    const f = flags[Math.floor(Math.random() * flags.length)];
    return NextResponse.json({ uid: f.id, name: f.name });
  } catch { return NextResponse.json({ uid: null }); }
}
