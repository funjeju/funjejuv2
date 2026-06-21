/**
 * 미니홈피 상점 카탈로그 — 보말(제주 바다고둥, 가상화폐 🐚)로 구매.
 * Phase: 카탈로그 + UI. 보말 잔액·보유아이템 영속화와 충전(결제 PG)은 다음 단계.
 * 수익 구조: 보말 충전(현금 결제) → 배경·미니미·아이템 구매. [[minihompy-cyworld]]
 */

export type ShopCategory = "background" | "minimi" | "item";

export interface ShopItem {
  id: string;
  category: ShopCategory;
  name: string;
  price: number; // 보말
  emoji: string;
  badge?: string; // 신상·한정 등
  /** 배경/미니미 실제 적용용 에셋 경로(public). 없으면 "적용 준비중". */
  asset?: string;
}

export const SHOP_CATEGORIES: { id: ShopCategory; label: string }[] = [
  { id: "background", label: "🖼️ 커스텀 배경" },
  { id: "minimi", label: "🧍 특별 미니미" },
  { id: "item", label: "🎁 아이템·꾸미기" },
];

export const SHOP_ITEMS: ShopItem[] = [
  // 배경
  { id: "bg-sakura", category: "background", name: "벚꽃길 배경", price: 300, emoji: "🌸", asset: "/minihompy/bg-sakura.png" },
  { id: "bg-sunset", category: "background", name: "제주 노을 배경", price: 300, emoji: "🌅", asset: "/minihompy/bg-sunset.png" },
  { id: "bg-snow", category: "background", name: "한라산 설경", price: 500, emoji: "🏔️", badge: "겨울한정", asset: "/minihompy/bg-snow.png" },
  { id: "bg-night", category: "background", name: "제주 별밤", price: 500, emoji: "🌌", asset: "/minihompy/bg-night.png" },
  { id: "bg-custom", category: "background", name: "내 사진 배경 업로드", price: 800, emoji: "📷", badge: "PRO" },
  // 미니미
  { id: "mm-yuchae", category: "minimi", name: "유채꽃 미니미", price: 200, emoji: "🌼" },
  { id: "mm-santa", category: "minimi", name: "산타 미니미", price: 400, emoji: "🎅", badge: "한정", asset: "/minihompy/sprites/mm-santa.png" },
  { id: "mm-diver", category: "minimi", name: "스쿠버 미니미", price: 400, emoji: "🤿", asset: "/minihompy/sprites/mm-diver.png" },
  // 아이템
  { id: "it-hat", category: "item", name: "밀짚모자", price: 100, emoji: "👒" },
  { id: "it-sunglass", category: "item", name: "선글라스", price: 100, emoji: "🕶️" },
  { id: "it-balloon", category: "item", name: "풍선 세트", price: 150, emoji: "🎈" },
  { id: "it-pet", category: "item", name: "흑돼지 펫", price: 350, emoji: "🐷", badge: "인기" },
];

// 보말 충전 팩 (실제 결제 PG 연동은 다음 단계 — 현재 안내만)
export const BOMAL_PACKS = [
  { bomal: 100, won: 1000 },
  { bomal: 550, won: 5000, bonus: "+10%" },
  { bomal: 1200, won: 10000, bonus: "+20%" },
];
