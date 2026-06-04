/**
 * 제주도 행정구역 (읍·면·동) + 중심 좌표
 * GPS 기반 자동 지역 매칭에 사용
 */

export type JejuRegion = {
  id: string;
  name: string;            // 표시명: "한림읍"
  fullName: string;        // 전체명: "제주시 한림읍"
  city: "제주시" | "서귀포시";
  type: "읍" | "면" | "동";
  lat: number;
  lng: number;
};

export const JEJU_REGIONS: JejuRegion[] = [
  // ── 제주시 읍·면 ──
  { id: "jeju-hallim", name: "한림읍", fullName: "제주시 한림읍", city: "제주시", type: "읍", lat: 33.411, lng: 126.267 },
  { id: "jeju-aewol", name: "애월읍", fullName: "제주시 애월읍", city: "제주시", type: "읍", lat: 33.464, lng: 126.330 },
  { id: "jeju-gujwa", name: "구좌읍", fullName: "제주시 구좌읍", city: "제주시", type: "읍", lat: 33.531, lng: 126.797 },
  { id: "jeju-jocheon", name: "조천읍", fullName: "제주시 조천읍", city: "제주시", type: "읍", lat: 33.540, lng: 126.638 },
  { id: "jeju-hangyeong", name: "한경면", fullName: "제주시 한경면", city: "제주시", type: "면", lat: 33.345, lng: 126.181 },
  { id: "jeju-chuja", name: "추자면", fullName: "제주시 추자면", city: "제주시", type: "면", lat: 33.957, lng: 126.298 },
  { id: "jeju-udo", name: "우도면", fullName: "제주시 우도면", city: "제주시", type: "면", lat: 33.503, lng: 126.952 },

  // ── 제주시 동 ──
  { id: "jeju-ildo", name: "일도동", fullName: "제주시 일도동", city: "제주시", type: "동", lat: 33.512, lng: 126.531 },
  { id: "jeju-ido", name: "이도동", fullName: "제주시 이도동", city: "제주시", type: "동", lat: 33.504, lng: 126.530 },
  { id: "jeju-samdo", name: "삼도동", fullName: "제주시 삼도동", city: "제주시", type: "동", lat: 33.512, lng: 126.519 },
  { id: "jeju-yongdam", name: "용담동", fullName: "제주시 용담동", city: "제주시", type: "동", lat: 33.516, lng: 126.505 },
  { id: "jeju-geonip", name: "건입동", fullName: "제주시 건입동", city: "제주시", type: "동", lat: 33.516, lng: 126.530 },
  { id: "jeju-hwabuk", name: "화북동", fullName: "제주시 화북동", city: "제주시", type: "동", lat: 33.518, lng: 126.580 },
  { id: "jeju-samyang", name: "삼양동", fullName: "제주시 삼양동", city: "제주시", type: "동", lat: 33.524, lng: 126.598 },
  { id: "jeju-bongae", name: "봉개동", fullName: "제주시 봉개동", city: "제주시", type: "동", lat: 33.477, lng: 126.598 },
  { id: "jeju-ara", name: "아라동", fullName: "제주시 아라동", city: "제주시", type: "동", lat: 33.464, lng: 126.547 },
  { id: "jeju-ora", name: "오라동", fullName: "제주시 오라동", city: "제주시", type: "동", lat: 33.475, lng: 126.510 },
  { id: "jeju-yeon", name: "연동", fullName: "제주시 연동", city: "제주시", type: "동", lat: 33.487, lng: 126.488 },
  { id: "jeju-nohyeong", name: "노형동", fullName: "제주시 노형동", city: "제주시", type: "동", lat: 33.484, lng: 126.471 },
  { id: "jeju-oedo", name: "외도동", fullName: "제주시 외도동", city: "제주시", type: "동", lat: 33.495, lng: 126.428 },
  { id: "jeju-iho", name: "이호동", fullName: "제주시 이호동", city: "제주시", type: "동", lat: 33.499, lng: 126.453 },
  { id: "jeju-dodu", name: "도두동", fullName: "제주시 도두동", city: "제주시", type: "동", lat: 33.508, lng: 126.467 },

  // ── 서귀포시 읍·면 ──
  { id: "seogwipo-daejeong", name: "대정읍", fullName: "서귀포시 대정읍", city: "서귀포시", type: "읍", lat: 33.224, lng: 126.252 },
  { id: "seogwipo-namwon", name: "남원읍", fullName: "서귀포시 남원읍", city: "서귀포시", type: "읍", lat: 33.282, lng: 126.711 },
  { id: "seogwipo-seongsan", name: "성산읍", fullName: "서귀포시 성산읍", city: "서귀포시", type: "읍", lat: 33.450, lng: 126.926 },
  { id: "seogwipo-andeok", name: "안덕면", fullName: "서귀포시 안덕면", city: "서귀포시", type: "면", lat: 33.251, lng: 126.337 },
  { id: "seogwipo-pyoseon", name: "표선면", fullName: "서귀포시 표선면", city: "서귀포시", type: "면", lat: 33.327, lng: 126.832 },

  // ── 서귀포시 동 ──
  { id: "seogwipo-songsan", name: "송산동", fullName: "서귀포시 송산동", city: "서귀포시", type: "동", lat: 33.247, lng: 126.572 },
  { id: "seogwipo-jeongbang", name: "정방동", fullName: "서귀포시 정방동", city: "서귀포시", type: "동", lat: 33.245, lng: 126.572 },
  { id: "seogwipo-jungang", name: "중앙동", fullName: "서귀포시 중앙동", city: "서귀포시", type: "동", lat: 33.248, lng: 126.564 },
  { id: "seogwipo-cheonji", name: "천지동", fullName: "서귀포시 천지동", city: "서귀포시", type: "동", lat: 33.249, lng: 126.560 },
  { id: "seogwipo-hyodon", name: "효돈동", fullName: "서귀포시 효돈동", city: "서귀포시", type: "동", lat: 33.272, lng: 126.605 },
  { id: "seogwipo-yeongcheon", name: "영천동", fullName: "서귀포시 영천동", city: "서귀포시", type: "동", lat: 33.293, lng: 126.589 },
  { id: "seogwipo-donghong", name: "동홍동", fullName: "서귀포시 동홍동", city: "서귀포시", type: "동", lat: 33.265, lng: 126.580 },
  { id: "seogwipo-seohong", name: "서홍동", fullName: "서귀포시 서홍동", city: "서귀포시", type: "동", lat: 33.262, lng: 126.554 },
  { id: "seogwipo-daeryun", name: "대륜동", fullName: "서귀포시 대륜동", city: "서귀포시", type: "동", lat: 33.252, lng: 126.510 },
  { id: "seogwipo-daecheon", name: "대천동", fullName: "서귀포시 대천동", city: "서귀포시", type: "동", lat: 33.262, lng: 126.466 },
  { id: "seogwipo-jungmun", name: "중문동", fullName: "서귀포시 중문동", city: "서귀포시", type: "동", lat: 33.253, lng: 126.420 },
  { id: "seogwipo-yerae", name: "예래동", fullName: "서귀포시 예래동", city: "서귀포시", type: "동", lat: 33.255, lng: 126.390 },
];

/** Haversine 거리 (km) */
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** 위경도 → 가장 가까운 제주 행정구역 */
export function findNearestRegion(lat: number, lng: number): JejuRegion | null {
  if (!lat || !lng) return null;
  // 제주도 대략적 범위 체크
  if (lat < 33.0 || lat > 34.1 || lng < 126.0 || lng > 127.0) return null;

  let nearest: JejuRegion | null = null;
  let minDist = Infinity;
  for (const region of JEJU_REGIONS) {
    const d = distanceKm(lat, lng, region.lat, region.lng);
    if (d < minDist) {
      minDist = d;
      nearest = region;
    }
  }
  return nearest;
}

/** 제주시·서귀포시 그룹별 분류 */
export function groupRegionsByCity() {
  return {
    제주시: JEJU_REGIONS.filter((r) => r.city === "제주시"),
    서귀포시: JEJU_REGIONS.filter((r) => r.city === "서귀포시"),
  };
}
