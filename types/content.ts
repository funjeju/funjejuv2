/**
 * 콘텐츠 엔진 — 자동 발행 콘텐츠 (웹진/모닝브리핑).
 * Firestore `contents` 단일 컬렉션. /webzine/[slug] 등으로 ISR 렌더.
 */

export type ContentType = "webzine" | "briefing" | "card_news";
export type ContentStatus = "draft" | "published";

export type ContentSection = {
  heading: string;
  body: string;
  restaurantId?: string; // 도민맛집 연결 (내부링크/이미지)
  image?: string;
  // 모닝브리핑 뉴스 카드용 — 원문/매체/발행시각/카테고리
  sourceUrl?: string;
  source?: string;
  newsPublishedAt?: string;
  category?: string;
};

export type Content = {
  id: string;
  type: ContentType;
  status: ContentStatus;
  slug: string;
  title: string;
  subtitle: string;
  intro: string;
  sections: ContentSection[];
  keywords: string[];
  coverImage?: string;
  region?: string;
  menu?: string;
  sourceIds: string[]; // 근거가 된 맛집/CCTV id (내부링크 그래프 — 트랙 C)
  createdAt: string;
  publishedAt?: string;
};
