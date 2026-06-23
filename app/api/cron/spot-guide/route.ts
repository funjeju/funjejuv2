/**
 * Vercel Cron — 가볼만한곳 웹진 자동 생성·발행 (하루 3회).
 * 권역×테마 롱테일 토픽 → 비짓제주 관광지로 AEO/GEO 글 → contents(type=webzine) 즉시 발행.
 * vercel.json: { "path": "/api/cron/spot-guide", "schedule": "30 1,6,11 * * *" } (KST 10:30·15:30·20:30)
 * 수동 실행: 어드민 쿠키 또는 CRON_SECRET. ?draft=1 이면 검수용 draft로만 저장.
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildSpotGuide } from "@/lib/spot-guide-ai";
import { createContent } from "@/lib/contents";

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
    const draft = await buildSpotGuide();
    if (!draft) return NextResponse.json({ ok: false, reason: "토픽 없음(적재된 관광지 부족 — spot-ingest 먼저 실행)" }, { status: 200 });

    // 완전자동 발행 (?draft=1 이면 검수용 draft)
    if (req.nextUrl.searchParams.get("draft") !== "1") {
      draft.status = "published";
      draft.publishedAt = new Date().toISOString();
    }
    await createContent(draft);
    return NextResponse.json({ ok: true, id: draft.id, slug: draft.slug, status: draft.status, title: draft.title, sections: draft.sections.length });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
