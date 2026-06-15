/**
 * CCTV 지역 SEO 데이터 — "[지역]날씨 / [지역]cctv" 롱테일 노출용.
 * Firestore `cctv_locations` 컬렉션(문서 id = 실제 cctv id). 어드민에서 편집.
 * id/URL은 절대 바꾸지 않음(색인 자산). locations.json은 시드 소스.
 */

export type CctvFaq = { q: string; a: string };

/** CCTV가 실제 비추는 대상 — 글 틀(확인포인트·FAQ 방향)을 결정 */
export type CctvViewType =
  | "beach"     // 해변·해수욕장 — 파도·물빛·혼잡·일몰
  | "port"      // 항·포구 — 배 출입·물때·선박
  | "mountain"  // 한라산·오름 — 적설·상고대·안개·시야
  | "landmark"  // 일출·랜드마크 — 일출·관람객·하늘
  | "city"      // 도심·해안도로 — 교통·혼잡·하늘
  | "airport"   // 공항 — 바람·시정·결항 단서
  | "island";   // 섬 — 배 운항·날씨·파고

export type CctvNearbySpot = { name: string; distance: string; type: string };

export type CctvLocation = {
  /** 실제 cctv id (= /cctv/{id} URL · 절대 변경 금지) */
  id: string;
  formal: string;          // 정식명 (예: 월정리)
  short: string;           // 약칭 (예: 월정)
  facility: string[];      // 시설명/별칭
  /** CCTV가 비추는 대상 유형 — 확인포인트·FAQ 틀 결정 */
  viewType: CctvViewType;
  /** 지역군 — 테마 허브 그룹핑 키 */
  group: string;           // 동부해안/서부해안/남부서귀포/한라산중산간/명소섬/도심공항
  /** 행정구역 전체 (헤비 키워드 — 예: 제주시 애월읍 곽지리) */
  region?: string;
  lat?: number;
  lng?: number;
  /** ★[B] 지역 소개(관광) — visitjeju 등 사실 기반·펀제주 재작성(복붙 금지). 비중 큼 */
  about?: string;
  /** ★[B] 주변 가볼만한 곳 — 관광 키워드/코스 */
  nearbySpots?: CctvNearbySpot[];
  /** ★evergreen — "지금 날씨"가 아니라 이 지역의 변하지 않는 기후·지형 특성만 */
  weatherNote: string;
  checkPoints: string[];   // 이 CCTV로 볼 수 있는 것 (view_type별)
  faq: CctvFaq[];          // 질문형 롱테일 — 날씨 + 관광 섞기
  /** [F] 가는 길·주차 팁 */
  access?: string;
  nearby: string[];        // 인근 cctv id (실제 id · 내부링크)
  /** title 맨 앞 형태 오버라이드 (없으면 formal) */
  titleLead?: string;
  /** 관광 사실 출처 메모 (예: visitjeju.net + funjeju intro) */
  source?: string;
  /** AI/템플릿 보완분 → 사람 검수 필요 */
  needsReview?: boolean;
  /** 실제 콘텐츠가 바뀐 ISO 날짜 — sitemap lastmod용(가짜 갱신 금지) */
  updatedAt?: string;
};

/** view_type → 기본 확인포인트 + FAQ 방향 힌트 (글 틀) */
export const VIEW_TYPE_META: Record<CctvViewType, { label: string; emoji: string; checkHints: string[]; faqHints: string[] }> = {
  beach:    { label: "해변·해수욕장", emoji: "🏖️", checkHints: ["파도 높이와 바다 색(물놀이 가능 여부)", "바람 세기", "일몰 노을", "해변·주차장 혼잡도"], faqHints: ["물놀이 되나요", "일몰 시간", "주차"] },
  port:     { label: "항·포구",       emoji: "⚓", checkHints: ["배 출입·정박 상태", "물때(간조·만조)", "파도·너울", "낚시 여건"], faqHints: ["배 뜨나요", "물때", "낚시·방파제"] },
  mountain: { label: "한라산·오름",   emoji: "⛰️", checkHints: ["적설·상고대 상태", "안개·운무 시야", "노면 결빙", "탐방로 상태"], faqHints: ["눈 쌓였나요", "통제·결빙", "등반 복장"] },
  landmark: { label: "일출·랜드마크", emoji: "🌅", checkHints: ["일출·일몰 시간대 하늘", "관람객 혼잡도", "구름·해무 상태"], faqHints: ["일출 시간", "포토스팟", "혼잡"] },
  city:     { label: "도심·해안도로", emoji: "🚗", checkHints: ["교통·혼잡 상황", "하늘·노을 상태", "바람"], faqHints: ["드라이브·해안도로", "카페", "노을"] },
  airport:  { label: "공항·교통",     emoji: "✈️", checkHints: ["바람 세기(결항 단서)", "눈·비·안개 등 시정", "하늘 구름"], faqHints: ["비행기 뜨나요", "바람", "결항"] },
  island:   { label: "섬",            emoji: "🛥️", checkHints: ["항구 파도·너울(배 운항)", "바람·파고", "해무·시야"], faqHints: ["배 운항·입도", "파고", "날씨"] },
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
