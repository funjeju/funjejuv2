/** 타자연습 세트 — 유저용. GET 주간순위(+내 도전횟수) / POST 평균점수 제출 */
import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { resolveUser } from "@/lib/usage";
import { getSet, submitSetScore, getUserSetAttempts, setWeeklyTop } from "@/lib/typing";

export const runtime = "nodejs";

async function uid(req: NextRequest): Promise<string> {
  const auth = await verifyFirebaseToken(req.headers.get("authorization"));
  const u = await resolveUser(auth, req.headers.get("x-anon-id"));
  return u.userId;
}

export async function GET(req: NextRequest) {
  const setId = req.nextUrl.searchParams.get("setId");
  if (!setId) return NextResponse.json({ error: "setId 필요" }, { status: 400 });
  const userId = await uid(req);
  const [top, attempts] = await Promise.all([setWeeklyTop(setId), getUserSetAttempts(setId, userId)]);
  return NextResponse.json({ top, attempts, userId });
}

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as {
    setId?: string; name?: string; avgScore?: number; avgCpm?: number; avgAccuracy?: number;
  };
  if (!b.setId || b.avgScore == null || b.avgCpm == null || b.avgAccuracy == null) {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const set = await getSet(b.setId);
  if (!set || set.status !== "published") return NextResponse.json({ error: "세트 없음" }, { status: 404 });
  const userId = await uid(req);
  const avgScore = Math.max(0, Math.min(2000, Math.round(b.avgScore)));
  const avgCpm = Math.max(0, Math.min(2000, Math.round(b.avgCpm)));
  const avgAccuracy = Math.max(0, Math.min(1, b.avgAccuracy));
  const r = await submitSetScore({
    setId: b.setId, userId, name: (b.name ?? "").trim().slice(0, 20) || "익명",
    avgScore, avgCpm, avgAccuracy, maxAttempts: set.maxAttempts,
  });
  if (r.blocked) return NextResponse.json({ error: "이번 주 도전 횟수를 다 썼어요", ...r }, { status: 429 });
  return NextResponse.json({ ok: true, ...r });
}
