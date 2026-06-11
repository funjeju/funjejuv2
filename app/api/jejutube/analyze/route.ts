/**
 * 제주tube 영상 등록 — 로그인 유저 누구나
 * 분석 결과는 공유 풀(jejutube_videos)에 저장되어 모든 유저에게 보임.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { analyzeAndSaveVideo, countTodayByUser } from "@/lib/jejutube-analyze";

export const runtime = "nodejs";
export const maxDuration = 120;

const DAILY_LIMIT = 5; // 1인당 하루 분석 한도 (SocialKit·Gemini 비용 보호)

export async function POST(req: NextRequest) {
  const user = await verifyFirebaseToken(req.headers.get("Authorization"));
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });
  }

  const { url } = (await req.json()) as { url?: string };
  if (!url) return NextResponse.json({ error: "URL을 입력해주세요" }, { status: 400 });

  try {
    const todayCount = await countTodayByUser(user.uid);
    if (todayCount >= DAILY_LIMIT) {
      return NextResponse.json(
        { error: `하루 ${DAILY_LIMIT}개까지 등록할 수 있어요. 내일 다시 시도해주세요!` },
        { status: 429 }
      );
    }
  } catch { /* 한도 체크 실패 시 통과 */ }

  const result = await analyzeAndSaveVideo(url, user);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ...result.video, alreadyExists: result.alreadyExists });
}
