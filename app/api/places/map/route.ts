import { NextRequest, NextResponse } from "next/server";
import { queryPlacesInBounds } from "@/lib/firestore-places";

export const runtime = "nodejs";
export const maxDuration = 10;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const swLat = Number(sp.get("swLat"));
  const swLng = Number(sp.get("swLng"));
  const neLat = Number(sp.get("neLat"));
  const neLng = Number(sp.get("neLng"));

  if (!swLat || !swLng || !neLat || !neLng) {
    return NextResponse.json({ error: "bounds 파라미터 필요" }, { status: 400 });
  }

  try {
    const places = await queryPlacesInBounds(
      swLat, swLng, neLat, neLng,
      sp.get("category") || undefined,
      300
    );
    // 마커용 최소 데이터만 반환
    const markers = places.map((p) => ({
      id: p.id,
      name: p.place_name,
      lat: p.lat,
      lng: p.lng,
      category: p.categories[0] ?? "Attraction",
      region: p.region,
      img: p.imageUrl,
    }));
    return NextResponse.json({ markers });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "실패" },
      { status: 500 }
    );
  }
}
