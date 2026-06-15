import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { listLocations, upsertLocation } from "@/lib/cctv-location";
import type { CctvLocation } from "@/types/cctv-location";

export const runtime = "nodejs";

async function isAdmin(): Promise<boolean> {
  const c = await cookies();
  return c.get("admin_auth")?.value === process.env.ADMIN_SECRET;
}

/** 전체 지역 SEO 데이터 목록 */
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const locations = await listLocations();
  return NextResponse.json({ locations });
}

/** 한 카메라의 지역 SEO 저장 — 실제 콘텐츠 변경이므로 updatedAt 갱신 */
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as CctvLocation | null;
  if (!body?.id || !body.formal) return NextResponse.json({ error: "id·formal 필수" }, { status: 400 });

  const loc: CctvLocation = {
    id: body.id,
    formal: body.formal,
    short: body.short || body.formal,
    facility: Array.isArray(body.facility) ? body.facility.filter(Boolean) : [],
    viewType: body.viewType || "beach",
    group: body.group || "",
    region: body.region || "",
    lat: body.lat,
    lng: body.lng,
    about: body.about || "",
    nearbySpots: Array.isArray(body.nearbySpots) ? body.nearbySpots.filter((s) => s.name) : [],
    weatherNote: body.weatherNote || "",
    checkPoints: Array.isArray(body.checkPoints) ? body.checkPoints.filter(Boolean) : [],
    faq: Array.isArray(body.faq) ? body.faq.filter((f) => f.q && f.a) : [],
    access: body.access || "",
    nearby: Array.isArray(body.nearby) ? body.nearby.filter(Boolean) : [],
    titleLead: body.titleLead || undefined,
    source: body.source || "",
    needsReview: !!body.needsReview,
    updatedAt: new Date().toISOString(), // 실제 변경일 — sitemap lastmod용
  };
  await upsertLocation(loc);
  return NextResponse.json({ ok: true, id: loc.id, updatedAt: loc.updatedAt });
}
