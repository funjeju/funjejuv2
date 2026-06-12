/**
 * 어드민 — 콘텐츠(웹진/브리핑) 검수·발행 관리.
 *  GET    ?status=draft|published → 목록
 *  PATCH  { id } → 발행(draft→published)
 *  DELETE ?id=   → 삭제
 *  POST   → 웹진 draft 즉시 생성(수동 트리거, 크론과 동일 파이프라인)
 */

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { listContents, publishContent, deleteContent, createContent, getContentById } from "@/lib/contents";
import { pickWebzineTopic, generateWebzineDraft } from "@/lib/webzine-ai";
import { generateBriefingDraft } from "@/lib/briefing-ai";
import type { ContentStatus } from "@/types/content";

export const runtime = "nodejs";
export const maxDuration = 120;

async function isAdmin(): Promise<boolean> {
  const c = await cookies();
  return c.get("admin_auth")?.value === process.env.ADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const status = req.nextUrl.searchParams.get("status") as ContentStatus | null;
  const items = await listContents({ status: status ?? undefined });
  return NextResponse.json({ count: items.length, items });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
  await publishContent(id);
  // 즉시 ISR 캐시 무효화 (revalidate=3600 대기 없이 바로 반영)
  revalidatePath("/webzine");
  revalidatePath("/webzine/[slug]", "page");
  revalidatePath("/");
  const content = await getContentById(id);
  if (content?.slug) revalidatePath(`/webzine/${content.slug}`);
  return NextResponse.json({ ok: true, id, status: "published" });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
  await deleteContent(id);
  return NextResponse.json({ ok: true, id });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const type = req.nextUrl.searchParams.get("type"); // "briefing" | (기본) "webzine"

  if (type === "briefing") {
    const draft = await generateBriefingDraft();
    await createContent(draft);
    return NextResponse.json({ ok: true, id: draft.id, slug: draft.slug, title: draft.title });
  }

  const topic = await pickWebzineTopic();
  if (!topic) return NextResponse.json({ error: "토픽 없음" }, { status: 200 });
  const draft = await generateWebzineDraft(topic);
  await createContent(draft);
  return NextResponse.json({ ok: true, id: draft.id, slug: draft.slug, title: draft.title });
}
