import { NextRequest, NextResponse } from "next/server";
import { listScraps, addScrap } from "@/lib/biz/minihompy-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 미니홈피 주인의 즐겨찾기(스크랩) 모음. TODO: 오너 인증 게이팅(현재 무인증 — 프리런치)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { return NextResponse.json({ scraps: await listScraps(slug) }); }
  catch (e) { console.error("[scrap GET]", e); return NextResponse.json({ scraps: [] }); }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const b = await req.json();
    if (!String(b.title || "").trim() && !String(b.url || "").trim() && !String(b.address || "").trim())
      return NextResponse.json({ error: "제목·링크·주소 중 하나는 입력해주세요" }, { status: 400 });
    const item = await addScrap(slug, { type: b.type, category: b.category, title: b.title, url: b.url, address: b.address });
    return NextResponse.json({ item });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "저장 실패" }, { status: 400 });
  }
}
