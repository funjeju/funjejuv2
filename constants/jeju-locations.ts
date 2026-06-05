/**
 * 제주 지역명 / 명소명 → Firestore region 값 + 중심 좌표 매핑
 * 챗봇 의도 추출에 사용
 */

export type JejuLocation = {
  keywords: string[];        // 유저가 말할 수 있는 다양한 표현
  region?: string;           // Firestore places.region 정확 매칭값 (있으면 region 필터 사용)
  lat: number;
  lng: number;
  defaultRadius?: number;    // 좌표 기반 검색 시 기본 반경
};

export const JEJU_LOCATIONS: JejuLocation[] = [
  // ── 제주시 읍·면·우도 ─────────────────────────────────────
  { keywords: ["애월", "애월읍"],
    region: "애월읍", lat: 33.460, lng: 126.330 },
  { keywords: ["구좌", "구좌읍", "김녕", "월정", "평대", "세화"],
    region: "구좌읍", lat: 33.550, lng: 126.780 },
  { keywords: ["조천", "조천읍", "함덕"],
    region: "조천읍", lat: 33.540, lng: 126.670 },
  { keywords: ["한림", "한림읍", "협재", "비양도", "옹포"],
    region: "한림읍", lat: 33.410, lng: 126.250 },
  { keywords: ["한경", "한경면", "신창", "고산"],
    region: "한경면", lat: 33.340, lng: 126.160 },
  { keywords: ["우도", "우도면"],
    region: "우도면", lat: 33.500, lng: 126.950 },

  // ── 서귀포시 읍·면 ─────────────────────────────────────
  { keywords: ["성산", "성산읍", "성산일출봉", "일출봉", "섭지코지"],
    region: "성산읍", lat: 33.458, lng: 126.942 },
  { keywords: ["안덕", "안덕면", "산방산", "화순", "사계리"],
    region: "안덕면", lat: 33.240, lng: 126.320 },
  { keywords: ["대정", "대정읍", "모슬포", "마라도", "송악산"],
    region: "대정읍", lat: 33.220, lng: 126.250 },
  { keywords: ["남원", "남원읍"],
    region: "남원읍", lat: 33.280, lng: 126.710 },
  { keywords: ["표선", "표선면"],
    region: "표선면", lat: 33.320, lng: 126.830 },

  // ── 시내 (동 지역) ──────────────────────────────────────
  { keywords: ["제주시내", "제주 시내", "제주시 시내", "탑동", "노형", "이도", "용담", "도두", "삼양"],
    region: "제주시 동(洞) 지역", lat: 33.510, lng: 126.520 },
  { keywords: ["서귀포시내", "서귀포 시내", "서귀포", "중문", "중문관광단지", "보목", "서홍", "하예"],
    region: "서귀포시 동(洞) 지역", lat: 33.250, lng: 126.560 },

  // ── 특정 명소 (region 매칭 없이 좌표만 활용) ──────────────
  { keywords: ["한라산", "백록담", "성판악", "어리목"],
    lat: 33.361, lng: 126.529, defaultRadius: 8 },
  { keywords: ["우도봉"],
    lat: 33.504, lng: 126.962 },
  { keywords: ["오설록", "녹차밭"],
    lat: 33.305, lng: 126.290 },
];

/**
 * 메시지에서 가장 먼저 매칭되는 지역 찾기 (longest match 우선)
 */
export function matchLocation(text: string): JejuLocation | null {
  // 긴 키워드 먼저 매칭 (성산일출봉 > 성산)
  const all = JEJU_LOCATIONS.flatMap((loc) =>
    loc.keywords.map((kw) => ({ kw, loc }))
  ).sort((a, b) => b.kw.length - a.kw.length);

  for (const { kw, loc } of all) {
    if (text.includes(kw)) return loc;
  }
  return null;
}
