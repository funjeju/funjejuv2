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
  /** AEO — 자주 묻는 질문 (FAQPage JSON-LD + 본문 FAQ 섹션). q=질문형, a=40~60자 직답 */
  faqs?: { q: string; a: string }[];
  coverImage?: string;
  /** 사전 렌더된 카드 PNG URL들 (index=카드순서). 있으면 뷰어가 og 재렌더 없이 정적 로드. */
  cardImages?: string[];
  region?: string;
  menu?: string;
  sourceIds: string[]; // 근거가 된 맛집/CCTV id (내부링크 그래프 — 트랙 C)
  createdAt: string;
  publishedAt?: string;
  /** 추가 JSON-LD (예: 여행일정 TouristTrip) — webzine 페이지가 그대로 출력 */
  extraLd?: unknown;
  /** 검수 결과 — 2차 검수팀(AI) 게이트. flagged면 발행 보류, 어드민이 프롬프트로 수정. */
  review?: {
    verdict: "approved" | "flagged";
    issues: string[];        // 검수팀이 지적한 문제 (반려 사유)
    reviewedAt: string;
    rounds: number;          // 자동 검수/수정 라운드 수
    adminNote?: string;      // 어드민이 마지막으로 입력한 수정 지시
  };
};
