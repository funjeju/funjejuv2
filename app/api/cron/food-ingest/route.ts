/**
 * Vercel Cron — 비짓제주 음식점(c4) 매일 3개 도민맛집 적재.
 * 사실(상호·주소·좌표·전화)은 그대로, 소개문은 펀제주 문장으로 각색. 중복 제거 + needsReview 플래그.
 * vercel.json: { "path": "/api/cron/food-ingest", "schedule": "30 0 * * *" } (KST 09:30)
 * 수동 실행: 어드민 쿠키 또는 ?n=3 + CRON_SECRET.
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ingestDailyFoods } from "@/lib/food-ingest";

export const runtime = "nodejs";
export const maxDuration = 120;

async function authorized(req: NextRequest): Promise<boolean> {
  // CRON_SECRET 설정 시: 헤더 일치하면 통과(Vercel 크론). 미설정 시: 크론 허용(webzine과 동일).
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth === `Bearer ${process.env.CRON_SECRET}`) return true;
  const c = await cookies();
  return c.get("admin_auth")?.value === process.env.ADMIN_SECRET; // 어드민 수동 실행 허용
}

export async function GET(req: NextRequest) {
  if (!(await authorized(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const n = Math.min(Math.max(Number(req.nextUrl.searchParams.get("n") ?? "3") || 3, 1), 10);
  try {
    const r = await ingestDailyFoods(n);
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
