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
import { pickWebzineTopic, generateWebzineDraft } from "@/lib/webzine-ai";
import { createContent } from "@/lib/contents";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  // Vercel Cron만 허용 (CRON_SECRET). 어드민 수동 트리거도 같은 토큰으로.
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const topic = await pickWebzineTopic();
    if (!topic) {
      return NextResponse.json({ error: "발행할 토픽 없음(맛집 3+ 조합 부족)" }, { status: 200 });
    }

    const draft = await generateWebzineDraft(topic);

    // 완전자동 토글 — env 하나로 즉시 발행 전환
    if (process.env.WEBZINE_AUTO_PUBLISH === "true") {
      draft.status = "published";
      draft.publishedAt = new Date().toISOString();
    }

    await createContent(draft);

    return NextResponse.json({
      ok: true,
      id: draft.id,
      slug: draft.slug,
      status: draft.status,
      title: draft.title,
      sections: draft.sections.length,
    });
  } catch (e) {
    console.error("[cron/webzine] failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
