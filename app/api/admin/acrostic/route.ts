/** 어드민 — 삼행시 주제 관리. GET 목록 / POST 생성 / PUT 수정 / PATCH 발행 / DELETE */
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createTopic, updateTopic, listTopics, setTopicPublished, deleteTopic } from "@/lib/acrostic";
import type { AcrosticTopic } from "@/types/acrostic";

export const runtime = "nodejs";

async function isAdmin(): Promise<boolean> {
  const c = await cookies();
  return c.get("admin_auth")?.value === process.env.ADMIN_SECRET;
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ items: await listTopics() });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as Partial<AcrosticTopic>;
  const word = (b.word ?? "").trim();
  if (!word) return NextResponse.json({ error: "주제 단어가 필요합니다." }, { status: 400 });
  const topic: AcrosticTopic = {
    id: crypto.randomUUID(),
    word,
    businessName: b.businessName?.trim() || undefined,
    homepageUrl: b.homepageUrl?.trim() || undefined,
    homepageName: b.homepageName?.trim() || undefined,
    image: b.image || undefined,
    maxEntriesPerUser: Math.max(1, Number(b.maxEntriesPerUser) || 1),
    status: "draft",
    createdAt: Date.now(),
    endsAt: b.endsAt || undefined,
    entryCount: 0,
  };
  await createTopic(topic);
  return NextResponse.json({ ok: true, id: topic.id });
}

export async function PUT(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as Partial<AcrosticTopic> & { id?: string };
  if (!b.id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
  await updateTopic(b.id, {
    ...(b.word !== undefined && { word: b.word.trim() }),
    ...(b.businessName !== undefined && { businessName: b.businessName.trim() }),
    ...(b.homepageUrl !== undefined && { homepageUrl: b.homepageUrl.trim() }),
    ...(b.homepageName !== undefined && { homepageName: b.homepageName.trim() }),
    ...(b.image !== undefined && { image: b.image }),
    ...(b.maxEntriesPerUser !== undefined && { maxEntriesPerUser: Math.max(1, Number(b.maxEntriesPerUser) || 1) }),
    ...(b.endsAt !== undefined && { endsAt: b.endsAt }),
  });
  revalidatePath("/game/acrostic");
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, published } = (await req.json().catch(() => ({}))) as { id?: string; published?: boolean };
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
  await setTopicPublished(id, published !== false);
  revalidatePath("/game/acrostic");
  revalidatePath("/game/acrostic/[id]", "page");
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
  await deleteTopic(id);
  return NextResponse.json({ ok: true });
}
