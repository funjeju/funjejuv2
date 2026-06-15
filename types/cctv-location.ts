/**
 * CCTV 지역 SEO 데이터 — "[지역]날씨 / [지역]cctv" 롱테일 노출용.
 * Firestore `cctv_locations` 컬렉션(문서 id = 실제 cctv id). 어드민에서 편집.
 * id/URL은 절대 바꾸지 않음(색인 자산). locations.json은 시드 소스.
 */

export type CctvFaq = { q: string; a: string };

export type CctvLocation = {
  /** 실제 cctv id (= /cctv/{id} URL · 절대 변경 금지) */
  id: string;
  formal: string;          // 정식명 (예: 월정리)
  short: string;           // 약칭 (예: 월정)
  facility: string[];      // 시설명/별칭
  /** 지역군 — 테마 허브 그룹핑 키 */
  group: string;           // 동부해안/서부해안/남부서귀포/한라산중산간/명소섬/도심공항
  lat?: number;
  lng?: number;
  /** ★evergreen — "지금 날씨"가 아니라 이 지역의 변하지 않는 기후·지형 특성만 */
  weatherNote: string;
  checkPoints: string[];   // 이 CCTV로 볼 수 있는 것
  faq: CctvFaq[];          // 질문형 롱테일 3~5개
  nearby: string[];        // 인근 cctv id (실제 id · 내부링크)
  /** title 맨 앞 형태 오버라이드 (없으면 formal) */
  titleLead?: string;
  /** AI/템플릿 보완분 → 사람 검수 필요 */
  needsReview?: boolean;
  /** 실제 콘텐츠가 바뀐 ISO 날짜 — sitemap lastmod용(가짜 갱신 금지) */
  updatedAt?: string;
};

export const CCTV_GROUPS = [
  "동부해안",
  "서부해안",
  "남부서귀포",
  "한라산중산간",
  "명소섬",
  "도심공항",
] as const;

export type CctvGroup = (typeof CCTV_GROUPS)[number];

/** 그룹 → 허브 페이지 메타 (테마 허브용) */
export const GROUP_HUB: Record<string, { slug: string; title: string; emoji: string; desc: string }> = {
  "동부해안":     { slug: "east",    title: "제주 동부해안 실시간 CCTV",   emoji: "🌊", desc: "월정리·함덕·김녕 등 제주 동쪽 해안 실시간 날씨" },
  "서부해안":     { slug: "west",    title: "제주 서부해안 실시간 CCTV",   emoji: "🏖️", desc: "협재·곽지·한림 등 제주 서쪽 해안 실시간 날씨" },
  "남부서귀포":   { slug: "south",   title: "서귀포 실시간 CCTV",          emoji: "🌅", desc: "중문·성산·서귀포 등 남부 실시간 날씨" },
  "한라산중산간": { slug: "hallasan", title: "한라산·중산간 실시간 CCTV",  emoji: "⛰️", desc: "1100고지·백록담·윗세 등 한라산 실시간 설경·안개" },
  "명소섬":       { slug: "island",  title: "우도·섬 실시간 CCTV",         emoji: "🛥️", desc: "우도·추자 등 섬 실시간 날씨·뱃길" },
  "도심공항":     { slug: "city",    title: "제주공항·도심 실시간 CCTV",   emoji: "✈️", desc: "제주공항·도심 실시간 날씨·바람" },
};
