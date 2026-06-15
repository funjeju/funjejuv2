import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCardNewsConfig, setWeatherCameras } from "@/lib/cardnews-config";

export const runtime = "nodejs";

async function isAdmin(): Promise<boolean> {
  const c = await cookies();
  return c.get("admin_auth")?.value === process.env.ADMIN_SECRET;
}

/** 카드뉴스 설정 조회 */
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getCardNewsConfig());
}

/** 실시간 날씨 카메라 저장 — { weatherCameraIds: string[] } */
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { weatherCameraIds?: unknown };
  const ids = Array.isArray(body.weatherCameraIds)
    ? body.weatherCameraIds.filter((x): x is string => typeof x === "string").slice(0, 12)
    : [];
  await setWeatherCameras(ids);
  return NextResponse.json({ ok: true, weatherCameraIds: ids });
}
