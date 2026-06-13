/**
 * 비즈 홈페이지 관리 — 삭제 / 발행토글.
 * 소유자 본인 또는 어드민만 가능.
 * DELETE /api/biz/[slug]
 * PATCH  /api/biz/[slug]  body: { published: boolean }
 */
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { getSite, deleteSite, setPublished } from "@/lib/biz/store";

export const runtime = "nodejs";

const ADMIN_EMAIL = "naggu1999@gmail.com";

async function authorize(req: NextRequest, slug: string) {
  const auth = await verifyFirebaseToken(req.headers.get("authorization"));
  if (!auth) return { error: "로그인이 필요합니다.", status: 401 as const };
  const site = await getSite(slug);
  if (!site) return { error: "홈페이지를 찾을 수 없습니다.", status: 404 as const };
  const isOwner = site.ownerId === auth.uid;
  const isAdmin = auth.email === ADMIN_EMAIL;
  if (!isOwner && !isAdmin) return { error: "권한이 없습니다.", status: 403 as const };
  return { site };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = await authorize(req, slug);
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  const m = a.site.merchantInfo;
  return NextResponse.json({
    slug: a.site.slug,
    businessName: m.name,
    category: m.category,
    description: m.description,
    address: m.address,
    phone: m.phone,
    coordinates: m.coordinates,
    placeUrl: a.site.externalLinks?.kakaoPlace,
    ctaButtons: a.site.ctaButtons ?? [],
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = await authorize(req, slug);
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  await deleteSite(a.site.slug);
  revalidatePath(`/biz/${a.site.slug}`);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = await authorize(req, slug);
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  const { published } = (await req.json().catch(() => ({}))) as { published?: boolean };
  if (typeof published !== "boolean") {
    return NextResponse.json({ error: "published(boolean) 필요" }, { status: 400 });
  }
  await setPublished(a.site.slug, published);
  revalidatePath(`/biz/${a.site.slug}`);
  return NextResponse.json({ ok: true, published });
}
