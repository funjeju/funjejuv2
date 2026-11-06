/**
 * funjeju.com CCTV 전용 화면(별자리 지도)의 카메라 목록 — 2026-11-04 기준 64대.
 * 화면의 "N개의 별"·"N CAMERAS ON AIR"와 홈 제목·설명의 숫자는 이 배열 길이(SKY_CAMERAS.length)에서 나온다.
 *
 * - x, y: 별자리 지도 위 위치(%). 실제 위·경도를 lib/sky/outline.ts 해안선과 같은 투영으로 환산.
 *   거의 같은 자리의 카메라(서귀포항·새연교·천지연, 법환 2곳, 모슬포·하모 3곳, 화순·산방산)는 마우스로 고를 수 있게 1~2%씩 벌려 놓았다.
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
  // 세천포구 도식 위치는 한국관광공사 포구 대표점(위도 33.2683, 경도 126.674)을 outline.ts 투영으로 환산한 값이며, CCTV 설치점은 미확인.
  { id: "sechon", name: "세천포구", area: "남원읍 위미리", group: "S", x: 64.42, y: 79.92, label: false, thumb: true, source: { kind: "http", url: "http://211.34.191.215:1935/live/1-149.stream/playlist.m3u8" } },
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
  { id: "mosulpo", name: "모슬포항", area: "대정읍", group: "S", x: 14.4, y: 94.3, label: true, thumb: true, source: { kind: "http", url: "http://211.34.191.215:1935/live/1-155.stream/playlist.m3u8" } },
  { id: "hamo_beach", name: "하모해변", area: "대정읍", group: "S", x: 15.8, y: 93.5, label: false, thumb: true, source: { kind: "http", url: "http://211.34.191.215:1935/live/11-24.stream/playlist.m3u8" } },
  { id: "daejeong_hamo", name: "대정하모", area: "대정읍", group: "S", x: 17.1, y: 92.7, label: false, thumb: true, source: { kind: "http", url: "http://211.34.191.215:1935/live/1-73.stream/playlist.m3u8" } },
  { id: "sindo", name: "신도포구", area: "대정읍", group: "S", x: 7.33, y: 90.77, label: false, thumb: true, source: { kind: "http", url: "http://211.34.191.215:1935/live/1-71.stream/playlist.m3u8" } },
  { id: "nonjitmul", name: "논짓물", area: "하예동", group: "S", x: 42.79, y: 88.97, label: false, thumb: true, source: { kind: "http", url: "http://211.34.191.215:1935/live/1-193.stream/playlist.m3u8" } },
  { id: "daepo", name: "대포포구", area: "중문동", group: "S", x: 35.81, y: 88.72, label: false, thumb: true, source: { kind: "http", url: "http://211.34.191.215:1935/live/1-115.stream/playlist.m3u8" } },
  { id: "bomok", name: "보목포구", area: "보목동", group: "S", x: 53.72, y: 88.21, label: false, thumb: true, source: { kind: "http", url: "http://211.34.191.215:1935/live/1-152.stream/playlist.m3u8" } },
  { id: "hwasun", name: "화순해변", area: "안덕면", group: "S", x: 23.9, y: 88.0, label: false, thumb: true, source: { kind: "http", url: "http://211.34.191.215:1935/live/11-25.stream/playlist.m3u8" } },
  { id: "sanbangsan", name: "산방산", area: "안덕면", group: "S", x: 22.1, y: 86.5, label: true, thumb: false, source: { kind: "http", url: "http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100012/0/1/1.m3u8" } },
  { id: "seogwipo_hang1", name: "서귀포항", area: "서귀포시", group: "S", x: 51.1, y: 88.4, label: false, thumb: false, source: { kind: "http", url: "http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100009/0/1/1.m3u8" } },
  { id: "seogwipo_hang2", name: "서귀포항2", area: "서귀포시", group: "S", x: 52.3, y: 87.9, label: false, thumb: true, source: { kind: "http", url: "http://211.34.191.215:1935/live/1-34.stream/playlist.m3u8" } },
  { id: "saeyeongyo", name: "새연교", area: "서홍동", group: "S", x: 50.0, y: 87.6, label: true, thumb: true, source: { kind: "http", url: "http://123.140.197.51/stream/35/play.m3u8" } },
  { id: "beophwan_eo", name: "법환어촌계", area: "법환동", group: "S", x: 46.7, y: 86.7, label: false, thumb: false, source: { kind: "http", url: "http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100008/0/1/1.m3u8" } },
  { id: "beophwan_po", name: "법환포구", area: "법환동", group: "S", x: 48.3, y: 86.3, label: false, thumb: false, source: { kind: "http", url: "http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100007/0/1/1.m3u8" } },
  { id: "cheonjiyeon", name: "천지연", area: "서홍동", group: "S", x: 51.2, y: 85.4, label: false, thumb: true, source: { kind: "http", url: "http://211.34.191.215:1935/live/1-72.stream/playlist.m3u8" } },
  { id: "jungmun", name: "중문해수욕장", area: "중문동", group: "S", x: 33.95, y: 85.9, label: true, thumb: false, source: { kind: "http", url: "http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100010/0/1/1.m3u8" } },
  { id: "namwon_taeheung", name: "남원태흥포구", area: "남원읍", group: "S", x: 67.44, y: 79.49, label: true, thumb: true, source: { kind: "http", url: "http://211.34.191.215:1935/live/1-146.stream/playlist.m3u8" } },
  { id: "namwon_deokdol", name: "남원덕돌", area: "남원읍", group: "S", x: 69.19, y: 76.92, label: false, thumb: false, source: { kind: "http", url: "http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100006/0/1/1.m3u8" } },
  { id: "pyoseon", name: "표선항", area: "표선면", group: "S", x: 83.49, y: 65.64, label: true, thumb: true, source: { kind: "http", url: "http://211.34.191.215:1935/live/1-77.stream/playlist.m3u8" } },
  { id: "onpyeong", name: "온평어촌계", area: "성산읍", group: "S", x: 90.81, y: 48.21, label: false, thumb: false, source: { kind: "http", url: "http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100011/0/1/1.m3u8" } },
  { id: "seopjikoji", name: "섭지코지", area: "성산읍", group: "S", x: 94.19, y: 38.97, label: true, thumb: true, source: { kind: "http", url: "http://211.34.191.215:1935/live/1-116.stream/playlist.m3u8" } },
  { id: "sinsan", name: "신산포구", area: "성산읍", group: "S", x: 92.33, y: 35.9, label: false, thumb: true, source: { kind: "http", url: "http://211.34.191.215:1935/live/1-143.stream/playlist.m3u8" } },
  { id: "seongsan", name: "성산일출봉", area: "성산읍", group: "S", x: 95.58, y: 31.28, label: true, thumb: true, source: { kind: "http", url: "http://123.140.197.51/stream/34/play.m3u8" } },
  { id: "seongsan_suma", name: "성산수마포구", area: "성산읍", group: "S", x: 93.14, y: 30.51, label: false, thumb: true, source: { kind: "http", url: "http://211.34.191.215:1935/live/1-76.stream/playlist.m3u8" } },
  { id: "seongsan_hang", name: "성산항", area: "성산읍", group: "S", x: 94.07, y: 28.46, label: false, thumb: true, source: { kind: "http", url: "http://211.34.191.215:1935/live/1-140.stream/playlist.m3u8" } },
  // 2026-11-04 추가: 서귀포시 예전 서버(211.34.191.215)에서 송출 중인 바다 카메라 11대. 시청 deviceId 순서와 화면으로 짝지음(docs/seogwipo-sea-cctv-2026-11.md).
  // 마라도 2대는 실제 위치가 지도 아래 밖이라 모슬포 남쪽 가장자리로 당겨 놓았다.
  { id: "daepyeong", name: "대평포구", area: "안덕면 감산리", group: "S", x: 28.4, y: 89.6, label: false, thumb: false, source: { kind: "http", url: "http://211.34.191.215:1935/live/1-197.stream/playlist.m3u8" } },
  { id: "beophwan_sgp", name: "법환포구(서귀포시)", area: "법환동", group: "S", x: 45.4, y: 87.9, label: false, thumb: false, source: { kind: "http", url: "http://211.34.191.215:1935/live/1-200.stream/playlist.m3u8" } },
  { id: "marado_salledeok", name: "마라도 살레덕선착장", area: "대정읍 마라도", group: "S", x: 13.2, y: 98.6, label: false, thumb: false, source: { kind: "http", url: "http://211.34.191.215:1935/live/11-21.stream/playlist.m3u8" } },
  { id: "marado_dohang", name: "마라도 도항선선착장", area: "대정읍 마라도", group: "S", x: 14.6, y: 99.2, label: false, thumb: false, source: { kind: "http", url: "http://211.34.191.215:1935/live/11-22.stream/playlist.m3u8" } },
  { id: "songaksan", name: "송악산 선착장", area: "대정읍 상모리", group: "S", x: 19.8, y: 95.9, label: true, thumb: false, source: { kind: "http", url: "http://211.34.191.215:1935/live/11-51.stream/playlist.m3u8" } },
  { id: "yeongnak", name: "영락 해녀탈의장", area: "대정읍 영락리", group: "S", x: 9.8, y: 85.4, label: false, thumb: false, source: { kind: "http", url: "http://211.34.191.215:1935/live/11-52.stream/playlist.m3u8" } },
  { id: "mureung_haenyeo", name: "무릉 해녀탈의장", area: "대정읍 무릉리", group: "S", x: 8.4, y: 80.6, label: false, thumb: false, source: { kind: "http", url: "http://211.34.191.215:1935/live/11-53.stream/playlist.m3u8" } },
  { id: "mureung_dock", name: "무릉 선착장", area: "대정읍 무릉리", group: "S", x: 7.2, y: 79.2, label: false, thumb: false, source: { kind: "http", url: "http://211.34.191.215:1935/live/11-54.stream/playlist.m3u8" } },
  { id: "sinsan_dock", name: "신산 선착장", area: "성산읍 신산리", group: "S", x: 91.4, y: 37.2, label: false, thumb: false, source: { kind: "http", url: "http://211.34.191.215:1935/live/11-55.stream/playlist.m3u8" } },
  { id: "taeheung_east", name: "태흥포구 동편", area: "남원읍 태흥리", group: "S", x: 70.6, y: 78.4, label: false, thumb: false, source: { kind: "http", url: "http://211.34.191.215:1935/live/11-56.stream/playlist.m3u8" } },
  { id: "taeheung1", name: "태흥1리 어촌계", area: "남원읍 태흥리", group: "S", x: 72.1, y: 77.4, label: false, thumb: false, source: { kind: "http", url: "http://211.34.191.215:1935/live/11-57.stream/playlist.m3u8" } },
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
