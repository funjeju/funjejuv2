import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { loadAllRestaurants } from "@/lib/restaurants";

export const runtime = "nodejs";

export async function GET() {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_auth")?.value !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const all = await loadAllRestaurants();
  // 어드민 목록용 간단 요약 (이미지는 단일)
  return NextResponse.json({
    restaurants: all.map((r) => ({
      id: r.id,
      title: r.title,
      region: r.region,
      menu: r.menu,
      thumbnail: r.images?.[0] ? `/restaurant-images/${r.images[0]}` : null,
    })),
  });
}
