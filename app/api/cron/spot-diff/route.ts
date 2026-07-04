/**
 * Vercel Cron — 라이브 피드(맛집·카페) → 틀린그림 draft 자동 생성.
 * 포스터+틀린그림 합본 생성 → 좌·우/상·하 슬라이스 → markers 비운 draft 적재.
 * 관리자는 검수 큐에서 잘린 결과물만 열어 틀린 곳 5개 클릭 후 발행. (자동발행 아님)
 * vercel.json: { "path": "/api/cron/spot-diff", "schedule": "0 21 * * *" } (KST 06:00)
 * 수동 실행: 어드민 쿠키 또는 ?n=2 + CRON_SECRET.
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ingestDailySpotDiffs } from "@/lib/spot-diff-ingest";

export const runtime = "nodejs";
export const maxDuration = 300;

async function authorized(req: NextRequest): Promise<boolean> {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth === `Bearer ${process.env.CRON_SECRET}`) return true;
  const c = await cookies();
  return c.get("admin_auth")?.value === process.env.ADMIN_SECRET; // 어드민 수동 실행 허용
}

export async function GET(req: NextRequest) {
  if (!(await authorized(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const n = Math.min(Math.max(Number(req.nextUrl.searchParams.get("n") ?? "2") || 2, 1), 6);
  try {
    const r = await ingestDailySpotDiffs(n);
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
