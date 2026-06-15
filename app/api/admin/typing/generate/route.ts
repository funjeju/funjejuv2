/** 어드민 — 타자연습 지문 AI 생성. 키워드/문장 → 단문 1 + 장문 1 자동 출제(draft) */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateJSON } from "@/lib/biz/gemini";
import { createPassage } from "@/lib/typing";
import type { TypingPassage } from "@/types/typing";

export const runtime = "nodejs";

async function isAdmin(): Promise<boolean> {
  const c = await cookies();
  return c.get("admin_auth")?.value === process.env.ADMIN_SECRET;
}

const SYS = `너는 한국어 타자연습 지문 생성기다. 입력 키워드(가게·메뉴·주제)로 타이핑하기 좋은 자연스러운 한국어 지문을 만든다.
규칙:
- "short"(단문): 35~70자, 한 문장. 핵심만 담은 매력적인 한 줄 소개.
- "long"(장문): 150~260자, 3~5문장. 매장/메뉴/분위기/방문팁이 자연스럽게 흐르는 설명.
- 실제 타이핑용이라 따옴표·특수문자·이모지·줄바꿈 없이 일반 문장으로. 맞춤법 정확하게.
- 과장 광고 톤 금지, 담백하고 읽기 좋은 묘사.
JSON만 출력: {"short": "...", "long": "..."}`;

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { keyword, businessName, homepageUrl, homepageName } = (await req.json().catch(() => ({}))) as {
    keyword?: string; businessName?: string; homepageUrl?: string; homepageName?: string;
  };
  const kw = (keyword ?? "").trim();
  if (kw.length < 2) return NextResponse.json({ error: "키워드/문장을 입력하세요." }, { status: 400 });

  let gen: { short?: string; long?: string };
  try {
    gen = await generateJSON<{ short: string; long: string }>(SYS, `키워드/주제: ${kw}${businessName ? ` (업체명: ${businessName})` : ""}`);
  } catch (e) {
    return NextResponse.json({ error: "AI 생성 실패: " + String(e).slice(0, 80) }, { status: 502 });
  }
  const clean = (s?: string) => (s ?? "").replace(/[\r\n"]/g, " ").replace(/\s+/g, " ").trim();
  const short = clean(gen.short), long = clean(gen.long);
  if (short.length < 10 && long.length < 10) return NextResponse.json({ error: "생성 결과가 비었어요. 다시 시도." }, { status: 502 });

  const base = {
    businessName: businessName?.trim() || kw,
    homepageUrl: homepageUrl?.trim() || undefined,
    homepageName: homepageName?.trim() || undefined,
    weightW: 1, maxAttempts: 0, status: "draft" as const, createdAt: Date.now(), playCount: 0,
  };
  const made: string[] = [];
  if (short.length >= 10) { const p: TypingPassage = { id: crypto.randomUUID(), text: short, kind: "short", ...base }; await createPassage(p); made.push("단문"); }
  if (long.length >= 10) { const p: TypingPassage = { id: crypto.randomUUID(), text: long, kind: "long", ...base }; await createPassage(p); made.push("장문"); }

  return NextResponse.json({ ok: true, made, short, long });
}
