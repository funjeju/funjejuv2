import { NextRequest, NextResponse } from "next/server";
import {
  listCctvEntries,
  setCctvEntry,
  deleteCctvEntry,
  toggleCctvActive,
} from "@/lib/cloudflare-kv";

function isAuthorized(req: NextRequest) {
  // 쿠키 기반 인증 (httpOnly — 브라우저에서 JS로 읽기 불가)
  const cookie = req.cookies.get("admin_auth")?.value;
  return cookie === process.env.ADMIN_SECRET;
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorized();
  const entries = await listCctvEntries();
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorized();

  const body = await req.json() as {
    id: string; name: string; region: string;
    category: string; originUrl: string; active: boolean;
  };

  if (!body.id || !body.originUrl || !body.name) {
    return NextResponse.json({ error: "id, name, originUrl은 필수입니다" }, { status: 400 });
  }

  await setCctvEntry(body.id, {
    name: body.name,
    region: body.region ?? "",
    category: body.category ?? "기타",
    originUrl: body.originUrl,
    active: body.active ?? true,
    addedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorized();
  const { id, active } = await req.json() as { id: string; active: boolean };
  await toggleCctvActive(id, active);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorized();
  const { id } = await req.json() as { id: string };
  await deleteCctvEntry(id);
  return NextResponse.json({ ok: true });
}
