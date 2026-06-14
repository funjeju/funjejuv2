/** 타자연습 — 유저용. GET 주간순위(+내 도전횟수) / POST 점수 제출 */
import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { resolveUser } from "@/lib/usage";
import { getPassage, submitScore, getUserAttempts, weeklyTop } from "@/lib/typing";

export const runtime = "nodejs";

async function uid(req: NextRequest): Promise<string> {
  const auth = await verifyFirebaseToken(req.headers.get("authorization"));
  const u = await resolveUser(auth, req.headers.get("x-anon-id"));
  return u.userId;
}

export async function GET(req: NextRequest) {
  const passageId = req.nextUrl.searchParams.get("passageId");
  if (!passageId) return NextResponse.json({ error: "passageId 필요" }, { status: 400 });
  const userId = await uid(req);
  const [top, attempts] = await Promise.all([weeklyTop(passageId), getUserAttempts(passageId, userId)]);
  return NextResponse.json({ top, attempts, userId });
}

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as {
    passageId?: string; name?: string; cpm?: number; accuracy?: number; score?: number;
  };
  if (!b.passageId || b.cpm == null || b.accuracy == null || b.score == null) {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const passage = await getPassage(b.passageId);
  if (!passage || passage.status !== "published") return NextResponse.json({ error: "지문 없음" }, { status: 404 });
  const userId = await uid(req);
  // 점수 위변조 방어용 클램프 (글자기반 합리 범위)
  const cpm = Math.max(0, Math.min(2000, Math.round(b.cpm)));
  const accuracy = Math.max(0, Math.min(1, b.accuracy));
  const score = Math.max(0, Math.min(2000, Math.round(b.score)));
  const r = await submitScore({
    passageId: b.passageId, userId, name: (b.name ?? "").trim().slice(0, 20) || "익명",
    cpm, accuracy, score, maxAttempts: passage.maxAttempts,
  });
  if (r.blocked) return NextResponse.json({ error: "이번 주 도전 횟수를 다 썼어요", ...r }, { status: 429 });
  return NextResponse.json({ ok: true, ...r });
}
