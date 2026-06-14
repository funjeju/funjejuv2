/**
 * 틀린그림찾기 — 제주 이미지 기반 게임.
 * 어드민(또는 비즈계정)이 출제 → 방문자가 플레이 → 문제별 최단시간 랭킹.
 */

/** 정답 좌표 (이미지 대비 % — 어떤 크기에서도 동일) */
export type SpotMarker = { x: number; y: number };

/** 배치: 원본이 세로면 좌우(side), 가로면 상하(stack) */
export type SpotLayout = "side" | "stack";

export type SpotGame = {
  id: string;
  title: string;
  origImage: string;      // Storage URL (원본)
  variantImage: string;   // Storage URL (틀린 부분이 들어간 변형본)
  layout: SpotLayout;
  markers: SpotMarker[];  // 정답 좌표들
  diffCount: number;      // = markers.length
  status: "draft" | "published";
  createdAt: number;
  playCount?: number;
  bizId?: string;         // 비즈계정 연동 (차후)
  homepageUrl?: string;   // 연결 업체 홈페이지 (내부 /biz/slug 또는 외부 URL) — 게임 아래 CTA
  homepageName?: string;  // CTA에 표시할 업체명
};

/** 플레이 기록 (문제별 최단시간 랭킹) */
export type SpotScore = {
  gameId: string;
  name: string;     // 플레이어 닉네임
  timeMs: number;   // 클리어 소요 시간
  createdAt: number;
};

/** 댓글 — 클리어한 플레이어만 작성/열람 (스포일러 방지) */
export type SpotComment = {
  gameId: string;
  name: string;     // 작성자 닉네임
  text: string;     // 댓글 내용
  createdAt: number;
};
