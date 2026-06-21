/**
 * 키우기 광고 — 작물 정의 + 샘플 캠페인.
 * 캠페인 = 광고주가 의뢰한 키우기(상호·링크·작물·성장일수·완성보상 보말).
 * 현재는 코드 샘플. 추후 grow_campaigns 컬렉션 + 어드민 등록으로 확장.
 */

export type CropType = "hallabong" | "heukdwaeji" | "galchi" | "jeonbok";

export const CROPS: Record<CropType, { label: string; emoji: string; verb: string }> = {
  hallabong: { label: "한라봉", emoji: "🍊", verb: "물주기" },
  heukdwaeji: { label: "흑돼지", emoji: "🐷", verb: "먹이주기" },
  galchi: { label: "갈치", emoji: "🐟", verb: "먹이주기" },
  jeonbok: { label: "전복", emoji: "🦪", verb: "돌보기" },
};

export interface Campaign {
  id: string;
  advertiser: string; // 상호
  link: string;
  crop: CropType;
  growthDays: number; // 완성까지 일수(=물주기 횟수)
  reward: number; // 완성 시 유저 보말 보상
  slogan: string;
}

export const GROW_CAMPAIGNS: Campaign[] = [
  { id: "c-seongsan-hallabong", advertiser: "성산 한라봉농장", link: "https://funjeju.com", crop: "hallabong", growthDays: 5, reward: 120, slogan: "탐스러운 한라봉을 길러주세요!" },
  { id: "c-jungmun-heukdwaeji", advertiser: "중문 흑돼지마을", link: "https://funjeju.com", crop: "heukdwaeji", growthDays: 6, reward: 150, slogan: "건강한 흑돼지로 키워주세요!" },
  { id: "c-moseulpo-galchi", advertiser: "모슬포 은갈치", link: "https://funjeju.com", crop: "galchi", growthDays: 5, reward: 120, slogan: "은빛 갈치를 길러주세요!" },
  { id: "c-udo-jeonbok", advertiser: "우도 전복해녀", link: "https://funjeju.com", crop: "jeonbok", growthDays: 7, reward: 200, slogan: "싱싱한 전복을 돌봐주세요!" },
];

export function getCampaign(id: string): Campaign | undefined {
  return GROW_CAMPAIGNS.find((c) => c.id === id);
}
