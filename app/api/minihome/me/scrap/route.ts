import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { listScraps, addScrap } from "@/lib/biz/minihompy-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await verifyFirebaseToken(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  try { return NextResponse.json({ scraps: await listScraps(auth.uid, 100, "minihomes") }); }
  catch { return NextResponse.json({ scraps: [] }); }
}

export async function POST(req: NextRequest) {
  const auth = await verifyFirebaseToken(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  try {
    const b = await req.json();
    if (!String(b.title || "").trim() && !String(b.url || "").trim() && !String(b.address || "").trim())
      return NextResponse.json({ error: "제목·링크·주소 중 하나는 입력해주세요" }, { status: 400 });
    const item = await addScrap(auth.uid, { type: b.type, category: b.category, title: b.title, url: b.url, address: b.address }, "minihomes");
    return NextResponse.json({ item });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "저장 실패" }, { status: 400 }); }
}
