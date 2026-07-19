import { NextResponse } from "next/server";
import { loadAllRestaurants, restaurantImageUrl } from "@/lib/restaurants";

export async function POST(req: Request) {
  try {
    const { foodIds } = (await req.json()) as { foodIds: string[] };
    if (!Array.isArray(foodIds) || foodIds.length === 0) {
      return NextResponse.json({});
    }
    const ids = foodIds.slice(0, 50);
    const all = await loadAllRestaurants();
    const map: Record<string, string> = {};
    for (const id of ids) {
      const r = all.find((x) => x.id === id);
      const thumb = r?.images?.[0] ? restaurantImageUrl(r.images[0]) : undefined;
      if (thumb) map[id] = thumb;
    }
    return NextResponse.json(map);
  } catch {
    return NextResponse.json({}, { status: 500 });
  }
}
