/** 퍼블릭 — 틀린그림찾기 점수 기록 + 랭킹 조회. GET 랭킹 / POST 기록 */
import { NextRequest, NextResponse } from "next/server";
import { addScore, topScores, getGame } from "@/lib/spot";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rankings = await topScores(id);
  return NextResponse.json({ rankings });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, timeMs } = (await req.json().catch(() => ({}))) as { name?: string; timeMs?: number };
  if (typeof timeMs !== "number" || timeMs <= 0) {
    return NextResponse.json({ error: "잘못된 기록" }, { status: 400 });
  }
  // 존재하는 문제만
  const game = await getGame(id);
  if (!game || game.status !== "published") {
    return NextResponse.json({ error: "문제를 찾을 수 없습니다." }, { status: 404 });
  }
  const rankings = await addScore({
    gameId: id,
    name: (name?.trim() || "익명").slice(0, 12),
    timeMs: Math.round(timeMs),
    createdAt: Date.now(),
  });
  return NextResponse.json({ ok: true, rankings });
}
