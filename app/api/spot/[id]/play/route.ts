/** 플레이 횟수 카운트 — 게임 시작(마운트) 시 1회 호출. */
import { NextRequest, NextResponse } from "next/server";
import { incrementPlay } from "@/lib/spot";

export const runtime = "nodejs";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await incrementPlay(id);
  return NextResponse.json({ ok: true });
}
