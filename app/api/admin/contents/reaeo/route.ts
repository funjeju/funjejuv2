/**
 * 어드민 — 발행된 웹진을 AEO/GEO 기준으로 in-place 일괄 재작성.
 * slug·id·맛집링크·이미지·publishedAt 보존 → 검색 순위/링크 그대로 승계.
 * POST { limit? }  (기본 전체, 타임아웃 대비 limit 가능)
 */
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { listContents, createContent } from "@/lib/contents";
import { reAeoContent } from "@/lib/webzine-ai";

export const runtime = "nodejs";
export const maxDuration = 300;

async function isAdmin(): Promise<boolean> {
  const c = await cookies();
  return c.get("admin_auth")?.value === process.env.ADMIN_SECRET;
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { limit } = (await req.json().catch(() => ({}))) as { limit?: number };
  // FAQ가 아직 없는(=재작성 안 된) 발행 웹진 우선 처리
  const all = await listContents({ status: "published", type: "webzine" });
  const targets = all
    .filter((c) => !c.faqs || c.faqs.length === 0)
    .slice(0, limit && limit > 0 ? limit : all.length);

  const done: string[] = [];
  const failed: string[] = [];
  for (const c of targets) {
    try {
      const rewritten = await reAeoContent(c);
      await createContent(rewritten); // 같은 id로 set → in-place 덮어쓰기
      if (rewritten.slug) revalidatePath(`/webzine/${rewritten.slug}`);
      done.push(c.slug);
    } catch (e) {
      failed.push(`${c.slug}: ${e instanceof Error ? e.message.slice(0, 80) : "err"}`);
    }
  }
  revalidatePath("/webzine");
  revalidatePath("/magazine");

  return NextResponse.json({
    ok: true,
    totalPublished: all.length,
    remaining: all.filter((c) => !c.faqs || c.faqs.length === 0).length - done.length,
    rewritten: done.length,
    done,
    failed,
  });
}
