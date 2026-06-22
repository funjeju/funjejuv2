import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { listGuestPosts, addGuestPost } from "@/lib/biz/minihompy-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 유저 미니홈 방명록 — 공개 조회, 로그인 작성
export async function GET(_req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  try { return NextResponse.json({ posts: await listGuestPosts(uid, 50, "minihomes") }); }
  catch { return NextResponse.json({ posts: [] }); }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  const auth = await verifyFirebaseToken(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  const { uid } = await params;
  try {
    const { text } = await req.json();
    if (!text || !String(text).trim()) return NextResponse.json({ error: "내용이 비어있습니다" }, { status: 400 });
    const post = await addGuestPost(uid, auth.name || "여행자", String(text), "minihomes");
    return NextResponse.json({ post });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "저장 실패" }, { status: 400 }); }
}
