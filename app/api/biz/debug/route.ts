/**
 * 비즈 홈페이지 진단 — 슬러그로 문서 존재/발행 여부를 즉시 확인.
 * GET /api/biz/debug?slug=비선루-hv7atd
 * (콘텐츠 노출 없음, 메타만. 디버깅용)
 */
import { NextRequest, NextResponse } from "next/server";
import { getSite } from "@/lib/biz/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const slug = (req.nextUrl.searchParams.get("slug") ?? "").trim();
  if (!slug) return NextResponse.json({ error: "slug 파라미터 필요" }, { status: 400 });

  try {
    const site = await getSite(slug);
    if (!site) {
      return NextResponse.json({
        slug,
        found: false,
        reason: "biz_sites에 해당 문서가 없음 (저장 실패 또는 슬러그 불일치)",
      });
    }
    return NextResponse.json({
      slug,
      found: true,
      siteId: site.siteId,
      published: site.published,
      ownerId: site.ownerId,
      name: site.merchantInfo?.name,
      createdAt: site.createdAt,
      willRender: site.published === true,
      note: site.published ? "정상 — /biz/{slug} 렌더돼야 함" : "🔴 published=false라 404. 발행 필요",
    });
  } catch (e) {
    return NextResponse.json({
      slug,
      found: false,
      error: e instanceof Error ? e.message : String(e),
      reason: "Admin SDK 읽기 예외 (FIREBASE_SERVICE_ACCOUNT 등 확인)",
    }, { status: 500 });
  }
}
