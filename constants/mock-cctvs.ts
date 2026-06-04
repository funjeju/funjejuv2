import type { Cctv } from "@/types/cctv";

const PROXY_BASE = process.env.NEXT_PUBLIC_PROXY_URL ?? "";

function proxy(id: string): string | null {
  if (!PROXY_BASE) return null;
  // AWS Lightsail Node 프록시: https://proxy.tuberecipe.co.kr/cctv/{id}
  return `${PROXY_BASE}/cctv/${id}`;
}

export const mockCctvs: Cctv[] = [
  // ── 제주시 구좌읍 ──────────────────────────────────────────
  { id: "gimnyeong",    name: "김녕해변",      region: "제주시 구좌읍",  category: "해변",  status: "실시간", description: "제주 동쪽 구좌읍의 에메랄드빛 해변입니다.", latitude: 33.553, longitude: 126.757, isSaved: false, streamProxyUrl: proxy("gimnyeong") },
  { id: "woljeong",     name: "월정해변",      region: "제주시 구좌읍",  category: "해변",  status: "실시간", description: "투명한 바다색으로 유명한 인기 해변입니다.", latitude: 33.558, longitude: 126.796, isSaved: false, streamProxyUrl: proxy("woljeong") },
  { id: "pyeongdae",    name: "평대해변",      region: "제주시 구좌읍",  category: "해변",  status: "실시간", description: "한적하고 조용한 동쪽 해변입니다.", latitude: 33.543, longitude: 126.830, isSaved: false, streamProxyUrl: proxy("pyeongdae") },

  // ── 제주시 조천읍 ──────────────────────────────────────────
  { id: "hamdeok",      name: "함덕해변",      region: "제주시 조천읍",  category: "해변",  status: "실시간", description: "북동부 대표 해변으로 바다색이 아름답습니다.", latitude: 33.543, longitude: 126.669, isSaved: false, streamProxyUrl: proxy("hamdeok") },

  // ── 제주시 애월읍 ──────────────────────────────────────────
  { id: "hagwi",        name: "하귀가문동",    region: "제주시 애월읍",  category: "포구",  status: "실시간", description: "애월읍 하귀 해안 포구입니다.", latitude: 33.479, longitude: 126.388, isSaved: false, streamProxyUrl: proxy("hagwi") },
  { id: "gwakji",       name: "곽지해변",      region: "제주시 애월읍",  category: "해변",  status: "실시간", description: "애월읍의 조용하고 예쁜 해변입니다.", latitude: 33.460, longitude: 126.338, isSaved: false, streamProxyUrl: proxy("gwakji") },

  // ── 제주시 한림읍 ──────────────────────────────────────────
  { id: "hyeopjae",     name: "협재해변",      region: "제주시 한림읍",  category: "해변",  status: "실시간", description: "에메랄드빛 바다와 비양도가 보이는 서쪽 대표 해변입니다.", latitude: 33.394, longitude: 126.239, isSaved: false, streamProxyUrl: proxy("hyeopjae") },
  { id: "ongpo",        name: "옹포항",        region: "제주시 한림읍",  category: "항구",  status: "실시간", description: "한림읍 옹포리 항구입니다.", latitude: 33.411, longitude: 126.253, isSaved: false, streamProxyUrl: proxy("ongpo") },

  // ── 제주시 한경면 ──────────────────────────────────────────
  { id: "sinchang",     name: "신창포구",      region: "제주시 한경면",  category: "포구",  status: "실시간", description: "바람이 강해 풍력발전기가 있는 신창리 포구입니다.", latitude: 33.332, longitude: 126.148, isSaved: false, streamProxyUrl: proxy("sinchang") },
  { id: "panpo",        name: "판포해변",      region: "제주시 한경면",  category: "해변",  status: "실시간", description: "한경면 서쪽 해안의 한적한 해변입니다.", latitude: 33.352, longitude: 126.178, isSaved: false, streamProxyUrl: proxy("panpo") },

  // ── 제주시 우도면 ──────────────────────────────────────────
  { id: "udo_cheonjin", name: "우도천진항",    region: "제주시 우도면",  category: "항구",  status: "실시간", description: "우도 주요 항구로 배편이 운행됩니다.", latitude: 33.506, longitude: 126.951, isSaved: false, streamProxyUrl: proxy("udo_cheonjin") },
  { id: "udo_haumoktong",name: "우도하우목동", region: "제주시 우도면",  category: "포구",  status: "실시간", description: "우도 하우목동 해안 전경입니다.", latitude: 33.497, longitude: 126.941, isSaved: false, streamProxyUrl: proxy("udo_haumoktong") },

  // ── 제주시 삼양동 ──────────────────────────────────────────
  { id: "samyang",      name: "삼양해변",      region: "제주시 삼양동",  category: "해변",  status: "실시간", description: "검은 모래로 유명한 제주시 동쪽 해변입니다.", latitude: 33.524, longitude: 126.582, isSaved: false, streamProxyUrl: proxy("samyang") },

  // ── 제주시 용담동 ──────────────────────────────────────────
  { id: "jeju_airport", name: "제주공항",      region: "제주시 용담동",  category: "공항",  status: "실시간", description: "제주국제공항 주변 현황을 확인합니다.", latitude: 33.511, longitude: 126.493, isSaved: false, streamProxyUrl: proxy("jeju_airport") },

  // ── 제주시 탑동 ────────────────────────────────────────────
  { id: "tapdong",      name: "탑동광장",      region: "제주시 탑동",    category: "관광지",status: "실시간", description: "제주시 해안가 탑동광장 일대입니다.", latitude: 33.514, longitude: 126.521, isSaved: false, streamProxyUrl: proxy("tapdong") },

  // ── 제주시 도두동 ──────────────────────────────────────────
  { id: "dodu",         name: "도두항",        region: "제주시 도두동",  category: "항구",  status: "실시간", description: "제주공항 인근 도두 어항입니다.", latitude: 33.513, longitude: 126.475, isSaved: false, streamProxyUrl: proxy("dodu") },

  // ── 제주시 추자면 ──────────────────────────────────────────
  { id: "chuja_daeseo", name: "추자대서",      region: "제주시 추자면",  category: "포구",  status: "실시간", description: "추자도 대서리 해안입니다.", latitude: 33.961, longitude: 126.886, isSaved: false, streamProxyUrl: proxy("chuja_daeseo") },
  { id: "chuja_sinyang",name: "추자신양",      region: "제주시 추자면",  category: "포구",  status: "실시간", description: "추자도 신양리 포구입니다.", latitude: 33.956, longitude: 126.892, isSaved: false, streamProxyUrl: proxy("chuja_sinyang") },
  { id: "chuja_mukri",  name: "추자묵리",      region: "제주시 추자면",  category: "포구",  status: "실시간", description: "추자도 묵리 해안입니다.", latitude: 33.952, longitude: 126.878, isSaved: false, streamProxyUrl: proxy("chuja_mukri") },
  { id: "chuja_yecho",  name: "추자예초",      region: "제주시 추자면",  category: "포구",  status: "실시간", description: "추자도 예초리 포구입니다.", latitude: 33.946, longitude: 126.871, isSaved: false, streamProxyUrl: proxy("chuja_yecho") },

  // ── 서귀포시 성산읍 ────────────────────────────────────────
  { id: "seongsan",     name: "성산일출봉",    region: "서귀포시 성산읍",category: "관광지",status: "실시간", description: "유네스코 세계자연유산, 일출 명소입니다.", latitude: 33.458, longitude: 126.942, isSaved: false, streamProxyUrl: proxy("seongsan") },
  { id: "seongsan_hang",name: "성산항",        region: "서귀포시 성산읍",category: "항구",  status: "실시간", description: "우도 배편이 출발하는 성산항입니다.", latitude: 33.469, longitude: 126.929, isSaved: false, streamProxyUrl: proxy("seongsan_hang") },
  { id: "seongsan_suma",name: "성산수마포구",  region: "서귀포시 성산읍",category: "포구",  status: "실시간", description: "성산읍 수마포구 일대입니다.", latitude: 33.461, longitude: 126.921, isSaved: false, streamProxyUrl: proxy("seongsan_suma") },
  { id: "seopjikoji",   name: "섭지코지",      region: "서귀포시 성산읍",category: "관광지",status: "실시간", description: "드라마 올인 촬영지로 유명한 해안 절경입니다.", latitude: 33.428, longitude: 126.930, isSaved: false, streamProxyUrl: proxy("seopjikoji") },
  { id: "sinsan",       name: "신산포구",      region: "서귀포시 성산읍",category: "포구",  status: "실시간", description: "성산읍 신산리 포구입니다.", latitude: 33.440, longitude: 126.914, isSaved: false, streamProxyUrl: proxy("sinsan") },

  // ── 서귀포시 남원읍 ────────────────────────────────────────
  { id: "namwon_deokdol",name: "남원덕돌",     region: "서귀포시 남원읍",category: "포구",  status: "실시간", description: "남원읍 덕돌포구입니다.", latitude: 33.280, longitude: 126.715, isSaved: false, streamProxyUrl: proxy("namwon_deokdol") },
  { id: "namwon_taeheung",name: "남원태흥포구",region: "서귀포시 남원읍",category: "항구",  status: "실시간", description: "남원읍 태흥리 포구입니다.", latitude: 33.270, longitude: 126.700, isSaved: false, streamProxyUrl: proxy("namwon_taeheung") },

  // ── 서귀포시 안덕면 ────────────────────────────────────────
  { id: "hwasun",       name: "화순해변",      region: "서귀포시 안덕면",category: "해변",  status: "실시간", description: "서귀포 서쪽 화순해수욕장입니다.", latitude: 33.239, longitude: 126.318, isSaved: false, streamProxyUrl: proxy("hwasun") },
  { id: "sanbangsan",   name: "산방산",        region: "서귀포시 안덕면",category: "관광지",status: "실시간", description: "제주 서남쪽의 용암돔 산방산 일대입니다.", latitude: 33.240, longitude: 126.315, isSaved: false, streamProxyUrl: proxy("sanbangsan") },

  // ── 서귀포시 대정읍 ────────────────────────────────────────
  { id: "sindo",        name: "신도포구",      region: "서귀포시 대정읍",category: "포구",  status: "실시간", description: "대정읍 신도리 포구입니다.", latitude: 33.226, longitude: 126.183, isSaved: false, streamProxyUrl: proxy("sindo") },
  { id: "mosulpo",      name: "모슬포항",      region: "서귀포시 대정읍",category: "항구",  status: "실시간", description: "마라도 배편이 출발하는 제주 최남단 항구입니다.", latitude: 33.214, longitude: 126.252, isSaved: false, streamProxyUrl: proxy("mosulpo") },
  { id: "hamo_beach",   name: "하모해변",      region: "서귀포시 대정읍",category: "해변",  status: "실시간", description: "대정읍 하모리 해수욕장입니다.", latitude: 33.217, longitude: 126.255, isSaved: false, streamProxyUrl: proxy("hamo_beach") },
  { id: "daejeong_hamo",name: "대정하모",      region: "서귀포시 대정읍",category: "포구",  status: "실시간", description: "대정 하모 해안 일대입니다.", latitude: 33.218, longitude: 126.257, isSaved: false, streamProxyUrl: proxy("daejeong_hamo") },

  // ── 서귀포시 중문동 ────────────────────────────────────────
  { id: "jungmun",      name: "중문해수욕장",  region: "서귀포시 중문동",category: "해변",  status: "실시간", description: "서귀포 대표 해수욕장으로 관광단지가 인접합니다.", latitude: 33.245, longitude: 126.412, isSaved: false, streamProxyUrl: proxy("jungmun") },

  // ── 서귀포시 보목동 ────────────────────────────────────────
  { id: "bomok",        name: "보목포구",      region: "서귀포시 보목동",category: "항구",  status: "실시간", description: "서귀포시 보목동 포구입니다.", latitude: 33.236, longitude: 126.582, isSaved: false, streamProxyUrl: proxy("bomok") },

  // ── 서귀포시 서홍동 ────────────────────────────────────────
  { id: "cheonjiyeon",  name: "천지연",        region: "서귀포시 서홍동",category: "관광지",status: "실시간", description: "서귀포 대표 폭포 관광지입니다.", latitude: 33.245, longitude: 126.559, isSaved: false, streamProxyUrl: proxy("cheonjiyeon") },
  { id: "saeyeongyo",   name: "새연교",        region: "서귀포시 서홍동",category: "관광지",status: "실시간", description: "서귀포항과 새섬을 잇는 보행교입니다.", latitude: 33.242, longitude: 126.562, isSaved: false, streamProxyUrl: proxy("saeyeongyo") },

  // ── 서귀포시 하예동 ────────────────────────────────────────
  { id: "nonjitmul",    name: "논짓물",        region: "서귀포시 하예동",category: "관광지",status: "실시간", description: "서귀포 하예동 해안 용천수 명소입니다.", latitude: 33.233, longitude: 126.488, isSaved: false, streamProxyUrl: proxy("nonjitmul") },

  // ── 서귀포시 ───────────────────────────────────────────────
  { id: "seogwipo_hang1",name: "서귀포항",     region: "서귀포시",        category: "항구",  status: "실시간", description: "서귀포 여객터미널 항구입니다.", latitude: 33.240, longitude: 126.561, isSaved: false, streamProxyUrl: proxy("seogwipo_hang1") },
  { id: "seogwipo_hang2",name: "서귀포항2",    region: "서귀포시",        category: "항구",  status: "실시간", description: "서귀포항 추가 앵글입니다.", latitude: 33.241, longitude: 126.563, isSaved: false, streamProxyUrl: proxy("seogwipo_hang2") },
];
