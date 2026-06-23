/**
 * Vercel Cron — 제주 여행 매거진(#2) 자동 생성·발행 (하루 2회).
 * 고검색 테마(코스·카페·오름·해변·포토·힐링) 롱테일 → 관광지·맛집 데이터로 AEO/GEO 글 → 즉시 발행.
 * vercel.json: { "path": "/api/cron/jeju-magazine", "schedule": "30 4,8 * * *" } (KST 13:30·17:30)
 * 수동: 어드민 쿠키 또는 CRON_SECRET. ?draft=1 이면 검수용 draft.
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildMagazine } from "@/lib/jeju-magazine-ai";
import { createContent } from "@/lib/contents";
import { publishWithReview } from "@/lib/content-review";

export const runtime = "nodejs";
export const maxDuration = 120;

async function authorized(req: NextRequest): Promise<boolean> {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth === `Bearer ${process.env.CRON_SECRET}`) return true;
  const c = await cookies();
  return c.get("admin_auth")?.value === process.env.ADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  if (!(await authorized(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const draft = await buildMagazine();
    if (!draft) return NextResponse.json({ ok: false, reason: "토픽 없음(데이터 부족)" }, { status: 200 });
    if (req.nextUrl.searchParams.get("draft") === "1") {
      await createContent(draft);
      return NextResponse.json({ ok: true, draftOnly: true, id: draft.id, slug: draft.slug, title: draft.title });
    }
    const r = await publishWithReview(draft); // 2차 검수 게이트
    return NextResponse.json({ ok: true, title: draft.title, sections: draft.sections.length, ...r });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
