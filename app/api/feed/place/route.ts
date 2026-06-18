/**
 * 피드 업로드 — GPS 좌표로 근처 업소 후보 찾기 (카카오 카테고리 검색).
 * "이 업소 맞습니까?" 확인용. 피드 업로드는 빈도가 낮아 쿼터 부담 적음.
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY;

type Candidate = { name: string; category: string; distance: number; address: string };

export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lng = Number(req.nextUrl.searchParams.get("lng"));
  if (!lat || !lng) return NextResponse.json({ candidates: [] });
  if (!KAKAO_KEY) return NextResponse.json({ candidates: [] });

  // 매장(음식점/카페)은 가까이(80m), 관광명소(오름·해변·명소 AT4)는 대상이 넓어 좌표가 멀 수 있어 크게(700m).
  async function search(code: string, radius: number): Promise<Candidate[]> {
    try {
      const url = `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=${code}&x=${lng}&y=${lat}&radius=${radius}&sort=distance&size=5`;
      const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` }, signal: AbortSignal.timeout(5000) });
      if (!res.ok) return [];
      const data = (await res.json()) as { documents?: Array<{ place_name: string; category_name: string; distance: string; road_address_name?: string; address_name?: string }> };
      return (data.documents ?? []).map((d) => ({
        name: d.place_name,
        category: d.category_name.split(">").pop()?.trim() ?? "",
        distance: Number(d.distance) || 0,
        address: d.road_address_name || d.address_name || "",
      }));
    } catch {
      return [];
    }
  }

  // FD6 음식점, CE7 카페, AT4 관광명소(오름·해변·명소 등)
  const [food, cafe, attraction] = await Promise.all([
    search("FD6", 80),
    search("CE7", 80),
    search("AT4", 700),
  ]);
  const candidates = [...food, ...cafe, ...attraction]
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 6);

  return NextResponse.json({ candidates });
}
