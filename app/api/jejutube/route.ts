/** 제주tube 공개 목록 — Admin SDK로 읽어서 규칙 배포 의존성 없음 */

import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
// 등록 즉시 사용자 페이지에 보이도록 동적 응답 + 브라우저 단기 캐시만 사용
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getAdminDb();
    const snap = await db.collection("jejutube_videos").orderBy("createdAt", "desc").limit(50).get();
    return NextResponse.json(
      { videos: snap.docs.map((d) => d.data()) },
      {
        headers: {
          // CDN 캐시 끄고 브라우저 5초 캐시 + 30초 stale → 새 등록 즉시 반영, 짧은 폭주만 흡수
          "Cache-Control": "private, max-age=5, stale-while-revalidate=30",
        },
      }
    );
  } catch (e) {
    console.error("[jejutube] 목록 조회 실패:", e);
    return NextResponse.json({ videos: [] });
  }
}
