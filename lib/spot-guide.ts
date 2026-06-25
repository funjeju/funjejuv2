import "server-only";

/**
 * 가볼만한곳 콘텐츠 — 권역(region) × 테마(theme) 분류 체계.
 * 권역은 좌표로, 테마는 명칭·소개·태그 키워드로 규칙 기반 분류(AI 비용 0, 결정적).
 */

export type RegionKey = "east" | "west" | "south" | "north" | "jungsangan";
export type ThemeKey = "rainy" | "kids" | "couple" | "sunset" | "drive" | "nature" | "indoor" | "ocean";

export const REGIONS: Record<RegionKey, { label: string; search: string }> = {
  east: { label: "동쪽", search: "제주 동쪽" },
  west: { label: "서쪽", search: "제주 서쪽" },
  south: { label: "남쪽", search: "제주 남쪽 서귀포" },
  north: { label: "북쪽", search: "제주시" },
  jungsangan: { label: "중산간", search: "제주 중산간" },
};

export const THEMES: Record<ThemeKey, { label: string; phrase: string; kw: RegExp }> = {
  rainy: { label: "비 오는 날", phrase: "비 오는 날 가볼만한 곳", kw: /박물관|미술관|전시|아쿠아|수족관|실내|카페|테마파크|체험관|아트|갤러리|뮤지엄|공방|미디어|랜드/ },
  kids: { label: "아이와", phrase: "아이와 가볼만한 곳", kw: /체험|동물|테마파크|아쿠아|키즈|미니|동물원|랜드|박물관|공원|목장|승마/ },
  couple: { label: "커플 데이트", phrase: "커플 데이트 코스", kw: /카페|전망|노을|정원|숲|포토|벽화|테마|미술관|공방/ },
  sunset: { label: "노을 명소", phrase: "노을·일몰 명소", kw: /노을|일몰|해변|해수욕|전망|오름|곶|포구|등대|해안/ },
  drive: { label: "드라이브", phrase: "드라이브 코스", kw: /해안도로|도로|전망|곶|해변|포구|오름|등대|해안/ },
  nature: { label: "자연 힐링", phrase: "자연·힐링 명소", kw: /오름|숲|곶자왈|폭포|계곡|공원|정원|습지|수목원|둘레길|올레/ },
  indoor: { label: "실내", phrase: "실내 가볼만한 곳", kw: /박물관|미술관|전시|아쿠아|실내|테마파크|체험관|갤러리|뮤지엄|랜드|공방/ },
  ocean: { label: "바다", phrase: "바다·해변 명소", kw: /해변|해수욕|바다|포구|해안|등대|곶|섬/ },
};

/** 좌표로 권역 판정 (제주 중심 ~33.36,126.53) */
export function deriveRegion(lat?: number, lng?: number): RegionKey {
  if (typeof lat !== "number" || typeof lng !== "number") return "jungsangan";
  // 추자도(북위 33.9 부근, 제주 본섬 밖 먼바다 · 행정상 제주시) → '서쪽' 오분류 방지, 북부로 귀속
  if (lat >= 33.7) return "north";
  if (lng >= 126.75) return "east";
  if (lng <= 126.34) return "west";
  if (lat >= 33.45) return "north";
  if (lat <= 33.30) return "south";
  return "jungsangan";
}

/** 자동 콘텐츠에 쓸 수 있는 스팟인지 — 추자도(본섬 밖)·오름은 제외(RAG 큐레이션 전까지) */
export function isContentEligible(a: { lat?: number | null; title?: string }): boolean {
  if (typeof a.lat === "number" && a.lat >= 33.7) return false; // 추자도 일대 제외
  if (/오름/.test(a.title ?? "")) return false;                  // 오름 제외 (사용자 지시)
  return true;
}

/** 명칭+소개+태그로 테마 다중 분류 */
export function deriveThemes(text: string): ThemeKey[] {
  const out: ThemeKey[] = [];
  for (const [k, v] of Object.entries(THEMES) as [ThemeKey, (typeof THEMES)[ThemeKey]][]) {
    if (v.kw.test(text)) out.push(k);
  }
  return out;
}

/** 토픽 제목/키워드용 — 권역+테마 조합 */
export function topicLabels(region: RegionKey, theme: ThemeKey) {
  const r = REGIONS[region], t = THEMES[theme];
  const title = `제주 ${r.label} ${t.phrase}`;            // 예: 제주 동쪽 비 오는 날 가볼만한 곳
  const keywords = [
    `제주 ${r.label} 가볼만한곳`,
    `${r.search} 가볼만한곳`,
    `제주 ${t.label} 가볼만한곳`,
    `제주 ${r.label} ${t.label} 가볼만한곳`,
    `${r.search} ${t.label}`,
    `제주 ${r.label} 여행`,
    `제주 ${t.phrase}`,
    "제주 가볼만한곳", "제주 여행 코스", "제주 여행지 추천",
  ];
  return { title, keywords };
}
