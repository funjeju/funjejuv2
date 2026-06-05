import { NextRequest, NextResponse } from "next/server";
import { searchPlaces } from "@/lib/firestore-places";

export const runtime = "nodejs";
export const maxDuration = 10;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  try {
    const result = await searchPlaces({
      category: sp.get("category") || undefined,
      region:   sp.get("region")   || undefined,
      q:        sp.get("q")        || undefined,
      withPets: sp.get("withPets") === "true",
      withKids: sp.get("withKids") === "true",
      pageSize: sp.get("pageSize") ? Number(sp.get("pageSize")) : 30,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "검색 실패" },
      { status: 500 }
    );
  }
}
