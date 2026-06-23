/**
 * Vercel Cron — 카드뉴스 자동 발급.
 *  - CCTV(날씨): 하루 2번 (KST 08·18시, 오전/오후 세트 자동)
 *  - 도민맛집(웹진소스): 하루 1번 (KST 13시)
 *  - 라이브피드: 새 피드 8개 쌓이면 (매 실행 시 체크)
 *
 * vercel.json (UTC):
 *   { "path": "/api/cron/cardnews", "schedule": "0 23 * * *" }  // KST 08시 — 날씨(오전) + 피드체크
 *   { "path": "/api/cron/cardnews", "schedule": "0 4 * * *"  }  // KST 13시 — 맛집 + 피드체크
 *   { "path": "/api/cron/cardnews", "schedule": "0 9 * * *"  }  // KST 18시 — 날씨(오후) + 피드체크
 *
 * 자동발행. 검수만 하려면 CARDNEWS_AUTO_PUBLISH=false.
 */
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { generateCardNewsDraft, type CardNewsSource } from "@/lib/cardnews-ai";
import { createContent } from "@/lib/contents";
import { countFeedsSince } from "@/lib/feed-server";
import { getAdminDb } from "@/lib/firebase-admin";
import type { Content } from "@/types/content";

export const runtime = "nodejs";
export const maxDuration = 300;

const STATE_DOC = "app_config/cardnews_auto";
const FEED_THRESHOLD = 8; // 새 피드 N개 쌓이면 피드 카드뉴스 발급

/** KST 현재 시(0~23) */
function kstHour(): number {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", hour: "2-digit", hour12: false }).format(new Date())) % 24;
}

/** og 카드 전체를 미리 렌더해 CDN 캐시 워밍 (첫 방문자도 캐시 히트) */
async function warmCardOg(origin: string, slug: string, total: number): Promise<void> {
  await Promise.allSettled(
    Array.from({ length: total }, (_, i) =>
      fetch(`${origin}/api/og/cardnews?slug=${encodeURIComponent(slug)}&i=${i}`, { signal: AbortSignal.timeout(15000) }).catch(() => undefined)
    )
  );
}

/** 생성된 draft를 발행 + 캐시 무효화 + CDN 워밍 */
async function publishCard(draft: Content, origin: string) {
  if (process.env.CARDNEWS_AUTO_PUBLISH !== "false") {
    draft.status = "published";
    draft.publishedAt = new Date().toISOString();
  }
  await createContent(draft);
  if (draft.status === "published") {
    revalidatePath("/");
    revalidatePath("/card");
    revalidatePath("/magazine");
    revalidatePath("/card/[slug]", "page");
    if (draft.slug) {
      const total = (draft.sections?.length ?? 0) + 2;
      await warmCardOg(origin, draft.slug, total);
    }
  }
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const origin = req.nextUrl.origin;
  const hour = kstHour();
  const slot = req.nextUrl.searchParams.get("slot"); // am | lunch | pm (vercel.json), 없으면 시각 기반
  const results: Record<string, unknown> = { kstHour: hour, slot };

  // 어떤 소스를 만들지 결정 — slot 우선(정시 드리프트 무관), 없으면 시각 기반.
  // 날씨 카드뉴스는 CCTV 스냅샷 서비스 다운으로 중단 → 가볼만한곳(spotguide)으로 대체.
  const sources: CardNewsSource[] = [];
  if (slot === "am") sources.push("spotguide");
  else if (slot === "pm") sources.push("spotguide");
  else if (slot === "lunch") sources.push("webzine");
  else {
    if (hour >= 6 && hour < 12) sources.push("spotguide");
    else if (hour >= 16 && hour < 22) sources.push("spotguide");
    if (hour >= 12 && hour < 16) sources.push("webzine");
  }

  // 피드: 새 글 8개 이상 쌓였으면 발급 (마커 갱신)
  let feedTriggered = false;
  try {
    const stateRef = getAdminDb().doc(STATE_DOC);
    const snap = await stateRef.get();
    const lastFeedAt = (snap.exists ? (snap.data()?.lastFeedAt as number) : 0) || 0;
    const newCount = await countFeedsSince(lastFeedAt);
    results.feedNewCount = newCount;
    if (newCount >= FEED_THRESHOLD) {
      sources.push("feed");
      feedTriggered = true;
    }
  } catch (e) {
    results.feedCheckError = String(e).slice(0, 120);
  }

  // 생성·발행
  const published: string[] = [];
  for (const source of sources) {
    try {
      const draft = await generateCardNewsDraft(source);
      if (!draft) { results[`${source}_skip`] = "소스 부족"; continue; }
      await publishCard(draft, origin);
      published.push(`${source}:${draft.slug}`);
      if (source === "feed" && feedTriggered) {
        // 피드 카드뉴스 발급 성공 → 마커를 지금으로 갱신 (다음 8개 카운트 시작점)
        await getAdminDb().doc(STATE_DOC).set({ lastFeedAt: Date.now() }, { merge: true });
      }
    } catch (e) {
      results[`${source}_error`] = e instanceof Error ? e.message.slice(0, 150) : String(e).slice(0, 150);
    }
  }

  return NextResponse.json({ ok: true, published, ...results });
}
