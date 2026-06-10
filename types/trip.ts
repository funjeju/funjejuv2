// AI 여행일정 공유 타입

export type TripItem = {
  time: string;            // "HH:MM"
  name: string;
  type: string;            // 맛집/카페/관광지/자연/액티비티/쇼핑/문화/숙소
  emoji: string;
  comment: string;         // 돌맹이 한 줄 멘트
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
  bookedAccommodations?: string[];
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
};
