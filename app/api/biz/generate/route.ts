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
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { generateSiteFromInput } from "@/lib/biz/pipeline";
import { saveSite, listSitesByOwner } from "@/lib/biz/store";

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

  // 사이트 개수 제한 (비즈 회원당 5개) — 남용 방지
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
      vibes: Array.isArray(body.vibes) ? (body.vibes as string[]) : undefined,
      reviews: Array.isArray(body.reviews) ? (body.reviews as string[]) : undefined,
      menuItems: typeof body.menuItems === "string" ? body.menuItems : undefined,
      heroImage: typeof body.heroImage === "string" ? body.heroImage : undefined,
      galleryImages: Array.isArray(body.galleryImages) ? (body.galleryImages as string[]) : undefined,
    });

    await saveSite(site);
    return NextResponse.json({ site });
  } catch (err) {
    console.error("[biz/generate] generation failed:", err);
    return NextResponse.json({ error: "홈페이지 생성에 실패했습니다. 잠시 후 다시 시도해주세요." }, { status: 500 });
  }
}
