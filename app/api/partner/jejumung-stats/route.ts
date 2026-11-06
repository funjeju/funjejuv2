import { NextRequest, NextResponse } from "next/server";
import {
  getDailySectionStats,
  getRecentVisitorCount,
  SECTION_LABELS,
} from "@/lib/firestore-stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 제주멍(jejumung.vercel.app) 관리자 화면의 '펀제주' 탭에 주는 접속 요약.
 *
 * 인증: 제주멍 Firebase(projecthub-97b64)에서 받은 ID 토큰을 Authorization: Bearer 로 받는다.
 * 그 토큰으로 제주멍 RTDB의 stats/admins 를 읽어 본다 — 그 규칙은 관리자만 읽게 되어 있으므로
 * 200이면 '유효한 토큰 + 제주멍 관리자'라는 뜻이다. 그래서 여기에는 비밀값이 없다.
 *
 * 비용: stats_daily 하루 요약 N건 + stats_dwell N건 + 최근 5분 페이지뷰만 읽는다 (원본 전체 스캔 없음).
 */
const JEJUMUNG_DB = "https://projecthub-97b64-default-rtdb.asia-southeast1.firebasedatabase.app";
const ORIGINS = new Set([
  "https://jejumung.vercel.app",
  "http://127.0.0.1:4176",
  "http://localhost:4176",
]);

function cors(req: NextRequest): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  if (!ORIGINS.has(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Authorization",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

async function isJejumungAdmin(token: string): Promise<boolean> {
  if (!/^[A-Za-z0-9._-]{100,4096}$/.test(token)) return false;
  const res = await fetch(`${JEJUMUNG_DB}/stats/admins.json?shallow=true&auth=${token}`, { cache: "no-store" });
  return res.ok;
}

export function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: cors(req) });
}

export async function GET(req: NextRequest) {
  const headers = { ...cors(req), "Cache-Control": "no-store" };
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  try {
    if (!(await isJejumungAdmin(token))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
    }
    const days = Math.min(30, Math.max(1, Number(req.nextUrl.searchParams.get("days")) || 14));
    const [daily, recentVisitors] = await Promise.all([
      getDailySectionStats(days),
      getRecentVisitorCount(5).catch(() => null),
    ]);
    return NextResponse.json(
      { generatedAt: Date.now(), dateBasis: "UTC", sections: SECTION_LABELS, recentVisitors, days: daily },
      { headers },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500, headers },
    );
  }
}
