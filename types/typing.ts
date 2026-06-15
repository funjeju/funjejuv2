/**
 * 타자연습(제주 매장 타자연습) — 매장/메뉴 설명문을 타이핑하며 각인 + 주간순위.
 * typing_passages(지문) · typing_scores(주간 최고기록, 1인1주 1도큐먼트).
 */

export type TypingPassage = {
  id: string;
  text: string;            // 타이핑할 지문 (매장/메뉴 설명·병맛 단문/장문)
  businessName?: string;
  homepageUrl?: string;    // 게임 아래 CTA
  homepageName?: string;
  kind: "short" | "long";  // 단문/장문
  weightW: number;         // 오타 가중치 (최종점수 = CPM × 정확도^W), 출제 시 설정, 기본 1
  maxAttempts: number;     // 주당 도전 횟수 (0 = 무제한)
  status: "draft" | "published";
  createdAt: number;
  playCount?: number;
};

/** 주간 최고기록 — 문서 id = `${passageId}__${userId}__${weekKey}` */
export type TypingScore = {
  passageId: string;
  userId: string;
  name: string;
  weekKey: string;         // 예: "2026-W24"
  bestScore: number;       // = round(CPM × 정확도^W)
  bestCpm: number;         // 분당 글자수
  bestAccuracy: number;    // 0~1
  attempts: number;        // 이번 주 도전 횟수
  updatedAt: number;
};

/** 묶음 세트 — 단문/장문 여러 지문(권장 5개)을 순서대로 풀고 평균으로 랭킹 */
export type TypingSet = {
  id: string;
  title: string;
  businessName?: string;
  homepageUrl?: string;
  homepageName?: string;
  passageIds: string[];    // 구성 지문 id 목록(권장 5)
  maxAttempts: number;     // 주당 도전 횟수 (0=무제한)
  status: "draft" | "published";
  createdAt: number;
  playCount?: number;
};

/** 세트 주간 최고기록 — 문서 id = `${setId}__${userId}__${weekKey}` */
export type TypingSetScore = {
  setId: string;
  userId: string;
  name: string;
  weekKey: string;
  bestAvgScore: number;    // 5개 최종점수 평균
  bestAvgCpm: number;      // 5개 타수 평균
  bestAvgAccuracy: number; // 5개 정확도 평균
  attempts: number;
  updatedAt: number;
};
