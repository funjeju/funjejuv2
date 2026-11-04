import type { SkyCamera } from "./cameras";

/**
 * 펀제주 → 제주멍(실제 제주 산책 영상 + 해먹 쉼터) 연결.
 * 코스 목록은 제주멍 dist/clips.js 의 촬영 좌표를 옮긴 것(2026-11-04). 코스가 늘면 여기도 추가.
 * minutes 는 0.72배속 재생 기준 대략의 산책 시간.
 */
export const JEJUMUNG_URL = (process.env.NEXT_PUBLIC_JEJUMUNG_URL || "https://jejumung.vercel.app").replace(/\/$/, "");

export type MungCourse = { id: string; title: string; place: string; minutes: number; lat: number; lon: number };

export const MUNG_COURSES: MungCourse[] = [
  { id: "IMG_2207", title: "노을 다리", place: "남쪽 해안", minutes: 1, lat: 33.2712, lon: 126.6610 },
  { id: "IMG_0575", title: "해안 데크 산책", place: "서귀포", minutes: 2, lat: 33.2419, lon: 126.5675 },
  { id: "IMG_0965", title: "숲길 산책", place: "교래 중산간", minutes: 5, lat: 33.4364, lon: 126.6611 },
  { id: "NOKKOME", title: "노꼬메 능선 산책", place: "애월 중산간", minutes: 3, lat: 33.387, lon: 126.411 },
  { id: "CEDAR", title: "삼나무숲 산책", place: "조천 중산간", minutes: 4, lat: 33.458, lon: 126.655 },
  { id: "GEOMUN", title: "거문오름 숲길", place: "조천 선흘", minutes: 7, lat: 33.475, lon: 126.711 },
  { id: "NOKKOMEFOREST", title: "노꼬메 숲길 산책", place: "애월 중산간", minutes: 5, lat: 33.393, lon: 126.405 },
  { id: "GUJWA", title: "구좌 억새 능선 산책", place: "구좌 중산간", minutes: 3, lat: 33.462, lon: 126.795 },
  { id: "CEDARSNOW", title: "삼나무 눈길 산책", place: "조천 중산간", minutes: 4, lat: 33.451, lon: 126.646 },
  { id: "SNOWFOREST", title: "사려니숲 눈길 산책", place: "사려니숲길", minutes: 5, lat: 33.400, lon: 126.680 },
  { id: "SNOWTRAIL", title: "조릿대 눈길 산책", place: "사려니숲길 옆", minutes: 6, lat: 33.408, lon: 126.668 },
  { id: "REDCINDER", title: "비자림 송이길 산책", place: "비자림", minutes: 5, lat: 33.488, lon: 126.808 },
  { id: "FORESTCAMP", title: "숲속 야영장 산책", place: "삼의악 일대", minutes: 4, lat: 33.430, lon: 126.558 },
];

/** 카메라 실제 좌표(위·경도). 지도 x,y 는 표시용으로 벌려 놓은 값이라 쓰지 않는다. */
const CAM_LATLON: Record<string, [number, number]> = {
  "beophwan_eo": [33.244, 126.5285],
  "beophwan_po": [33.2447, 126.5305],
  "bomok": [33.236, 126.582],
  "cheonjiyeon": [33.245, 126.559],
  "chuja_daeseo": [33.961, 126.886],
  "chuja_mukri": [33.952, 126.878],
  "chuja_sinyang": [33.956, 126.892],
  "chuja_yecho": [33.946, 126.871],
  "daejeong_hamo": [33.218, 126.257],
  "daepo": [33.234, 126.428],
  "dodu": [33.513, 126.475],
  "donghandugi": [33.514, 126.508],
  "gimnyeong": [33.553, 126.757],
  "gwakji": [33.46, 126.338],
  "hagwi": [33.479, 126.388],
  "halla_1100": [33.3592, 126.4639],
  "halla_baengnokdam": [33.3617, 126.5333],
  "halla_eoseungsaeng": [33.3897, 126.4836],
  "halla_wanggwanneung": [33.37, 126.543],
  "halla_witse": [33.3556, 126.4869],
  "hamdeok": [33.543, 126.669],
  "hamo_beach": [33.217, 126.255],
  "hwasun": [33.239, 126.318],
  "hyeopjae": [33.394, 126.239],
  "iho": [33.498, 126.453],
  "jeju_airport": [33.511, 126.493],
  "jungmun": [33.245, 126.412],
  "mosulpo": [33.214, 126.252],
  "namwon_deokdol": [33.28, 126.715],
  "namwon_taeheung": [33.27, 126.7],
  "nonjitmul": [33.233, 126.488],
  "ongpo": [33.411, 126.253],
  "onpyeong": [33.392, 126.901],
  "panpo": [33.352, 126.178],
  "pyeongdae": [33.543, 126.83],
  "pyoseon": [33.324, 126.838],
  "saeyeongyo": [33.242, 126.562],
  "samyang": [33.524, 126.582],
  "sanbangsan": [33.24, 126.315],
  "sechon": [33.499, 126.444],
  "seogwipo_hang1": [33.24, 126.561],
  "seogwipo_hang2": [33.241, 126.563],
  "seongsan": [33.458, 126.942],
  "seongsan_hang": [33.469, 126.929],
  "seongsan_suma": [33.461, 126.921],
  "seopjikoji": [33.428, 126.93],
  "sinchang": [33.332, 126.148],
  "sindo": [33.226, 126.183],
  "sinsan": [33.44, 126.914],
  "tapdong": [33.514, 126.521],
  "udo_cheonjin": [33.506, 126.951],
  "udo_haumoktong": [33.497, 126.941],
  "woljeong": [33.558, 126.796],
};

function km(a: number, b: number, c: number, d: number) {
  return Math.hypot((a - c) * 111, (b - d) * 111 * Math.cos((33.4 * Math.PI) / 180));
}

export function nearestMungCourse(cam: SkyCamera): MungCourse & { km: number } {
  const [lat, lon] = CAM_LATLON[cam.id] ?? [33.38, 126.55];
  let best = MUNG_COURSES[0];
  let bestKm = Infinity;
  for (const c of MUNG_COURSES) {
    const d = km(lat, lon, c.lat, c.lon);
    if (d < bestKm) { bestKm = d; best = c; }
  }
  return { ...best, km: bestKm };
}

const utm = (medium: string, content?: string) =>
  `utm_source=funjeju&utm_medium=${medium}${content ? `&utm_content=${encodeURIComponent(content)}` : ""}`;

export function mungHomeUrl(medium: string): string {
  return `${JEJUMUNG_URL}/?${utm(medium)}`;
}

export function mungCourseUrl(courseId: string, medium: string, content?: string): string {
  return `${JEJUMUNG_URL}/engine?clip=${encodeURIComponent(courseId)}&${utm(medium, content)}`;
}
