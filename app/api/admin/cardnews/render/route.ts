/**
 * 카드뉴스 백필 — 이미 발행됐지만 사전 렌더(cardImages)가 없는 카드뉴스를 렌더→Storage 저장.
 * 한 번만 돌리면 기존 카드뉴스도 정적 로드로 전환됨.
 * 수동 실행: 어드민 쿠키 또는 CRON_SECRET.
 *   전체 백필: GET /api/admin/cardnews/render?n=10
 *   한 건 강제: GET /api/admin/cardnews/render?slug=...&force=1
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getContentBySlug, listPublished } from "@/lib/contents";
import { renderAndStoreCards } from "@/lib/cardnews-render";

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
  const origin = req.nextUrl.origin;
  const slug = req.nextUrl.searchParams.get("slug");
  const n = Math.min(Math.max(Number(req.nextUrl.searchParams.get("n") ?? "8") || 8, 1), 30);
  const done: string[] = [];
  const errors: string[] = [];

  try {
    if (slug) {
      const c = await getContentBySlug(slug);
      if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });
      await renderAndStoreCards(origin, c);
      done.push(slug);
    } else {
      const all = await listPublished("card_news", 300);
      const todo = all.filter((c) => !c.cardImages?.length).slice(0, n);
      for (const c of todo) {
        try {
          await renderAndStoreCards(origin, c);
          done.push(c.slug);
        } catch (e) {
          errors.push(`${c.slug}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }

  return NextResponse.json({ ok: true, rendered: done.length, done, errors });
}
