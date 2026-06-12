/** 어드민 — 틀린그림찾기 문제 관리. GET 목록 / POST 생성 / PUT 수정 / PATCH 발행 / DELETE */
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createGame, updateGame, listGames, setPublished, deleteGame } from "@/lib/spot";
import type { SpotGame, SpotMarker, SpotLayout } from "@/types/spot";

export const runtime = "nodejs";

async function isAdmin(): Promise<boolean> {
  const c = await cookies();
  return c.get("admin_auth")?.value === process.env.ADMIN_SECRET;
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const items = await listGames();
  return NextResponse.json({ count: items.length, items });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as {
    title?: string; origImage?: string; variantImage?: string;
    layout?: SpotLayout; markers?: SpotMarker[];
  };
  if (!b.origImage || !b.variantImage || !b.markers?.length) {
    return NextResponse.json({ error: "이미지 2장과 정답 좌표가 필요합니다." }, { status: 400 });
  }
  const game: SpotGame = {
    id: crypto.randomUUID(),
    title: b.title?.trim() || "제주 틀린그림찾기",
    origImage: b.origImage,
    variantImage: b.variantImage,
    layout: b.layout === "stack" ? "stack" : "side",
    markers: b.markers,
    diffCount: b.markers.length,
    status: "draft",
    createdAt: Date.now(),
  };
  await createGame(game);
  return NextResponse.json({ ok: true, id: game.id });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, published } = (await req.json().catch(() => ({}))) as { id?: string; published?: boolean };
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
  await setPublished(id, published !== false);
  revalidatePath("/game/spot");
  revalidatePath("/game/spot/[id]", "page");
  return NextResponse.json({ ok: true, id });
}

export async function PUT(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, title, markers, layout } = (await req.json().catch(() => ({}))) as {
    id?: string; title?: string; markers?: { x: number; y: number }[]; layout?: string;
  };
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
  await updateGame(id, {
    ...(title !== undefined && { title }),
    ...(markers !== undefined && { markers, diffCount: markers.length }),
    ...(layout === "stack" || layout === "side" ? { layout } : {}),
  });
  revalidatePath("/game/spot");
  revalidatePath(`/game/spot/${id}`);
  return NextResponse.json({ ok: true, id });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
  await deleteGame(id);
  return NextResponse.json({ ok: true, id });
}
