import { NextResponse } from "next/server";
import { fetchWeather, fetchTide } from "@/lib/weather";

// 항상 라이브(캐시 오염 없이) — ISR 페이지가 실패값을 물고 있어도 클라가 여기서 최신값을 받는다.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat/lng required" }, { status: 400 });
  }

  const [weather, tide] = await Promise.all([
    fetchWeather(lat, lng, { noStore: true }),
    fetchTide(lat, lng, { noStore: true }),
  ]);

  return NextResponse.json(
    { weather, tide },
    // 성공(weather 존재)만 60초 CDN 캐시, 실패는 캐시 금지
    { headers: { "Cache-Control": weather ? "public, s-maxage=60, stale-while-revalidate=300" : "no-store" } },
  );
}
