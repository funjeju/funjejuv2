// 마이스팟 — 마이페이지에서 저장하는 개인 스팟 (여행 설계에 활용)

export type MySpotCategory = "맛집" | "카페" | "여행지" | "숙소";
export type MySpotDirection = "동" | "서" | "남" | "북";

export type MySpot = {
  id: string;
  name: string;
  category: MySpotCategory;
  direction: MySpotDirection;   // 좌표 기반 자동 분류
  address?: string;
  lat: number;
  lng: number;
  source: "search" | "jejutube" | "feed" | "food"; // 카카오 검색 / 제주tube / 피드 / 도민맛집
  createdAt: number;             // epoch ms
};

export const MY_SPOT_CATEGORIES: MySpotCategory[] = ["맛집", "카페", "여행지", "숙소"];
export const MY_SPOT_DIRECTIONS: MySpotDirection[] = ["동", "서", "남", "북"];

export const CATEGORY_EMOJI: Record<MySpotCategory, string> = {
  맛집: "🍴", 카페: "☕", 여행지: "🏞️", 숙소: "🏨",
};
export const DIRECTION_EMOJI: Record<MySpotDirection, string> = {
  동: "🌅", 서: "🌇", 남: "🏝️", 북: "🌊",
};

/** 좌표 → 제주 동/서/남/북 자동 분류 */
export function coordToDirection(lat: number, lng: number): MySpotDirection {
  if (lng >= 126.7) return "동";
  if (lng <= 126.35) return "서";
  return lat >= 33.38 ? "북" : "남";
}
