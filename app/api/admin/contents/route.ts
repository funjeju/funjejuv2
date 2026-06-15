/**
 * 어드민 — 콘텐츠(웹진/브리핑) 검수·발행 관리.
 *  GET    ?status=draft|published → 목록
 *  PATCH  { id } → 발행(draft→published)
 *  DELETE ?id=   → 삭제
 *  POST   → 웹진 draft 즉시 생성(수동 트리거, 크론과 동일 파이프라인)
 */

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { listContents, publishContent, deleteContent, createContent, getContentById } from "@/lib/contents";
import { pickWebzineTopic, generateWebzineDraft, generateFeedWebzineDraft } from "@/lib/webzine-ai";
import { generateBriefingDraft } from "@/lib/briefing-ai";
import { generateCardNewsDraft, type CardNewsSource } from "@/lib/cardnews-ai";
import type { ContentStatus } from "@/types/content";

export const runtime = "nodejs";
export const maxDuration = 120;

async function isAdmin(): Promise<boolean> {
  const c = await cookies();
  return c.get("admin_auth")?.value === process.env.ADMIN_SECRET;
}

/**
 * 카드뉴스 og 이미지를 전체 미리 렌더해 CDN 엣지 캐시를 데움.
 * 발행 직후 1회 실행 → 첫 방문자도 재렌더 없이 캐시 히트.
 * 베스트에포트: 실패해도 발행에는 영향 없음.
 */
async function warmCardOg(origin: string, slug: string, total: number): Promise<void> {
  await Promise.allSettled(
    Array.from({ length: total }, (_, i) =>
      fetch(`${origin}/api/og/cardnews?slug=${encodeURIComponent(slug)}&i=${i}`, {
        // 엣지를 거쳐 캐시에 적재되도록 캐시 우회 없이 GET
        signal: AbortSignal.timeout(15000),
      }).catch(() => undefined)
    )
  );
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const status = req.nextUrl.searchParams.get("status") as ContentStatus | null;
  const items = await listContents({ status: status ?? undefined });
  return NextResponse.json({ count: items.length, items });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
  await publishContent(id);
  const content = await getContentById(id);
  // 즉시 ISR 캐시 무효화 (revalidate 대기 없이 바로 반영) — 타입에 맞는 경로
  revalidatePath("/");
  revalidatePath("/magazine");
  if (content?.type === "briefing") {
    revalidatePath("/daily");
    revalidatePath("/daily/[slug]", "page");
    if (content.slug) revalidatePath(`/daily/${content.slug}`);
  } else if (content?.type === "card_news") {
    revalidatePath("/card");
    revalidatePath("/card/[slug]", "page");
    if (content.slug) revalidatePath(`/card/${content.slug}`);
    // CDN 워밍업: og 카드 전체를 미리 렌더 → 첫 유저도 캐시 히트 (느린 1회 제거)
    if (content.slug) {
      const total = (content.sections?.length ?? 0) + 2; // 표지 + 섹션 + CTA
      await warmCardOg(req.nextUrl.origin, content.slug, total);
    }
  } else {
    revalidatePath("/webzine");
    revalidatePath("/webzine/[slug]", "page");
    if (content?.slug) revalidatePath(`/webzine/${content.slug}`);
  }
  return NextResponse.json({ ok: true, id, status: "published", slug: content?.slug });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
  await deleteContent(id);
  return NextResponse.json({ ok: true, id });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const type = req.nextUrl.searchParams.get("type"); // "briefing" | (기본) "webzine"

  if (type === "briefing") {
    const draft = await generateBriefingDraft();
    await createContent(draft);
    return NextResponse.json({ ok: true, id: draft.id, slug: draft.slug, title: draft.title });
  }

  // 카드뉴스 (인스타/스레드 캐러셀) — ?type=card_news&source=webzine|briefing|feed
  if (type === "card_news") {
    const source = (req.nextUrl.searchParams.get("source") ?? "webzine") as CardNewsSource;
    const draft = await generateCardNewsDraft(source);
    if (!draft) return NextResponse.json({ error: "카드뉴스 소스가 부족해 생성할 수 없어요." }, { status: 200 });
    await createContent(draft);
    return NextResponse.json({ ok: true, id: draft.id, slug: draft.slug, title: draft.title });
  }

  // 피드 사진 기반 웹진 (피드 3개 이상일 때)
  if (type === "webzine-feed") {
    const draft = await generateFeedWebzineDraft();
    if (!draft) return NextResponse.json({ error: "라이브피드가 3개 미만이라 생성할 수 없어요." }, { status: 200 });
    await createContent(draft);
    return NextResponse.json({ ok: true, id: draft.id, slug: draft.slug, title: draft.title });
  }

  const topic = await pickWebzineTopic();
  if (!topic) return NextResponse.json({ error: "토픽 없음" }, { status: 200 });
  const draft = await generateWebzineDraft(topic);
  await createContent(draft);
  return NextResponse.json({ ok: true, id: draft.id, slug: draft.slug, title: draft.title });
}
