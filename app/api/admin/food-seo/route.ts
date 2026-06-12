/**
 * 어드민 — 도민맛집 AI SEO 생성/관리 (하이브리드의 AI 보강).
 *  GET  → 생성된 override 목록
 *  POST { ids: string[] } → 각 맛집 AI 생성 + food_seo 캐싱 (룰 결과 override)
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getRestaurant } from "@/lib/restaurants";
import { generateFoodSeoAI } from "@/lib/food-seo-ai";
import { saveFoodSeoOverride, listFoodSeoOverrides } from "@/lib/food-seo-store";

export const runtime = "nodejs";
export const maxDuration = 300;

async function isAdmin(): Promise<boolean> {
  const c = await cookies();
  return c.get("admin_auth")?.value === process.env.ADMIN_SECRET;
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const list = await listFoodSeoOverrides();
  return NextResponse.json({ count: list.length, items: list });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ids } = (await req.json().catch(() => ({}))) as { ids?: string[] };
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids 배열이 필요합니다." }, { status: 400 });
  }
  if (ids.length > 30) {
    return NextResponse.json({ error: "한 번에 최대 30개까지 생성할 수 있습니다." }, { status: 400 });
  }

  const results: { id: string; ok: boolean; error?: string }[] = [];
  for (const id of ids) {
    try {
      const r = await getRestaurant(id);
      if (!r) { results.push({ id, ok: false, error: "맛집 없음" }); continue; }
      const ai = await generateFoodSeoAI(r);
      await saveFoodSeoOverride({ id, intro: ai.intro, faqs: ai.faqs, highlights: ai.highlights });
      results.push({ id, ok: true });
    } catch (e) {
      results.push({ id, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return NextResponse.json({ generated: results.filter((r) => r.ok).length, results });
}
