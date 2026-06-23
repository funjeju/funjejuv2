/**
 * 어드민 — 반려본을 자연어 지시로 AI 재작성.
 * POST { id, note } → AI가 지시 반영 재작성 → 같은 id로 draft 저장(발행은 PATCH로 별도).
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getContentById, createContent } from "@/lib/contents";
import { reviseWithNote } from "@/lib/content-review";

export const runtime = "nodejs";
export const maxDuration = 120;

async function isAdmin(): Promise<boolean> {
  const c = await cookies();
  return c.get("admin_auth")?.value === process.env.ADMIN_SECRET;
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, note } = (await req.json().catch(() => ({}))) as { id?: string; note?: string };
  if (!id || !note?.trim()) return NextResponse.json({ error: "id와 수정 지시(note)가 필요합니다" }, { status: 400 });

  const content = await getContentById(id);
  if (!content) return NextResponse.json({ error: "콘텐츠 없음" }, { status: 404 });

  try {
    const revised = await reviseWithNote(content, note.trim());
    await createContent(revised); // 같은 id로 set → in-place 갱신(draft 유지)
    return NextResponse.json({ ok: true, id: revised.id, slug: revised.slug, title: revised.title, sections: revised.sections.length });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
