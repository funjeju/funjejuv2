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

  // 음식점(FD6) + 카페(CE7) 반경 80m, 가까운 순
  async function search(code: string): Promise<Candidate[]> {
    try {
      const url = `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=${code}&x=${lng}&y=${lat}&radius=80&sort=distance&size=5`;
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

  const [food, cafe] = await Promise.all([search("FD6"), search("CE7")]);
  const candidates = [...food, ...cafe]
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5);

  return NextResponse.json({ candidates });
}
