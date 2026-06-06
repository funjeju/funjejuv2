import type { Metadata } from "next";
import { PageHeader } from "@/components/common/PageHeader";
import { RestaurantGallery } from "@/components/restaurant/RestaurantGallery";
import { loadMergedRestaurants, getMergedFilters } from "@/lib/restaurants-merged";

export const metadata: Metadata = {
  title: "도민맛집 | FunJeju",
  description:
    "제주 도민이 추천하는 진짜 맛집! 지역별·메뉴별로 검색하고 펀제주 인증 맛집을 만나보세요.",
  openGraph: {
    title: "도민맛집 - FunJeju",
    description: "제주 도민이 추천하는 진짜 맛집",
    type: "website",
    url: "https://funjeju.com/food",
  },
};

// 신규 맛집 반영 위해 60초마다 재생성
export const revalidate = 60;

export default async function FoodPage() {
  const [restaurants, filters] = await Promise.all([
    loadMergedRestaurants(),
    getMergedFilters(),
  ]);

  return (
    <div className="mx-auto max-w-screen-xl px-0 md:px-4 md:py-6">
      <PageHeader
        title="도민맛집"
        subtitle={`제주 도민이 추천하는 ${restaurants.length}곳의 진짜 맛집`}
        emoji="🍽️"
      />
      <RestaurantGallery
        restaurants={restaurants}
        regions={filters.regions}
        menus={filters.menus}
      />
    </div>
  );
}
