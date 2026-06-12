/**
 * 어드민 — Cloudflare 비용 추정 카드 데이터.
 * stats_watch_budget(전체 유저 시청 스트림·초)를 집계해 요청수·비용으로 환산.
 * ⚠️ 추정치 (실측은 Cloudflare GraphQL Analytics API 연동 필요).
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getWatchCostSummary } from "@/lib/firestore-stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_auth")?.value !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await getWatchCostSummary();
    return NextResponse.json(summary);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
