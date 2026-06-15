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

/** 실시간 날씨 카메라 저장 — { weatherAm: string[], weatherPm: string[] } */
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { weatherAm?: unknown; weatherPm?: unknown };
  const clean = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 12) : [];
  const am = clean(body.weatherAm);
  const pm = clean(body.weatherPm);
  await setWeatherCameras(am, pm);
  return NextResponse.json({ ok: true, weatherAm: am, weatherPm: pm });
}
