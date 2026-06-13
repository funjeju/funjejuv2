/**
 * 내 비즈 홈페이지 목록 — 로그인한 소유자의 사이트만.
 * GET /api/biz/list  (Authorization: Bearer <Firebase ID 토큰>)
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { listSitesByOwner } from "@/lib/biz/store";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await verifyFirebaseToken(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const sites = await listSitesByOwner(auth.uid);
    const items = sites
      .map((s) => ({
        slug: s.slug,
        name: s.merchantInfo?.name ?? s.slug,
        category: s.merchantInfo?.category ?? "",
        published: s.published,
        updatedAt: s.updatedAt,
        heroImage: s.contentAssets?.heroImage ?? "",
      }))
      .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
    return NextResponse.json({ items });
  } catch (err) {
    console.error("[biz/list] failed:", err);
    return NextResponse.json({ items: [] });
  }
}
