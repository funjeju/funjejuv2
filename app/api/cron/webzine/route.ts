/**
 * Vercel Cron — 웹진 자동 생성 (콘텐츠 엔진 2단계).
 *
 * 흐름: 지역×메뉴 토픽 선정 → Gemini 큐레이션 → contents에 draft 저장.
 * 기본 반자동(draft) — 어드민이 /admin/contents에서 승인 발행.
 * `WEBZINE_AUTO_PUBLISH=true` 면 완전자동(생성 즉시 published). ← 전환 용이.
 *
 * vercel.json: { "path": "/api/cron/webzine", "schedule": "0 22 * * 1,3,5" } (주3회 예시)
 */

import { NextRequest, NextResponse } from "next/server";
import { pickWebzineTopic, generateWebzineDraft, generateFeedWebzineDraft } from "@/lib/webzine-ai";
import { createContent } from "@/lib/contents";
import type { Content } from "@/types/content";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * 하루 3회 발행 (vercel.json: "0 1,6,11 * * *" = KST 10·15·20시).
 * - KST 15시(UTC 6시) 슬롯: 라이브피드 사진 기반 글 (피드 3개 이상일 때). 부족하면 맛집 토픽으로 폴백.
 * - 나머지 슬롯: 도민맛집 지역×메뉴 큐레이션 글.
 * - ?mode=feed|topic 로 수동 강제 가능.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 모드 결정: 쿼리 우선, 없으면 UTC 시(6시=피드 슬롯)로 판단
  const forced = req.nextUrl.searchParams.get("mode"); // "feed" | "topic"
  const utcHour = new Date().getUTCHours();
  const useFeed = forced === "feed" || (forced !== "topic" && utcHour === 6);

  try {
    let draft: Content | null = null;
    let usedMode = "topic";

    if (useFeed) {
      draft = await generateFeedWebzineDraft(); // 피드 3개 미만이면 null
      if (draft) usedMode = "feed";
    }
    // 피드 모드가 아니거나 피드 부족 → 맛집 토픽으로 폴백
    if (!draft) {
      const topic = await pickWebzineTopic();
      if (!topic) return NextResponse.json({ error: "발행할 토픽 없음(맛집 3+ 조합 부족)" }, { status: 200 });
      draft = await generateWebzineDraft(topic);
    }

    if (process.env.WEBZINE_AUTO_PUBLISH === "true") {
      draft.status = "published";
      draft.publishedAt = new Date().toISOString();
    }

    await createContent(draft);
    return NextResponse.json({ ok: true, mode: usedMode, id: draft.id, slug: draft.slug, status: draft.status, title: draft.title, sections: draft.sections.length });
  } catch (e) {
    console.error("[cron/webzine] failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
