/**
 * 비즈 홈페이지 자동 생성 API
 *
 * POST /api/biz/generate
 * body: { businessName, category?, description?, address?, phone?, restaurantId?, vibes?, ... }
 * → AI가 SiteSchema 생성 → biz_sites에 저장(미발행) → { site } 반환
 *
 * 인증: Firebase ID 토큰 필수 (비즈 회원). ownerId = 토큰 uid.
 */

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { generateSiteFromInput } from "@/lib/biz/pipeline";
import { saveSite, listSitesByOwner, getSite } from "@/lib/biz/store";
import type { CtaButton } from "@/lib/biz/types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const auth = await verifyFirebaseToken(req.headers.get("authorization"));
  if (!auth) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const businessName = typeof body.businessName === "string" ? body.businessName.trim() : "";
  if (!businessName) {
    return NextResponse.json({ error: "상호명을 입력해주세요." }, { status: 400 });
  }

  const isAdmin = auth.email === "naggu1999@gmail.com";

  // 편집 모드 — 기존 슬러그 소유권 확인
  const editSlug = typeof body.editSlug === "string" && body.editSlug ? body.editSlug : undefined;
  if (editSlug) {
    const existing = await getSite(editSlug);
    if (!existing) return NextResponse.json({ error: "수정할 홈페이지를 찾을 수 없습니다." }, { status: 404 });
    if (existing.ownerId !== auth.uid && !isAdmin) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }
  }

  // 사이트 개수 제한 (비즈 회원당 5개) — 남용 방지. 어드민·편집은 무제한.
  if (!isAdmin && !editSlug) {
    try {
      const existing = await listSitesByOwner(auth.uid);
      if (existing.length >= 5) {
        return NextResponse.json(
          { error: "생성 가능한 홈페이지 개수(5개)를 초과했습니다." },
          { status: 429 }
        );
      }
    } catch (err) {
      console.error("[biz/generate] owner site count failed:", err);
    }
  }

  try {
    const site = await generateSiteFromInput({
      ownerId: auth.uid,
      businessName,
      category: typeof body.category === "string" ? body.category : undefined,
      description: typeof body.description === "string" ? body.description : undefined,
      address: typeof body.address === "string" ? body.address : undefined,
      phone: typeof body.phone === "string" ? body.phone : undefined,
      businessHours: typeof body.businessHours === "string" ? body.businessHours : undefined,
      restaurantId: typeof body.restaurantId === "string" ? body.restaurantId : undefined,
      editSlug,
      placeUrl: typeof body.placeUrl === "string" ? body.placeUrl : undefined,
      coordinates:
        body.coordinates &&
        typeof body.coordinates === "object" &&
        typeof (body.coordinates as { lat?: unknown }).lat === "number" &&
        typeof (body.coordinates as { lng?: unknown }).lng === "number"
          ? (body.coordinates as { lat: number; lng: number })
          : undefined,
      ctaButtons: Array.isArray(body.ctaButtons)
        ? (body.ctaButtons as CtaButton[]).filter((b) => b && b.type && b.value).slice(0, 3)
        : undefined,
      vibes: Array.isArray(body.vibes) ? (body.vibes as string[]) : undefined,
      reviews: Array.isArray(body.reviews) ? (body.reviews as string[]) : undefined,
      menuItems: typeof body.menuItems === "string" ? body.menuItems : undefined,
      heroImage: typeof body.heroImage === "string" ? body.heroImage : undefined,
      galleryImages: Array.isArray(body.galleryImages) ? (body.galleryImages as string[]) : undefined,
    });

    await saveSite(site);
    // 생성 직후 첫 요청이 빈 결과로 캐시되는 ISR 타이밍 404 방지
    revalidatePath(`/biz/${site.slug}`);
    revalidatePath("/biz/[slug]", "page");
    return NextResponse.json({ site });
  } catch (err) {
    console.error("[biz/generate] generation failed:", err);
    return NextResponse.json({ error: "홈페이지 생성에 실패했습니다. 잠시 후 다시 시도해주세요." }, { status: 500 });
  }
}
