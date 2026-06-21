import { NextRequest, NextResponse } from "next/server";
import { addGuestPost, listGuestPosts } from "@/lib/biz/minihompy-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    return NextResponse.json({ posts: await listGuestPosts(slug) });
  } catch (e) {
    console.error("[guestbook GET]", e);
    return NextResponse.json({ posts: [] });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const { name, text } = await req.json();
    if (!text || !String(text).trim()) {
      return NextResponse.json({ error: "내용이 비어있습니다" }, { status: 400 });
    }
    const post = await addGuestPost(slug, String(name ?? ""), String(text));
    return NextResponse.json({ post });
  } catch (e) {
    console.error("[guestbook POST]", e);
    return NextResponse.json({ error: "저장 실패" }, { status: 500 });
  }
}
