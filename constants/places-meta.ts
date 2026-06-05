/** 관광지 데이터의 카테고리·지역 메타데이터 */

export type CategoryMeta = {
  id: string;
  label: string;
  emoji: string;
  color: string;
  group: "관광" | "자연" | "문화" | "맛집" | "숙박" | "쇼핑";
};

/** 주요 카테고리 — 사용자가 가장 많이 찾는 순서 */
export const CATEGORIES: CategoryMeta[] = [
  { id: "Beach",         label: "해변",      emoji: "🏖️", color: "bg-blue-100 text-blue-700",     group: "자연" },
  { id: "Mountain",      label: "산·산악",   emoji: "⛰️", color: "bg-green-100 text-green-700",   group: "자연" },
  { id: "Oroom",         label: "오름",      emoji: "🌋", color: "bg-emerald-100 text-emerald-700", group: "자연" },
  { id: "Waterfall",     label: "폭포",      emoji: "💦", color: "bg-cyan-100 text-cyan-700",     group: "자연" },
  { id: "Forest",        label: "숲·트레킹", emoji: "🌲", color: "bg-lime-100 text-lime-700",     group: "자연" },
  { id: "Park",          label: "공원",      emoji: "🌳", color: "bg-teal-100 text-teal-700",     group: "자연" },
  { id: "Garden",        label: "정원·식물원", emoji: "🌷", color: "bg-pink-100 text-pink-700",   group: "자연" },
  { id: "Sunset",        label: "노을 명소", emoji: "🌅", color: "bg-orange-100 text-orange-700", group: "자연" },
  { id: "Attraction",    label: "관광지",    emoji: "🏝️", color: "bg-sky-100 text-sky-700",       group: "관광" },
  { id: "Drive",         label: "드라이브",  emoji: "🚗", color: "bg-indigo-100 text-indigo-700", group: "관광" },
  { id: "PhotoSpot",     label: "포토 스팟", emoji: "📸", color: "bg-rose-100 text-rose-700",     group: "관광" },
  { id: "Activity",      label: "액티비티",  emoji: "🏄", color: "bg-amber-100 text-amber-700",   group: "관광" },
  { id: "Museum",        label: "박물관",    emoji: "🏛️", color: "bg-stone-100 text-stone-700",   group: "문화" },
  { id: "Gallery",       label: "갤러리",    emoji: "🎨", color: "bg-violet-100 text-violet-700", group: "문화" },
  { id: "Exhibition",    label: "전시",      emoji: "🖼️", color: "bg-fuchsia-100 text-fuchsia-700", group: "문화" },
  { id: "Performance",   label: "공연",      emoji: "🎭", color: "bg-purple-100 text-purple-700", group: "문화" },
  { id: "Culture",       label: "문화",      emoji: "🏯", color: "bg-amber-100 text-amber-800",   group: "문화" },
  { id: "History",       label: "역사",      emoji: "📜", color: "bg-yellow-100 text-yellow-800", group: "문화" },
  { id: "Traditional",   label: "전통",      emoji: "🏘️", color: "bg-red-100 text-red-700",       group: "문화" },
  { id: "Festival",      label: "축제",      emoji: "🎉", color: "bg-pink-100 text-pink-700",     group: "문화" },
  { id: "Cafe",          label: "카페",      emoji: "☕", color: "bg-yellow-100 text-yellow-700", group: "맛집" },
  { id: "Restaurant",    label: "맛집",      emoji: "🍽️", color: "bg-red-100 text-red-700",       group: "맛집" },
  { id: "Accommodation", label: "숙소",      emoji: "🏨", color: "bg-blue-100 text-blue-800",     group: "숙박" },
  { id: "Shopping",      label: "쇼핑",      emoji: "🛍️", color: "bg-purple-100 text-purple-700", group: "쇼핑" },
  { id: "Market",        label: "시장",      emoji: "🏪", color: "bg-orange-100 text-orange-800", group: "쇼핑" },
];

export const CATEGORY_GROUPS = ["자연", "관광", "문화", "맛집", "숙박", "쇼핑"] as const;

export function getCategoryMeta(id: string): CategoryMeta | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

/** 지역 (제주시 / 서귀포시 분류) */
export type RegionMeta = { id: string; label: string; city: "제주시" | "서귀포시" };

export const REGIONS: RegionMeta[] = [
  // 제주시
  { id: "제주시 동(洞) 지역", label: "제주시 시내", city: "제주시" },
  { id: "애월읍",              label: "애월읍",      city: "제주시" },
  { id: "구좌읍",              label: "구좌읍",      city: "제주시" },
  { id: "조천읍",              label: "조천읍",      city: "제주시" },
  { id: "한림읍",              label: "한림읍",      city: "제주시" },
  { id: "한경면",              label: "한경면",      city: "제주시" },
  { id: "우도면",              label: "우도",        city: "제주시" },
  // 서귀포시
  { id: "서귀포시 동(洞) 지역", label: "서귀포 시내", city: "서귀포시" },
  { id: "안덕면",              label: "안덕면",      city: "서귀포시" },
  { id: "성산읍",              label: "성산읍",      city: "서귀포시" },
  { id: "남원읍",              label: "남원읍",      city: "서귀포시" },
  { id: "대정읍",              label: "대정읍",      city: "서귀포시" },
  { id: "표선면",              label: "표선면",      city: "서귀포시" },
];

export function getRegionsByCity(city: "제주시" | "서귀포시"): RegionMeta[] {
  return REGIONS.filter((r) => r.city === city);
}

/** 정렬 옵션 */
export const SORT_OPTIONS = [
  { id: "default",  label: "추천순" },
  { id: "name",     label: "이름순" },
  { id: "withPets", label: "반려동물 가능" },
  { id: "withKids", label: "아이 동반 가능" },
] as const;

export type SortOption = typeof SORT_OPTIONS[number]["id"];
