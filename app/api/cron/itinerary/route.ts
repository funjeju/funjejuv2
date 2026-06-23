/**
 * Vercel Cron — 여행일정 시뮬 포스팅 (하루 1회).
 * 페르소나로 일정 생성기를 돌려 나온 동선을 SEO/AEO/GEO 글로 즉시 발행. TouristTrip JSON-LD 포함.
 * vercel.json: { "path": "/api/cron/itinerary", "schedule": "0 0 * * *" } (KST 09:00)
 * 수동: 어드민 쿠키 또는 CRON_SECRET. ?draft=1 이면 검수용 draft.
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildItineraryPost } from "@/lib/itinerary-post-ai";
import { createContent } from "@/lib/contents";
import { publishWithReview } from "@/lib/content-review";

export const runtime = "nodejs";
export const maxDuration = 300;

async function authorized(req: NextRequest): Promise<boolean> {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth === `Bearer ${process.env.CRON_SECRET}`) return true;
  const c = await cookies();
  return c.get("admin_auth")?.value === process.env.ADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  if (!(await authorized(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const draft = await buildItineraryPost();
    if (!draft) return NextResponse.json({ ok: false, reason: "일정 생성 실패(재시도 대상)" }, { status: 200 });
    if (req.nextUrl.searchParams.get("draft") === "1") {
      await createContent(draft);
      return NextResponse.json({ ok: true, draftOnly: true, id: draft.id, slug: draft.slug, title: draft.title });
    }
    const r = await publishWithReview(draft, req.nextUrl.origin); // 2차 검수 게이트 → 통과만 발행
    return NextResponse.json({ ok: true, title: draft.title, sections: draft.sections.length, ...r });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
