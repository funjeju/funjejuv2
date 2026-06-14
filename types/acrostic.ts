/**
 * 삼행시 짓기 — 업체 상호/메뉴명을 주제로 받아 N행시 댓글을 받고 좋아요로 우승자 결정.
 * acrostic_topics(주제) · acrostic_entries(엔트리) · acrostic_likes(1인1표 중복 차단).
 */

export type AcrosticTopic = {
  id: string;
  word: string;            // 주제 단어 (예: "협재", "흑돼지") — 각 글자가 행의 첫 글자
  businessName?: string;   // 표시용 업체명
  homepageUrl?: string;    // 연결 홈페이지 (/biz/슬러그 또는 외부) — 게임 아래 CTA
  homepageName?: string;
  image?: string;          // 주제 포스터 이미지 URL
  maxEntriesPerUser: number; // 1인 허용 엔트리 수 (출제 시 설정, 기본 1)
  status: "draft" | "published";
  createdAt: number;
  endsAt?: number;         // 마감 시각(epoch ms) — 있으면 카운트다운
  entryCount?: number;
};

export type AcrosticEntry = {
  id: string;
  topicId: string;
  userId: string;          // 로그인 uid 또는 anon_id
  authorName: string;
  lines: string[];         // 각 행 (word 글자 수와 동일)
  likes: number;
  createdAt: number;
  updatedAt?: number;      // 수정 시각
};
