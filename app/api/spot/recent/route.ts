/**
 * 공개 — 최근 발행된 틀린그림찾기 게임 N개 (클라이언트 컴포넌트용, 예: 멀티뷰 배너).
 */
import { NextRequest, NextResponse } from "next/server";
import { listGames } from "@/lib/spot";

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET(req: NextRequest) {
  const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get("limit") ?? "3") || 3, 1), 10);
  try {
    const games = await listGames({ publishedOnly: true, limit });
    return NextResponse.json({ games });
  } catch {
    return NextResponse.json({ games: [] });
  }
}
