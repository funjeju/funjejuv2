/** 어드민 — 타자연습 묶음 세트 관리. GET 목록 / POST 생성 / PUT 수정 / PATCH 발행 / DELETE */
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createSet, updateSet, listSets, setSetPublished, deleteSet } from "@/lib/typing";
import type { TypingSet } from "@/types/typing";

export const runtime = "nodejs";

async function isAdmin(): Promise<boolean> {
  const c = await cookies();
  return c.get("admin_auth")?.value === process.env.ADMIN_SECRET;
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ items: await listSets() });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as Partial<TypingSet>;
  const passageIds = Array.isArray(b.passageIds) ? b.passageIds.filter(Boolean) : [];
  if (passageIds.length < 2) return NextResponse.json({ error: "지문을 2개 이상 골라주세요(권장 5개)." }, { status: 400 });
  const set: TypingSet = {
    id: crypto.randomUUID(),
    title: (b.title ?? "").trim() || "타자연습 세트",
    businessName: b.businessName?.trim() || undefined,
    homepageUrl: b.homepageUrl?.trim() || undefined,
    homepageName: b.homepageName?.trim() || undefined,
    passageIds,
    maxAttempts: Math.max(0, Number(b.maxAttempts) || 0),
    status: "draft",
    createdAt: Date.now(),
    playCount: 0,
  };
  await createSet(set);
  return NextResponse.json({ ok: true, id: set.id });
}

export async function PUT(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as Partial<TypingSet> & { id?: string };
  if (!b.id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
  await updateSet(b.id, {
    ...(b.title !== undefined && { title: b.title.trim() }),
    ...(b.businessName !== undefined && { businessName: b.businessName.trim() }),
    ...(b.homepageUrl !== undefined && { homepageUrl: b.homepageUrl.trim() }),
    ...(b.homepageName !== undefined && { homepageName: b.homepageName.trim() }),
    ...(Array.isArray(b.passageIds) && { passageIds: b.passageIds.filter(Boolean) }),
    ...(b.maxAttempts !== undefined && { maxAttempts: Math.max(0, Number(b.maxAttempts) || 0) }),
  });
  revalidatePath("/game/typing");
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, published } = (await req.json().catch(() => ({}))) as { id?: string; published?: boolean };
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
  await setSetPublished(id, published !== false);
  revalidatePath("/game/typing");
  revalidatePath("/game/typing/set/[id]", "page");
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
  await deleteSet(id);
  return NextResponse.json({ ok: true });
}
