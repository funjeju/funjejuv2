/**
 * Vercel Cron — 시기별(월별) 가볼만한곳 포스팅 (하루 1회).
 * 웹검색으로 그 달 제주 시즌 이슈 + 우리 관광지 풀로 SEO/AEO/GEO 글 즉시 발행.
 * vercel.json: { "path": "/api/cron/seasonal-spots", "schedule": "0 7 * * *" } (KST 16:00)
 * 수동: 어드민 쿠키 또는 CRON_SECRET. ?draft=1 이면 검수용 draft.
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildSeasonalPost } from "@/lib/seasonal-spot-ai";
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
    const draft = await buildSeasonalPost();
    if (!draft) return NextResponse.json({ ok: false, reason: "시즌 테마 매칭 스팟 부족" }, { status: 200 });
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
