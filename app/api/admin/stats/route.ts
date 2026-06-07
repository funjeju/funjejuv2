import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getActiveSessions,
  cleanupStaleSessions,
  getTodayViews,
  getRecentViews,
} from "@/lib/firestore-stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_auth")?.value !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 만료 세션 정리 (백그라운드)
    cleanupStaleSessions().catch(() => { /* ignore */ });

    const [activeSessions, todayViews, recentViews] = await Promise.all([
      getActiveSessions(),
      getTodayViews(),
      getRecentViews(7),
    ]);

    // 활성 세션 집계
    const activeByCctv: Record<string, { count: number; name: string }> = {};
    const activeByTier: Record<string, number> = { anonymous: 0, free: 0, biz: 0, admin: 0 };
    for (const s of activeSessions) {
      const key = s.cctvId;
      activeByCctv[key] = { count: (activeByCctv[key]?.count ?? 0) + 1, name: s.cctvName };
      activeByTier[s.userTier] = (activeByTier[s.userTier] ?? 0) + 1;
    }

    // 오늘 시청 통계
    const todayByCctv: Record<string, { count: number; totalSec: number; name: string }> = {};
    const todayByTier: Record<string, { count: number; totalSec: number }> = {
      anonymous: { count: 0, totalSec: 0 },
      free: { count: 0, totalSec: 0 },
      biz: { count: 0, totalSec: 0 },
      admin: { count: 0, totalSec: 0 },
    };
    const todayUniqueUsers = new Set<string>();
    for (const v of todayViews) {
      todayUniqueUsers.add(v.userId);
      todayByCctv[v.cctvId] = {
        count: (todayByCctv[v.cctvId]?.count ?? 0) + 1,
        totalSec: (todayByCctv[v.cctvId]?.totalSec ?? 0) + v.durationSec,
        name: v.cctvName,
      };
      const tier = todayByTier[v.userTier];
      if (tier) {
        tier.count++;
        tier.totalSec += v.durationSec;
      }
    }

    // 최근 7일 일자별
    const dailyMap: Record<string, { views: number; users: Set<string>; totalSec: number }> = {};
    for (const v of recentViews) {
      const d = v.date;
      if (!dailyMap[d]) dailyMap[d] = { views: 0, users: new Set(), totalSec: 0 };
      dailyMap[d].views++;
      dailyMap[d].users.add(v.userId);
      dailyMap[d].totalSec += v.durationSec;
    }
    const daily = Object.entries(dailyMap)
      .map(([date, d]) => ({
        date,
        views: d.views,
        uniqueUsers: d.users.size,
        totalSec: d.totalSec,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      now: new Date().toISOString(),
      active: {
        total: activeSessions.length,
        byCctv: Object.entries(activeByCctv)
          .map(([id, v]) => ({ id, name: v.name, count: v.count }))
          .sort((a, b) => b.count - a.count),
        byTier: activeByTier,
      },
      today: {
        totalViews: todayViews.length,
        uniqueUsers: todayUniqueUsers.size,
        byCctv: Object.entries(todayByCctv)
          .map(([id, v]) => ({ id, name: v.name, count: v.count, totalSec: v.totalSec }))
          .sort((a, b) => b.count - a.count),
        byTier: todayByTier,
      },
      daily,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
