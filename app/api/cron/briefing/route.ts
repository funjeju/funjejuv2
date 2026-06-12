/**
 * Vercel Cron — AI데일리제주 모닝브리핑 자동 생성 (콘텐츠 엔진 2단계).
 *
 * 매일 아침: 제주 날씨 + 추천 맛집 → Gemini 브리핑 → contents(type=briefing) draft.
 * 기본 반자동(draft) — 어드민 승인 발행. `BRIEFING_AUTO_PUBLISH=true` 면 완전자동.
 *
 * vercel.json: { "path": "/api/cron/briefing", "schedule": "0 22 * * *" } (UTC 22시 = KST 07시)
 */

import { NextRequest, NextResponse } from "next/server";
import { generateBriefingDraft } from "@/lib/briefing-ai";
import { createContent } from "@/lib/contents";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const draft = await generateBriefingDraft();
    if (process.env.BRIEFING_AUTO_PUBLISH === "true") {
      draft.status = "published";
      draft.publishedAt = new Date().toISOString();
    }
    await createContent(draft);
    return NextResponse.json({ ok: true, id: draft.id, slug: draft.slug, status: draft.status, title: draft.title });
  } catch (e) {
    console.error("[cron/briefing] failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
