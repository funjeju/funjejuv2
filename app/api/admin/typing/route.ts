/** 어드민 — 한컴타자 지문 관리. GET 목록 / POST 생성 / PUT 수정 / PATCH 발행 / DELETE */
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createPassage, updatePassage, listPassages, setPassagePublished, deletePassage } from "@/lib/typing";
import type { TypingPassage } from "@/types/typing";

export const runtime = "nodejs";

async function isAdmin(): Promise<boolean> {
  const c = await cookies();
  return c.get("admin_auth")?.value === process.env.ADMIN_SECRET;
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ items: await listPassages() });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as Partial<TypingPassage>;
  const text = (b.text ?? "").trim();
  if (text.length < 4) return NextResponse.json({ error: "지문이 너무 짧습니다." }, { status: 400 });
  const passage: TypingPassage = {
    id: crypto.randomUUID(),
    text,
    businessName: b.businessName?.trim() || undefined,
    homepageUrl: b.homepageUrl?.trim() || undefined,
    homepageName: b.homepageName?.trim() || undefined,
    kind: b.kind === "long" ? "long" : "short",
    weightW: b.weightW != null ? Number(b.weightW) : 1,
    maxAttempts: Math.max(0, Number(b.maxAttempts) || 0),
    status: "draft",
    createdAt: Date.now(),
    playCount: 0,
  };
  await createPassage(passage);
  return NextResponse.json({ ok: true, id: passage.id });
}

export async function PUT(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as Partial<TypingPassage> & { id?: string };
  if (!b.id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
  await updatePassage(b.id, {
    ...(b.text !== undefined && { text: b.text.trim() }),
    ...(b.businessName !== undefined && { businessName: b.businessName.trim() }),
    ...(b.homepageUrl !== undefined && { homepageUrl: b.homepageUrl.trim() }),
    ...(b.homepageName !== undefined && { homepageName: b.homepageName.trim() }),
    ...(b.kind === "short" || b.kind === "long" ? { kind: b.kind } : {}),
    ...(b.weightW !== undefined && { weightW: Number(b.weightW) }),
    ...(b.maxAttempts !== undefined && { maxAttempts: Math.max(0, Number(b.maxAttempts) || 0) }),
  });
  revalidatePath("/game/typing");
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, published } = (await req.json().catch(() => ({}))) as { id?: string; published?: boolean };
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
  await setPassagePublished(id, published !== false);
  revalidatePath("/game/typing");
  revalidatePath("/game/typing/[id]", "page");
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
  await deletePassage(id);
  return NextResponse.json({ ok: true });
}
