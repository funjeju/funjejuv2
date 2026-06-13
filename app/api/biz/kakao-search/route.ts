/**
 * 비즈 홈페이지 생성 — 카카오 장소 검색(키워드).
 * 상호명으로 카카오맵을 검색해 정확한 이름·주소·전화·좌표·장소URL 후보를 돌려준다.
 * GET /api/biz/kakao-search?q=상호명
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY;

export type KakaoPlace = {
  name: string;
  category: string;
  phone: string;
  address: string;
  roadAddress: string;
  lat: number;
  lng: number;
  placeUrl: string;
};

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ places: [] });
  if (!KAKAO_KEY) return NextResponse.json({ places: [], error: "kakao key 미설정" });

  // 제주 한정 검색 — 상호만 입력해도 제주권 우선
  const query = /제주/.test(q) ? q : `제주 ${q}`;
  try {
    const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=8`;
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${KAKAO_KEY}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return NextResponse.json({ places: [] });
    const data = (await res.json()) as {
      documents?: Array<{
        place_name: string;
        category_name: string;
        phone: string;
        address_name: string;
        road_address_name: string;
        x: string;
        y: string;
        place_url: string;
      }>;
    };
    const places: KakaoPlace[] = (data.documents ?? []).map((d) => ({
      name: d.place_name,
      category: d.category_name.split(">").pop()?.trim() ?? "",
      phone: d.phone ?? "",
      address: d.address_name ?? "",
      roadAddress: d.road_address_name ?? "",
      lat: Number(d.y) || 0,
      lng: Number(d.x) || 0,
      placeUrl: d.place_url ?? "",
    }));
    return NextResponse.json({ places });
  } catch {
    return NextResponse.json({ places: [] });
  }
}
