/**
 * 사이트 전반 키워드 검색 — 도민맛집 + 웹진/데일리 + CCTV 통합.
 * GET /api/search?q=키워드
 */
import { NextRequest, NextResponse } from "next/server";
import { loadAllRestaurants, stripHtml } from "@/lib/restaurants";
import { listPublished } from "@/lib/contents";
import { mockCctvs } from "@/constants/mock-cctvs";

export const runtime = "nodejs";
export const revalidate = 300;

type RestaurantHit = { id: string; title: string; region: string; menu: string; address?: string };
type ContentHit = { type: "webzine" | "briefing"; slug: string; title: string; subtitle: string };
type CctvHit = { id: string; name: string; region: string };

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  if (q.length < 1) {
    return NextResponse.json({ restaurants: [], contents: [], cctvs: [] });
  }

  const has = (...parts: (string | undefined)[]) =>
    parts.filter(Boolean).some((p) => p!.toLowerCase().includes(q));

  // 도민맛집
  let restaurants: RestaurantHit[] = [];
  try {
    const all = await loadAllRestaurants();
    restaurants = all
      .filter((r) => has(r.title, r.region, r.menu, r.address, stripHtml(r.content ?? "", 200)))
      .slice(0, 10)
      .map((r) => ({ id: r.id, title: r.title, region: r.region, menu: r.menu, address: r.address }));
  } catch { /* ignore */ }

  // 웹진 + 데일리(모닝브리핑)
  let contents: ContentHit[] = [];
  try {
    const [webzines, briefings] = await Promise.all([
      listPublished("webzine", 100).catch(() => []),
      listPublished("briefing", 100).catch(() => []),
    ]);
    contents = [...webzines, ...briefings]
      .filter((c) => has(c.title, c.subtitle, c.intro, ...(c.keywords ?? [])))
      .slice(0, 10)
      .map((c) => ({ type: c.type as "webzine" | "briefing", slug: c.slug, title: c.title, subtitle: c.subtitle }));
  } catch { /* ignore */ }

  // CCTV
  const cctvs: CctvHit[] = mockCctvs
    .filter((c) => has(c.name, c.region, c.category, c.description))
    .slice(0, 10)
    .map((c) => ({ id: c.id, name: c.name, region: c.region }));

  return NextResponse.json({ restaurants, contents, cctvs });
}
