import { NextRequest, NextResponse } from "next/server";
import { saveMiniHompyConfig } from "@/lib/biz/minihompy-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 미니미/방컨셉 저장. TODO: 오너 인증 게이팅(현재 무인증 — 프리런치).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const body = await req.json();
    const config = await saveMiniHompyConfig(slug, { minimi: body.minimi, roomConcept: body.roomConcept });
    return NextResponse.json({ ok: true, config });
  } catch (e) {
    console.error("[minihompy PATCH]", e);
    return NextResponse.json({ error: "저장 실패" }, { status: 500 });
  }
}
