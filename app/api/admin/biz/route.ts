/**
 * 어드민 비즈 홈페이지 관리 — 전체 목록 / 삭제 / 발행토글.
 * 인증: admin_auth 쿠키 (다른 /api/admin/* 와 동일).
 */
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { listAllSites, deleteSite, setPublished } from "@/lib/biz/store";

export const runtime = "nodejs";

async function isAdmin(): Promise<boolean> {
  const c = await cookies();
  return c.get("admin_auth")?.value === process.env.ADMIN_SECRET;
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sites = await listAllSites();
  const items = sites.map((s) => ({
    slug: s.slug,
    name: s.merchantInfo?.name ?? s.siteId,
    category: s.merchantInfo?.category ?? "",
    address: s.merchantInfo?.address ?? "",
    ownerId: s.ownerId ?? "",
    published: s.published ?? false,
    heroImage: s.contentAssets?.heroImage ?? "",
    createdAt: s.createdAt ?? "",
  }));
  return NextResponse.json({ items });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "slug 필요" }, { status: 400 });
  await deleteSite(slug);
  revalidatePath(`/biz/${slug}`);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { slug, published } = (await req.json().catch(() => ({}))) as { slug?: string; published?: boolean };
  if (!slug || typeof published !== "boolean") return NextResponse.json({ error: "slug/published 필요" }, { status: 400 });
  await setPublished(slug, published);
  revalidatePath(`/biz/${slug}`);
  return NextResponse.json({ ok: true, published });
}
