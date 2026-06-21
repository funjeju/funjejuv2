/**
 * 어드민 키우기 광고 캠페인 관리 — 목록/등록/삭제/활성토글.
 * 인증: admin_auth 쿠키 (다른 /api/admin/* 와 동일).
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { listCampaigns, addCampaign, deleteCampaign, setCampaignActive } from "@/lib/biz/campaign-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isAdmin(): Promise<boolean> {
  const c = await cookies();
  return c.get("admin_auth")?.value === process.env.ADMIN_SECRET;
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ campaigns: await listCampaigns(false) });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const campaign = await addCampaign(body);
    return NextResponse.json({ campaign });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "등록 실패" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
  await deleteCampaign(id);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, active } = (await req.json().catch(() => ({}))) as { id?: string; active?: boolean };
  if (!id || typeof active !== "boolean") return NextResponse.json({ error: "id/active 필요" }, { status: 400 });
  await setCampaignActive(id, active);
  return NextResponse.json({ ok: true, active });
}
