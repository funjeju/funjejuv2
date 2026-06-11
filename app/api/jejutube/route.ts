/** 제주tube 공개 목록 — Admin SDK로 읽어서 규칙 배포 의존성 없음 */

import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET() {
  try {
    const db = getAdminDb();
    const snap = await db.collection("jejutube_videos").orderBy("createdAt", "desc").limit(50).get();
    return NextResponse.json(
      { videos: snap.docs.map((d) => d.data()) },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch (e) {
    console.error("[jejutube] 목록 조회 실패:", e);
    return NextResponse.json({ videos: [] });
  }
}
