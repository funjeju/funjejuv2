// AI 여행일정 공유 타입

export type TripItem = {
  time: string;            // "HH:MM"
  name: string;
  type: string;            // 맛집/카페/관광지/자연/액티비티/쇼핑/문화/숙소
  emoji: string;
  comment: string;         // 돌AI 한 줄 멘트
  duration: string;        // 체류 시간 예: "1시간"
  searchKeyword: string;   // 카카오맵 검색용 키워드
  isDominFood: boolean;    // 도민맛집 여부
  restaurantId?: string;   // 도민맛집 ID (/food/{id} 링크용)
  thumbnail?: string | null;
  address?: string;
  lat?: number;
  lng?: number;
};

export type TripDay = {
  day: number;
  theme: string;
  items: TripItem[];
};

export type TripPlan = {
  title: string;
  overview: string;
  days: TripDay[];
  tips: string[];
  closing: string;
};

/** 예약 숙소 — 카카오 숙박 검색으로 확정 (좌표 포함 시 동선 앵커로 사용) */
export type BookedAccommodation = {
  name: string;
  nights: number;       // 이 숙소에서 몇 박인지
  address?: string;
  lat?: number;
  lng?: number;
};

/** Firestore에 저장된 일정 (users/{uid}/tripPlans/{id}) */
export type SavedTripPlan = {
  id: string;
  title: string;
  nights: number;
  days: number;
  transportation: string;
  createdAt: number; // epoch ms
  plan: TripPlan;
};

export type TripPlanRequest = {
  mode: "rough" | "detailed";
  nights: number;
  days: number;
  arrivalTime: string;     // "10:00"
  departureTime: string;   // "18:00"
  companions: string[];
  transportation: string;
  // detailed 전용
  accommodationStatus?: "booked" | "not_booked";
  bookedAccommodations?: BookedAccommodation[];
  remainingNightsPlan?: "stay_at_first" | "recommend_rest";
  tripStyle?: string;
  accommodationRecommendationStyle?: "base_camp" | "daily_move";
  preferredAccommodationRegion?: string;
  accommodationType?: string[];
  accommodationBudget?: string;
  pace?: string;
  interestWeights?: { [key: string]: number };
  restaurantStyle?: string;
  mustVisitRestaurants?: string[];
  mustVisitSpots?: string[];
  /** 마이페이지에 저장해둔 마이스팟 중 이번 여행에 선택한 것 (좌표 포함 → 동선 배치에 사용) */
  mySpots?: Array<{ name: string; category: string; lat: number; lng: number }>;
};
