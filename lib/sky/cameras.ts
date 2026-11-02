/**
 * funjeju.com CCTV 전용 화면(별자리 지도)의 카메라 목록 — 2026-11-02 기준 53대.
 *
 * - x, y: 별자리 지도 위 위치(%). 실제 위·경도를 lib/sky/outline.ts 해안선과 같은 투영으로 환산.
 *   추자도 4대는 지도 밖이라 북서쪽 상자 안에 모아 둔다.
 * - group: J 제주시 · S 서귀포시 · H 한라산 · A 공항(제주시 소속)
 * - source.kind
 *   - "jejusi": 제주시 재난안전대책본부 HTTPS 스트림. 1분짜리 uid 토큰을 /api/sky/jejusi/[id] 가 받아 온다.
 *   - "hls":    토큰 없는 HTTPS 스트림(한라산 hallacctv.kr). 우리 화면에서 바로 재생.
 *   - "http":   평문 HTTP 원본. HTTPS 페이지에서 재생할 수 없어 HTTP 뷰어 새 창으로 연다(lib/sky/watch.ts).
 * - thumb: public/sky/cams/{id}.jpg 존재 여부(2026-11-02 실제 캡처).
 */
export type SkyGroup = "J" | "S" | "H" | "A";
export type SkySource =
  | { kind: "jejusi"; point: number }
  | { kind: "hls"; url: string }
  | { kind: "http"; url: string };
export type SkyCamera = {
  id: string;
  name: string;
  area: string;
  group: SkyGroup;
  x: number;
  y: number;
  label: boolean;
  thumb: boolean;
  source: SkySource;
};

export const SKY_CAMERAS: SkyCamera[] = [
  { id: "sinchang", name: "신창포구", area: "한경면", group: "J", x: 3.26, y: 63.59, label: false, thumb: false, source: { kind: "http", url: "http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100004/0/1/1.m3u8" } },
  { id: "panpo", name: "판포해변", area: "한경면", group: "J", x: 6.74, y: 58.46, label: true, thumb: true, source: { kind: "jejusi", point: 10007 } },
  { id: "chuja_daeseo", name: "추자대서", area: "추자면", group: "J", x: 9, y: 7, label: false, thumb: true, source: { kind: "jejusi", point: 10013 } },
  { id: "chuja_mukri", name: "추자묵리", area: "추자면", group: "J", x: 10.4, y: 9.2, label: false, thumb: true, source: { kind: "jejusi", point: 10014 } },
  { id: "chuja_yecho", name: "추자예초", area: "추자면", group: "J", x: 11.6, y: 7.6, label: false, thumb: true, source: { kind: "jejusi", point: 10016 } },
  { id: "chuja_sinyang", name: "추자신양", area: "추자면", group: "J", x: 11.8, y: 9.0, label: false, thumb: true, source: { kind: "jejusi", point: 10015 } },
  { id: "hyeopjae", name: "협재해변", area: "한림읍", group: "J", x: 13.84, y: 47.69, label: true, thumb: true, source: { kind: "jejusi", point: 10006 } },
  { id: "ongpo", name: "옹포항", area: "한림읍", group: "J", x: 15.47, y: 43.33, label: false, thumb: false, source: { kind: "http", url: "http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100005/0/1/1.m3u8" } },
  { id: "gwakji", name: "곽지해변", area: "애월읍", group: "J", x: 25.35, y: 30.77, label: true, thumb: true, source: { kind: "jejusi", point: 10005 } },
  { id: "hagwi", name: "하귀가문동", area: "애월읍", group: "J", x: 31.16, y: 25.9, label: false, thumb: true, source: { kind: "jejusi", point: 10004 } },
  { id: "sechon", name: "세천포구", area: "이호동", group: "J", x: 37.67, y: 20.77, label: false, thumb: true, source: { kind: "http", url: "http://211.34.191.215:1935/live/1-149.stream/playlist.m3u8" } },
  { id: "iho", name: "이호해변", area: "이호동", group: "J", x: 38.72, y: 21.03, label: true, thumb: true, source: { kind: "jejusi", point: 10019 } },
  { id: "dodu", name: "도두항", area: "도두동", group: "J", x: 41.28, y: 17.18, label: false, thumb: true, source: { kind: "jejusi", point: 10003 } },
  { id: "donghandugi", name: "동한두기", area: "용담동", group: "J", x: 45.12, y: 16.92, label: false, thumb: true, source: { kind: "jejusi", point: 10002 } },
  { id: "tapdong", name: "탑동서부두", area: "탑동", group: "J", x: 46.63, y: 16.92, label: false, thumb: true, source: { kind: "jejusi", point: 10001 } },
  { id: "samyang", name: "삼양해변", area: "삼양동", group: "J", x: 53.72, y: 14.36, label: false, thumb: true, source: { kind: "jejusi", point: 10008 } },
  { id: "hamdeok", name: "함덕해변", area: "조천읍", group: "J", x: 63.84, y: 9.49, label: true, thumb: true, source: { kind: "jejusi", point: 10009 } },
  { id: "gimnyeong", name: "김녕해변", area: "구좌읍", group: "J", x: 74.07, y: 6.92, label: false, thumb: true, source: { kind: "jejusi", point: 10010 } },
  { id: "woljeong", name: "월정해변", area: "구좌읍", group: "J", x: 78.6, y: 5.64, label: true, thumb: true, source: { kind: "jejusi", point: 10011 } },
  { id: "pyeongdae", name: "평대해변", area: "구좌읍", group: "J", x: 82.56, y: 9.49, label: false, thumb: true, source: { kind: "jejusi", point: 10012 } },
  { id: "udo_haumoktong", name: "우도하우목동", area: "우도면", group: "J", x: 95.47, y: 21.28, label: false, thumb: true, source: { kind: "jejusi", point: 10017 } },
  { id: "udo_cheonjin", name: "우도천진항", area: "우도면", group: "J", x: 96.63, y: 18.97, label: true, thumb: true, source: { kind: "jejusi", point: 10018 } },
  { id: "jeju_airport", name: "제주공항", area: "용담동", group: "A", x: 43.37, y: 17.69, label: true, thumb: true, source: { kind: "http", url: "http://123.140.197.51/stream/33/play.m3u8" } },
  { id: "mosulpo", name: "모슬포항", area: "대정읍", group: "S", x: 15.35, y: 93.85, label: true, thumb: true, source: { kind: "http", url: "http://211.34.191.215:1935/live/1-155.stream/playlist.m3u8" } },
  { id: "hamo_beach", name: "하모해변", area: "대정읍", group: "S", x: 15.7, y: 93.08, label: false, thumb: true, source: { kind: "http", url: "http://211.34.191.215:1935/live/11-24.stream/playlist.m3u8" } },
  { id: "daejeong_hamo", name: "대정하모", area: "대정읍", group: "S", x: 15.93, y: 92.82, label: false, thumb: true, source: { kind: "http", url: "http://211.34.191.215:1935/live/1-73.stream/playlist.m3u8" } },
  { id: "sindo", name: "신도포구", area: "대정읍", group: "S", x: 7.33, y: 90.77, label: false, thumb: true, source: { kind: "http", url: "http://211.34.191.215:1935/live/1-71.stream/playlist.m3u8" } },
  { id: "nonjitmul", name: "논짓물", area: "하예동", group: "S", x: 42.79, y: 88.97, label: false, thumb: true, source: { kind: "http", url: "http://211.34.191.215:1935/live/1-193.stream/playlist.m3u8" } },
  { id: "daepo", name: "대포포구", area: "중문동", group: "S", x: 35.81, y: 88.72, label: false, thumb: true, source: { kind: "http", url: "http://211.34.191.215:1935/live/1-115.stream/playlist.m3u8" } },
  { id: "bomok", name: "보목포구", area: "보목동", group: "S", x: 53.72, y: 88.21, label: false, thumb: true, source: { kind: "http", url: "http://211.34.191.215:1935/live/1-152.stream/playlist.m3u8" } },
  { id: "hwasun", name: "화순해변", area: "안덕면", group: "S", x: 23.02, y: 87.44, label: false, thumb: true, source: { kind: "http", url: "http://211.34.191.215:1935/live/11-25.stream/playlist.m3u8" } },
  { id: "sanbangsan", name: "산방산", area: "안덕면", group: "S", x: 22.67, y: 87.18, label: true, thumb: false, source: { kind: "http", url: "http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100012/0/1/1.m3u8" } },
  { id: "seogwipo_hang1", name: "서귀포항", area: "서귀포시", group: "S", x: 51.28, y: 87.18, label: false, thumb: false, source: { kind: "http", url: "http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100009/0/1/1.m3u8" } },
  { id: "seogwipo_hang2", name: "서귀포항2", area: "서귀포시", group: "S", x: 51.51, y: 86.92, label: false, thumb: true, source: { kind: "http", url: "http://211.34.191.215:1935/live/1-34.stream/playlist.m3u8" } },
  { id: "saeyeongyo", name: "새연교", area: "서홍동", group: "S", x: 51.4, y: 86.67, label: true, thumb: true, source: { kind: "http", url: "http://123.140.197.51/stream/35/play.m3u8" } },
  { id: "beophwan_eo", name: "법환어촌계", area: "법환동", group: "S", x: 47.5, y: 86.15, label: false, thumb: false, source: { kind: "http", url: "http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100008/0/1/1.m3u8" } },
  { id: "beophwan_po", name: "법환포구", area: "법환동", group: "S", x: 47.73, y: 85.97, label: false, thumb: false, source: { kind: "http", url: "http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100007/0/1/1.m3u8" } },
  { id: "cheonjiyeon", name: "천지연", area: "서홍동", group: "S", x: 51.05, y: 85.9, label: false, thumb: true, source: { kind: "http", url: "http://211.34.191.215:1935/live/1-72.stream/playlist.m3u8" } },
  { id: "jungmun", name: "중문해수욕장", area: "중문동", group: "S", x: 33.95, y: 85.9, label: true, thumb: false, source: { kind: "http", url: "http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100010/0/1/1.m3u8" } },
  { id: "namwon_taeheung", name: "남원태흥포구", area: "남원읍", group: "S", x: 67.44, y: 79.49, label: true, thumb: true, source: { kind: "http", url: "http://211.34.191.215:1935/live/1-146.stream/playlist.m3u8" } },
  { id: "namwon_deokdol", name: "남원덕돌", area: "남원읍", group: "S", x: 69.19, y: 76.92, label: false, thumb: false, source: { kind: "http", url: "http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100006/0/1/1.m3u8" } },
  { id: "pyoseon", name: "표선항", area: "표선면", group: "S", x: 83.49, y: 65.64, label: true, thumb: true, source: { kind: "http", url: "http://211.34.191.215:1935/live/1-77.stream/playlist.m3u8" } },
  { id: "onpyeong", name: "온평어촌계", area: "성산읍", group: "S", x: 90.81, y: 48.21, label: false, thumb: false, source: { kind: "http", url: "http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100011/0/1/1.m3u8" } },
  { id: "seopjikoji", name: "섭지코지", area: "성산읍", group: "S", x: 94.19, y: 38.97, label: true, thumb: true, source: { kind: "http", url: "http://211.34.191.215:1935/live/1-116.stream/playlist.m3u8" } },
  { id: "sinsan", name: "신산포구", area: "성산읍", group: "S", x: 92.33, y: 35.9, label: false, thumb: false, source: { kind: "http", url: "http://211.34.191.215:1935/live/1-143.stream/playlist.m3u8" } },
  { id: "seongsan", name: "성산일출봉", area: "성산읍", group: "S", x: 95.58, y: 31.28, label: true, thumb: true, source: { kind: "http", url: "http://123.140.197.51/stream/34/play.m3u8" } },
  { id: "seongsan_suma", name: "성산수마포구", area: "성산읍", group: "S", x: 93.14, y: 30.51, label: false, thumb: true, source: { kind: "http", url: "http://211.34.191.215:1935/live/1-76.stream/playlist.m3u8" } },
  { id: "seongsan_hang", name: "성산항", area: "성산읍", group: "S", x: 94.07, y: 28.46, label: false, thumb: true, source: { kind: "http", url: "http://211.34.191.215:1935/live/1-140.stream/playlist.m3u8" } },
  { id: "halla_1100", name: "한라산 1100도로", area: "한라산", group: "H", x: 39.99, y: 56.62, label: false, thumb: true, source: { kind: "hls", url: "https://hallacctv.kr/live/cctv05.stream_360p/playlist.m3u8" } },
  { id: "halla_eoseungsaeng", name: "한라산 어승생악", area: "한라산", group: "H", x: 42.28, y: 48.79, label: false, thumb: true, source: { kind: "hls", url: "https://hallacctv.kr/live/cctv04.stream_360p/playlist.m3u8" } },
  { id: "halla_witse", name: "한라산 윗세오름", area: "한라산", group: "H", x: 42.66, y: 57.54, label: false, thumb: true, source: { kind: "hls", url: "https://hallacctv.kr/live/cctv03.stream_360p/playlist.m3u8" } },
  { id: "halla_baengnokdam", name: "한라산 백록담", area: "한라산", group: "H", x: 48.06, y: 55.97, label: true, thumb: true, source: { kind: "hls", url: "https://hallacctv.kr/live/cctv01.stream_360p/playlist.m3u8" } },
  { id: "halla_wanggwanneung", name: "한라산 왕관릉", area: "한라산", group: "H", x: 49.19, y: 53.85, label: false, thumb: true, source: { kind: "hls", url: "https://hallacctv.kr/live/cctv02.stream_360p/playlist.m3u8" } },
];

export const SKY_GROUP_NAME: Record<SkyGroup, string> = { J: "제주시", A: "제주시", S: "서귀포시", H: "한라산" };

export function findSkyCamera(id: string): SkyCamera | undefined {
  return SKY_CAMERAS.find((c) => c.id === id);
}

export function skyCameraSub(c: SkyCamera): string {
  return c.group === "H" ? "한라산 국립공원" : `${SKY_GROUP_NAME[c.group]} ${c.area}`;
}
