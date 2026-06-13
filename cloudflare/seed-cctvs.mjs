/**
 * CCTV 일괄 등록 스크립트
 * 실행: node cloudflare/seed-cctvs.mjs
 */

// 환경변수로 주입: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_KV_NAMESPACE_ID, CLOUDFLARE_API_TOKEN
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const KV_NS_ID   = process.env.CLOUDFLARE_KV_NAMESPACE_ID;
const API_TOKEN  = process.env.CLOUDFLARE_API_TOKEN;

const BASE = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${KV_NS_ID}/values`;

const CCTVS = [
  // ── 제주시 구좌읍 ──────────────────────────────────────────
  { id: "gimnyeong",   name: "김녕해변",     region: "제주시 구좌읍", category: "해변", originUrl: "http://211.114.96.121:1935/jejusi6/11-20.stream/playlist.m3u8" },
  { id: "woljeong",    name: "월정해변",     region: "제주시 구좌읍", category: "해변", originUrl: "http://211.114.96.121:1935/jejusi7/11-21.stream/playlist.m3u8" },
  { id: "pyeongdae",   name: "평대해변",     region: "제주시 구좌읍", category: "해변", originUrl: "http://211.114.96.121:1935/jejusi7/11-22.stream/playlist.m3u8" },

  // ── 제주시 조천읍 ──────────────────────────────────────────
  { id: "hamdeok",     name: "함덕해변",     region: "제주시 조천읍", category: "해변", originUrl: "http://211.114.96.121:1935/jejusi6/11-19.stream/playlist.m3u8" },

  // ── 제주시 애월읍 ──────────────────────────────────────────
  { id: "hagwi",       name: "하귀가문동",   region: "제주시 애월읍", category: "포구", originUrl: "http://211.114.96.121:1935/jejusi6/11-15.stream/playlist.m3u8" },
  { id: "gwakji",      name: "곽지해변",     region: "제주시 애월읍", category: "해변", originUrl: "http://211.114.96.121:1935/jejusi6/11-16.stream/playlist.m3u8" },

  // ── 제주시 한림읍 ──────────────────────────────────────────
  { id: "hyeopjae",    name: "협재해변",     region: "제주시 한림읍", category: "해변", originUrl: "http://211.114.96.121:1935/jejusi6/11-17.stream/playlist.m3u8" },
  { id: "ongpo",       name: "옹포항",       region: "제주시 한림읍", category: "항구", originUrl: "http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100005/0/1/1.m3u8" },

  // ── 제주시 한경면 ──────────────────────────────────────────
  { id: "sinchang",    name: "신창포구",     region: "제주시 한경면", category: "포구", originUrl: "http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100004/0/1/1.m3u8" },
  { id: "panpo",       name: "판포해변",     region: "제주시 한경면", category: "해변", originUrl: "http://211.114.96.121:1935/jejusi6/11-18.stream/playlist.m3u8" },

  // ── 제주시 우도면 ──────────────────────────────────────────
  { id: "udo_cheonjin",  name: "우도천진항", region: "제주시 우도면", category: "항구", originUrl: "http://211.114.96.121:1935/jejusi7/11-24.stream/playlist.m3u8" },
  { id: "udo_haumoktong",name: "우도하우목동",region: "제주시 우도면", category: "포구", originUrl: "http://211.114.96.121:1935/jejusi7/11-23.stream/playlist.m3u8" },

  // ── 제주시 삼양동 ──────────────────────────────────────────
  { id: "samyang",     name: "삼양해변",     region: "제주시 삼양동", category: "해변", originUrl: "http://211.114.96.121:1935/jejusi6/11-14.stream/playlist.m3u8" },

  // ── 제주시 용담동 ──────────────────────────────────────────
  { id: "jeju_airport",name: "제주공항",     region: "제주시 용담동", category: "공항", originUrl: "http://123.140.197.51/stream/33/play.m3u8" },

  // ── 제주시 탑동 ────────────────────────────────────────────
  { id: "tapdong",     name: "탑동서부두",   region: "제주시 탑동",   category: "관광지", originUrl: "http://211.114.96.121:1935/jejusi6/11-11.stream/playlist.m3u8" },
  { id: "donghandugi", name: "동한두기",     region: "제주시 용담동", category: "포구",   originUrl: "http://211.114.96.121:1935/jejusi6/11-12.stream/playlist.m3u8" },
  { id: "iho",         name: "이호해변",     region: "제주시 이호동", category: "해변",   originUrl: "http://211.114.96.121:1935/jejusi7/11-30T.stream/playlist.m3u8" },
  { id: "sechon",      name: "세천포구",     region: "제주시 이호동", category: "포구",   originUrl: "http://211.34.191.215:1935/live/1-149.stream/playlist.m3u8" },
  { id: "pyoseon",     name: "표선항",       region: "서귀포시 표선면", category: "항구", originUrl: "http://211.34.191.215:1935/live/1-77.stream/playlist.m3u8" },
  { id: "daepo",       name: "대포포구",     region: "서귀포시 중문동", category: "포구", originUrl: "http://211.34.191.215:1935/live/1-115.stream/playlist.m3u8" },

  // ── 제주시 도두동 ──────────────────────────────────────────
  { id: "dodu",        name: "도두항",       region: "제주시 도두동", category: "항구", originUrl: "http://211.114.96.121:1935/jejusi6/11-13.stream/playlist.m3u8" },

  // ── 제주시 추자면 ──────────────────────────────────────────
  { id: "chuja_daeseo", name: "추자대서",    region: "제주시 추자면", category: "포구", originUrl: "http://211.114.96.121:1935/jejusi7/11-26.stream/playlist.m3u8" },
  { id: "chuja_sinyang",name: "추자신양",    region: "제주시 추자면", category: "포구", originUrl: "http://211.114.96.121:1935/jejusi7/11-28.stream/playlist.m3u8" },
  { id: "chuja_mukri",  name: "추자묵리",    region: "제주시 추자면", category: "포구", originUrl: "http://211.114.96.121:1935/jejusi7/11-27.stream/playlist.m3u8" },
  { id: "chuja_yecho",  name: "추자예초",    region: "제주시 추자면", category: "포구", originUrl: "http://211.114.96.121:1935/jejusi7/11-29.stream/playlist.m3u8" },

  // ── 서귀포시 성산읍 ────────────────────────────────────────
  { id: "seongsan",    name: "성산일출봉",   region: "서귀포시 성산읍", category: "관광지", originUrl: "http://123.140.197.51/stream/34/play.m3u8" },
  { id: "seongsan_hang",name: "성산항",      region: "서귀포시 성산읍", category: "항구", originUrl: "http://211.34.191.215:1935/live/1-140.stream/playlist.m3u8" },
  { id: "seongsan_suma",name: "성산수마포구",region: "서귀포시 성산읍", category: "포구", originUrl: "http://211.34.191.215:1935/live/1-76.stream/playlist.m3u8" },
  { id: "seopjikoji",  name: "섭지코지",     region: "서귀포시 성산읍", category: "관광지", originUrl: "http://211.34.191.215:1935/live/1-116.stream/playlist.m3u8" },
  { id: "sinsan",      name: "신산포구",     region: "서귀포시 성산읍", category: "포구", originUrl: "http://211.34.191.215:1935/live/1-143.stream/playlist.m3u8" },

  // ── 서귀포시 남원읍 ────────────────────────────────────────
  { id: "namwon_deokdol",name: "남원덕돌",   region: "서귀포시 남원읍", category: "포구", originUrl: "http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100006/0/1/1.m3u8" },
  { id: "namwon_taeheung",name: "남원태흥포구",region: "서귀포시 남원읍", category: "항구", originUrl: "http://211.34.191.215:1935/live/1-146.stream/playlist.m3u8" },

  // ── 서귀포시 안덕면 ────────────────────────────────────────
  { id: "hwasun",      name: "화순해변",     region: "서귀포시 안덕면", category: "해변", originUrl: "http://211.34.191.215:1935/live/11-25.stream/playlist.m3u8" },
  { id: "sanbangsan",  name: "산방산",       region: "서귀포시 안덕면", category: "관광지", originUrl: "http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100012/0/1/1.m3u8" },

  // ── 서귀포시 대정읍 ────────────────────────────────────────
  { id: "sindo",       name: "신도포구",     region: "서귀포시 대정읍", category: "포구", originUrl: "http://211.34.191.215:1935/live/1-71.stream/playlist.m3u8" },
  { id: "mosulpo",     name: "모슬포항",     region: "서귀포시 대정읍", category: "항구", originUrl: "http://211.34.191.215:1935/live/1-155.stream/playlist.m3u8" },
  { id: "hamo_beach",  name: "하모해변",     region: "서귀포시 대정읍", category: "해변", originUrl: "http://211.34.191.215:1935/live/11-24.stream/playlist.m3u8" },
  { id: "daejeong_hamo",name: "대정하모",    region: "서귀포시 대정읍", category: "포구", originUrl: "http://211.34.191.215:1935/live/1-73.stream/playlist.m3u8" },

  // ── 서귀포시 중문동 ────────────────────────────────────────
  { id: "jungmun",     name: "중문해수욕장", region: "서귀포시 중문동", category: "해변", originUrl: "http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100010/0/1/1.m3u8" },

  // ── 서귀포시 보목동 ────────────────────────────────────────
  { id: "bomok",       name: "보목포구",     region: "서귀포시 보목동", category: "항구", originUrl: "http://211.34.191.215:1935/live/1-152.stream/playlist.m3u8" },

  // ── 서귀포시 서홍동 ────────────────────────────────────────
  { id: "cheonjiyeon", name: "천지연",       region: "서귀포시 서홍동", category: "관광지", originUrl: "http://211.34.191.215:1935/live/1-72.stream/playlist.m3u8" },
  { id: "saeyeongyo",  name: "새연교",       region: "서귀포시 서홍동", category: "관광지", originUrl: "http://123.140.197.51/stream/35/play.m3u8" },

  // ── 서귀포시 하예동 ────────────────────────────────────────
  { id: "nonjitmul",   name: "논짓물",       region: "서귀포시 하예동", category: "관광지", originUrl: "http://211.34.191.215:1935/live/1-193.stream/playlist.m3u8" },

  // ── 서귀포시 ───────────────────────────────────────────────
  { id: "seogwipo_hang1",name: "서귀포항",   region: "서귀포시",        category: "항구", originUrl: "http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100009/0/1/1.m3u8" },
  { id: "seogwipo_hang2",name: "서귀포항2",  region: "서귀포시",        category: "항구", originUrl: "http://211.34.191.215:1935/live/1-34.stream/playlist.m3u8" },
];

async function put(id, data) {
  const res = await fetch(`${BASE}/${id}`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return res.ok;
}

async function main() {
  console.log(`총 ${CCTVS.length}개 CCTV 등록 시작...\n`);
  let ok = 0, fail = 0;

  for (const cctv of CCTVS) {
    const { id, ...rest } = cctv;
    const entry = { ...rest, active: true, addedAt: new Date().toISOString() };
    const success = await put(id, entry);
    if (success) {
      console.log(`✅ ${cctv.name} (${id})`);
      ok++;
    } else {
      console.log(`❌ ${cctv.name} (${id}) - 실패`);
      fail++;
    }
  }

  console.log(`\n완료: ${ok}개 성공 / ${fail}개 실패`);
}

main();
