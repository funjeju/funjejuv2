/**
 * 펀제주 요금제 정의 — 표시(가격표)와 게이팅(한도)의 단일 기준점.
 *
 * 운영 전략:
 *  - SERVICE_MODE="beta": 시범 기간. 회원은 거의 다 풀림(BETA_MEMBER), 비회원만 제한.
 *    요금제는 "예고"로만 노출 (/pricing). 카운트다운·결제 미적용.
 *  - SERVICE_MODE="live": 정식. users.plan 따라 실제 게이팅 + 결제.
 *
 * 전환은 이 파일 SERVICE_MODE 한 줄(또는 env)만 바꾸면 됨.
 */

export type PlanId = "guest" | "free" | "basic" | "pro" | "biz";

/** 기능별 한도. -1 = 무제한 */
export type PlanLimits = {
  cctvMinutesPerDay: number;   // CCTV 시청 — 스트림·분 (4분할 1분 = 4분 차감)
  maxSplit: number;            // 멀티뷰 최대 분할 수
  ads: boolean;                // 시청 화면 광고 노출 여부
  chatPerDay: number;          // AI 도슨트 챗봇 하루 횟수
  ytExtractPerMonth: number;   // 제주tube 추출 월 횟수
  tripComplexPerMonth: number; // 여행일정 복잡(맞춤)모드 월 횟수
  tripSimplePerMonth: number;  // 여행일정 단순(빠른)모드 월 횟수
  bizTools: boolean;           // 홈페이지 자동생성·CTA·매장 키오스크
};

export type PlanDef = {
  id: PlanId;
  label: string;
  priceMonthly: number;        // 원, 0 = 무료
  tagline: string;
  needsBizVerify?: boolean;    // 사업자 증빙 필요
  highlight?: boolean;         // 추천 강조
  limits: PlanLimits;
  /** 가격표에 보여줄 사람이 읽는 혜택 줄 */
  perks: string[];
};

export const PLANS: Record<PlanId, PlanDef> = {
  guest: {
    id: "guest",
    label: "비회원",
    priceMonthly: 0,
    tagline: "가볍게 둘러보기",
    limits: {
      cctvMinutesPerDay: 10, maxSplit: 1, ads: true,
      chatPerDay: 5, ytExtractPerMonth: 3, tripComplexPerMonth: 0, tripSimplePerMonth: 3,
      bizTools: false,
    },
    perks: ["CCTV 하루 10분", "챗봇 하루 5회", "여행일정 단순 3회", "제주tube 추출 총 3건"],
  },
  free: {
    id: "free",
    label: "무료회원",
    priceMonthly: 0,
    tagline: "로그인하면 이만큼",
    limits: {
      cctvMinutesPerDay: 180, maxSplit: 4, ads: true,
      chatPerDay: 20, ytExtractPerMonth: 3, tripComplexPerMonth: 1, tripSimplePerMonth: -1,
      bizTools: false,
    },
    perks: ["CCTV 하루 3시간 · 4분할", "챗봇 하루 20회", "여행일정 복잡 월 1회", "제주tube 추출 월 3건"],
  },
  basic: {
    id: "basic",
    label: "일반",
    priceMonthly: 9900,
    tagline: "광고 없이 가볍게",
    limits: {
      cctvMinutesPerDay: 540, maxSplit: 4, ads: false,
      chatPerDay: -1, ytExtractPerMonth: 10, tripComplexPerMonth: 3, tripSimplePerMonth: -1,
      bizTools: false,
    },
    perks: ["CCTV 하루 9시간 · 4분할", "광고 제거", "챗봇 무제한", "여행일정 복잡 월 3회", "제주tube 월 10건"],
  },
  pro: {
    id: "pro",
    label: "프로",
    priceMonthly: 19900,
    tagline: "여행 헤비유저용",
    highlight: true,
    limits: {
      cctvMinutesPerDay: 1800, maxSplit: 9, ads: false,
      chatPerDay: -1, ytExtractPerMonth: 30, tripComplexPerMonth: 8, tripSimplePerMonth: -1,
      bizTools: false,
    },
    perks: ["CCTV 하루 30시간 · 9분할", "광고 제거", "챗봇 무제한", "여행일정 복잡 월 8회", "제주tube 월 30건"],
  },
  biz: {
    id: "biz",
    label: "비즈니스",
    priceMonthly: 49900,
    tagline: "매장 디스플레이 + 홍보",
    needsBizVerify: true,
    limits: {
      cctvMinutesPerDay: 3000, maxSplit: 9, ads: false,
      chatPerDay: -1, ytExtractPerMonth: -1, tripComplexPerMonth: 2, tripSimplePerMonth: -1,
      bizTools: true,
    },
    perks: [
      "CCTV 하루 50시간 · 9분할",
      "광고 0 · 매장 키오스크 모드",
      "상호만 입력 → 원페이지 홈페이지 자동생성",
      "라이브피드 CTA 자동생성",
      "제주tube 추출 무제한",
    ],
  },
};

export const PAID_PLAN_ORDER: PlanId[] = ["free", "basic", "pro", "biz"];

// ─────────────────────────────────────────────────────────────
// 운영 모드 — 시범 기간 토글
// ─────────────────────────────────────────────────────────────
export type ServiceMode = "beta" | "live";

/** env로 덮어쓸 수 있게: NEXT_PUBLIC_SERVICE_MODE="live" 면 정식 모드 */
export const SERVICE_MODE: ServiceMode =
  process.env.NEXT_PUBLIC_SERVICE_MODE === "live" ? "live" : "beta";

/**
 * 베타 기간 한도.
 * - 회원: 멀티뷰 9분할 + 넉넉한 시청시간, 나머지 전부 개방 (프로~비즈급 체험)
 * - 비회원: guest 한도 그대로
 */
export const BETA_MEMBER_LIMITS: PlanLimits = {
  cctvMinutesPerDay: 180,      // 하루 3시간(스트림·분) — 베타 원가 통제. 9분할로 보면 ~20분
  maxSplit: 9,
  ads: false,
  chatPerDay: -1,
  ytExtractPerMonth: -1,
  tripComplexPerMonth: -1,
  tripSimplePerMonth: -1,
  bizTools: false,
};
