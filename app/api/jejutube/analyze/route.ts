/**
 * 제주tube 영상 등록 — 로그인 유저 누구나
 * 분석 결과는 공유 풀(jejutube_videos)에 저장되어 모든 유저에게 보임.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { analyzeAndSaveVideo, countTodayByUser } from "@/lib/jejutube-analyze";
import { checkUsage, consumeUsage, resolveUser } from "@/lib/usage";

export const runtime = "nodejs";
export const maxDuration = 120;

const DAILY_LIMIT = 5; // 1인당 하루 분석 한도 (SocialKit·Gemini 비용 보호)

export async function POST(req: NextRequest) {
  const auth = await verifyFirebaseToken(req.headers.get("Authorization"));
  if (!auth) {
    return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });
  }
  const user = await resolveUser(auth, null); // 로그인 필수라 auth 항상 존재

  const { url } = (await req.json()) as { url?: string };
  if (!url) return NextResponse.json({ error: "URL을 입력해주세요" }, { status: 400 });

  // 기존 하루 5개 제한 (비용 1차 방어)
  try {
    const todayCount = await countTodayByUser(auth.uid);
    if (todayCount >= DAILY_LIMIT) {
      return NextResponse.json(
        { error: `하루 ${DAILY_LIMIT}개까지 등록할 수 있어요. 내일 다시 시도해주세요!` },
        { status: 429 }
      );
    }
  } catch { /* 한도 체크 실패 시 통과 */ }

  // 요금제 월 한도 사전 확인 (소비는 신규 분석일 때만 — dedup은 비용 0이라 무료)
  const chk = await checkUsage({ ...user, feature: "ytExtract" });
  if (!chk.allowed) {
    return NextResponse.json(
      {
        error: "이번 달 제주tube 추출 횟수를 모두 사용했어요. 다음 달에 충전돼요.",
        gated: true, used: chk.used, limit: chk.limit,
      },
      { status: 429 }
    );
  }

  const result = await analyzeAndSaveVideo(url, auth);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  // 신규 분석(비용 발생)만 월 카운터 소비 — 공유풀 dedup은 차감 안 함
  if (!result.alreadyExists) {
    await consumeUsage({ ...user, feature: "ytExtract" }).catch(() => { /* 소비 실패는 무시 */ });
  }

  return NextResponse.json({ ...result.video, alreadyExists: result.alreadyExists });
}
