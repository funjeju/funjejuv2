// 도슨트 챗봇 카드 타입 (서버 SSE ↔ 클라이언트 공유)

/** 도민맛집 추천 카드 */
export type DominCard = {
  id: string;
  name: string;
  region: string;
  menu: string;
  thumbnail?: string | null;
  address?: string;
  lat?: number;
  lng?: number;
  distanceKm?: number;
};

/** AI 검색 추천 카드 */
export type AiSpotCard = {
  name: string;
  reason: string;       // 추천 이유 한 줄
  address?: string;
  lat?: number;
  lng?: number;
  distanceKm?: number;
};
