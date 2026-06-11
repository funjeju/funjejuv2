/**
 * 어드민 제주tube 관리 — 등록(한도 없음)·전체 목록·삭제
 * 분석 파이프라인은 lib/jejutube-analyze.ts 공용 (유저 등록 API와 동일)
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminDb } from "@/lib/firebase-admin";
import { analyzeAndSaveVideo } from "@/lib/jejutube-analyze";

export const runtime = "nodejs";
export const maxDuration = 120;

async function authCheck(): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("admin_auth")?.value;
  if (!authCookie || authCookie !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function POST(req: NextRequest) {
  const unauth = await authCheck();
  if (unauth) return unauth;

  const { url } = (await req.json()) as { url?: string };
  if (!url) return NextResponse.json({ error: "URL을 입력해주세요" }, { status: 400 });

  const result = await analyzeAndSaveVideo(url);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ...result.video, alreadyExists: result.alreadyExists });
}

export async function GET() {
  const unauth = await authCheck();
  if (unauth) return unauth;
  try {
    const db = getAdminDb();
    const snap = await db.collection("jejutube_videos").orderBy("createdAt", "desc").get();
    return NextResponse.json({ videos: snap.docs.map((d) => d.data()) });
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 200) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const unauth = await authCheck();
  if (unauth) return unauth;
  const { videoId } = (await req.json()) as { videoId?: string };
  if (!videoId) return NextResponse.json({ error: "videoId 필요" }, { status: 400 });
  try {
    const db = getAdminDb();
    await db.collection("jejutube_videos").doc(videoId).delete();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 200) }, { status: 500 });
  }
}
