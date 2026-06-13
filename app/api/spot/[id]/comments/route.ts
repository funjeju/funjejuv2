/**
 * 틀린그림찾기 댓글 — 클리어한 플레이어만 작성/열람.
 * GET: 댓글 목록 (클라이언트는 클리어 후에만 호출)
 * POST: 댓글 작성 { name, text, cleared: true }
 */
import { NextRequest, NextResponse } from "next/server";
import { addComment, listComments, getGame } from "@/lib/spot";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const comments = await listComments(id);
  return NextResponse.json({ comments });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, text, cleared } = (await req.json().catch(() => ({}))) as {
    name?: string;
    text?: string;
    cleared?: boolean;
  };

  // 클리어한 플레이어만 작성 가능 (스포일러 방지)
  if (!cleared) {
    return NextResponse.json({ error: "문제를 모두 푼 뒤에 댓글을 남길 수 있어요." }, { status: 403 });
  }
  const body = (text ?? "").trim();
  if (!body) return NextResponse.json({ error: "댓글을 입력해주세요." }, { status: 400 });

  const game = await getGame(id);
  if (!game || game.status !== "published") {
    return NextResponse.json({ error: "문제를 찾을 수 없습니다." }, { status: 404 });
  }

  const comments = await addComment({
    gameId: id,
    name: (name?.trim() || "익명").slice(0, 12),
    text: body.slice(0, 300),
    createdAt: Date.now(),
  });
  return NextResponse.json({ ok: true, comments });
}
