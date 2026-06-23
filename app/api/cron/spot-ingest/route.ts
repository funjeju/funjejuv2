/**
 * Vercel Cron — 비짓제주 관광지(c1)를 매일 N개씩 `attractions`에 적재(이미지 우리 도메인 복사).
 * vercel.json: { "path": "/api/cron/spot-ingest", "schedule": "0 22 * * *" } (KST 07:00)
 * 수동 실행: 어드민 쿠키 또는 ?n=20 + CRON_SECRET. (초기 시드용으로 여러 번 호출 가능)
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ingestDailySpots } from "@/lib/spot-ingest";

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
  const n = Math.min(Math.max(Number(req.nextUrl.searchParams.get("n") ?? "20") || 20, 1), 60);
  try {
    const r = await ingestDailySpots(n);
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
