import { NextRequest, NextResponse } from "next/server";
import { listDiary, addDiary } from "@/lib/biz/minihompy-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { return NextResponse.json({ entries: await listDiary(slug) }); }
  catch (e) { console.error("[diary GET]", e); return NextResponse.json({ entries: [] }); }
}

// TODO: 오너 인증 게이팅(현재 무인증 — 프리런치)
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const { date, text } = await req.json();
    if (!text || !String(text).trim()) return NextResponse.json({ error: "내용이 비어있습니다" }, { status: 400 });
    const entry = await addDiary(slug, String(date || new Date().toISOString().slice(0, 10)), String(text));
    return NextResponse.json({ entry });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "저장 실패" }, { status: 400 });
  }
}
