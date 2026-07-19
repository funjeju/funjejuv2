import "server-only";
import { getSite } from "@/lib/biz/store";
import type { MySpotCategory } from "@/types/my-spot";

/** 게임(틀린그림·삼행시 등) 아래 CTA/마이스팟용 스팟 데이터 */
export type GameSpot = {
  id: string;
  name: string;
  category: MySpotCategory;
  lat: number;
  lng: number;
  address?: string;
  imageUrl?: string;
  detailUrl?: string;
};

export function toMySpotCategory(cat?: string): MySpotCategory {
  const c = cat ?? "";
  if (/카페|커피|디저트|베이커리|브런치/.test(c)) return "카페";
  if (/숙소|호텔|펜션|게스트|민박|리조트/.test(c)) return "숙소";
  if (/관광|명소|여행|체험|해변|오름/.test(c)) return "여행지";
  return "맛집";
}

/**
 * 연결 홈페이지가 내부 /biz/슬러그면 그 비즈 사이트에서 좌표·업체명·카테고리를 가져와
 * 마이스팟 찜 가능한 GameSpot으로 변환. 외부 URL이거나 좌표 없으면 null.
 */
export async function resolveGameSpot(opts: {
  spotId: string;
  homepageUrl?: string;
  homepageName?: string;
  fallbackName: string;
}): Promise<GameSpot | null> {
  const { spotId, homepageUrl, homepageName, fallbackName } = opts;
  if (!homepageUrl?.startsWith("/biz/")) return null;
  const slug = homepageUrl.split("/biz/")[1]?.split(/[/?#]/)[0];
  if (!slug) return null;
  try {
    const site = await getSite(slug);
    const co = site?.merchantInfo?.coordinates;
    if (!site || !co?.lat || !co?.lng) return null;
    return {
      id: spotId,
      name: site.merchantInfo.name || homepageName || fallbackName,
      category: toMySpotCategory(site.merchantInfo.category),
      lat: co.lat,
      lng: co.lng,
      address: site.merchantInfo.address,
      imageUrl: site.contentAssets?.heroImage || site.contentAssets?.logoImage || undefined,
      detailUrl: `/biz/${slug}`,
    };
  } catch {
    return null;
  }
}
