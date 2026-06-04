/**
 * CCTV별 SEO 데이터
 * - 핵심 키워드: 지역명 + 시설명 + 의도 키워드
 * - 롱테일: 검색 의도 (날씨/파도/혼잡도/실시간/오늘/지금)
 * - intro: 본문 콘텐츠 (네이버 봇이 좋아하는 풍부한 텍스트)
 */

export type CctvSeoData = {
  keywords: string[];           // 핵심 키워드
  longTailKeywords: string[];   // 롱테일 키워드
  intro: string;                // 장소 상세 소개 (200~400자)
  nearby: string[];             // 주변 명소/맛집
  bestTime: string;             // 추천 시간대
  tips: string[];               // 방문 팁
};

/**
 * 공통 키워드 생성기 — 모든 CCTV에 자동 적용되는 패턴
 */
export function generateCommonKeywords(name: string, region: string, category: string): {
  core: string[];
  longTail: string[];
} {
  // 공백 제거한 이름 (예: "김녕해변")
  const cleanName = name.replace(/\s+/g, "");
  const regionParts = region.split(" "); // "제주시 구좌읍" → ["제주시", "구좌읍"]
  const mainRegion = regionParts[0];
  const subRegion = regionParts[1] || "";

  const core = [
    `${cleanName} 실시간`,
    `${cleanName} CCTV`,
    `${cleanName} 라이브캠`,
    `${cleanName} 라이브`,
    `${cleanName} 실시간 영상`,
    `제주 ${cleanName}`,
    `제주도 ${cleanName}`,
    `${cleanName} 지금`,
    `${cleanName} 오늘`,
    `${mainRegion} ${cleanName}`,
    subRegion && `${subRegion} ${category}`,
    `제주 ${category} 실시간`,
    `제주 ${category} CCTV`,
  ].filter(Boolean) as string[];

  const longTail = [
    `${cleanName} 지금 날씨`,
    `${cleanName} 실시간 날씨`,
    `${cleanName} 파도 상황`,
    `${cleanName} 사람 많나요`,
    `${cleanName} 혼잡도`,
    `${cleanName} 주차장`,
    `${cleanName} 가는 길`,
    `${cleanName} 오늘 어때요`,
    `${cleanName} 지금 모습`,
    `${cleanName} 라이브 보기`,
    `제주 ${cleanName} 실시간`,
    `${mainRegion} 실시간 CCTV`,
    `${mainRegion} ${category} 추천`,
    `제주 여행 ${cleanName}`,
    `${cleanName} 날씨 확인`,
    `제주 ${subRegion || mainRegion} 라이브`,
  ].filter(Boolean) as string[];

  return { core, longTail };
}

/**
 * 카테고리별 기본 설명 템플릿
 */
const CATEGORY_DESC: Record<string, { intro: string; tips: string[]; bestTime: string }> = {
  해변: {
    intro:
      "에메랄드빛 제주 바다를 실시간으로 만나보세요. 파도 상황, 날씨, 혼잡도까지 한눈에 확인할 수 있어 방문 전 체크에 좋습니다. 일출·일몰 시간대에는 환상적인 풍경이 펼쳐집니다.",
    tips: [
      "여름 성수기엔 오전 10시 이전 또는 오후 4시 이후 방문 추천",
      "물놀이 전 실시간 파도 상황 확인 필수",
      "주차장 만차 여부도 라이브로 확인 가능",
    ],
    bestTime: "일출 (06:00) · 일몰 (18:00~19:00) · 평일 오전",
  },
  포구: {
    intro:
      "제주 어촌의 생생한 모습을 실시간으로 담은 포구 라이브캠입니다. 작은 배들과 푸른 바다, 한적한 어촌의 풍경을 감상할 수 있습니다. 사진 명소로도 인기가 많습니다.",
    tips: [
      "이른 아침 어선 출항 모습 추천",
      "노을 시간대 사진 찍기 좋음",
      "주변 해녀 식당 방문도 함께 추천",
    ],
    bestTime: "이른 아침 · 노을 시간대",
  },
  항구: {
    intro:
      "제주 주요 항구의 실시간 모습을 확인하세요. 배편 운항 상황, 날씨, 풍속을 미리 체크할 수 있어 여행 계획에 유용합니다.",
    tips: [
      "배편 출발 전 항구 날씨 확인 권장",
      "강풍 시 운항 중단 가능성 확인",
      "주변 식당과 카페 방문도 함께",
    ],
    bestTime: "배편 출발 시간 1시간 전",
  },
  오름: {
    intro:
      "제주의 명품 오름과 그 주변 풍경을 실시간으로 만나보세요. 등반 전 날씨와 시야를 확인하기 좋고, 일출·일몰 명소로도 유명합니다.",
    tips: [
      "흐린 날엔 정상 시야 제한될 수 있음",
      "일출 명소는 새벽 5~6시 라이브 추천",
      "주변 카페와 함께 코스 추천",
    ],
    bestTime: "일출 시간대 · 맑은 날 오전",
  },
  관광지: {
    intro:
      "제주 대표 관광지의 실시간 모습입니다. 방문객 수와 날씨를 미리 확인해 한적한 시간대를 노릴 수 있습니다.",
    tips: [
      "주말보다 평일 방문 권장",
      "오전 시간대 가장 한적",
      "주변 맛집과 카페도 함께 즐기기",
    ],
    bestTime: "평일 오전 · 늦은 오후",
  },
  공항: {
    intro:
      "제주국제공항 주변 실시간 모습입니다. 도착·출발 전 공항 주변 날씨와 교통 상황을 확인하세요.",
    tips: [
      "출발 2~3시간 전 도착 권장",
      "주변 렌터카 업체 위치 확인",
      "공항 주변 맛집 미리 체크",
    ],
    bestTime: "출발/도착 직전",
  },
};

/**
 * CCTV별 ID 기반 추가 SEO 데이터 (특화된 정보)
 * 주요 CCTV에만 수동 보강. 나머지는 카테고리 템플릿 사용.
 */
const SPECIAL_SEO: Record<string, Partial<CctvSeoData>> = {
  gimnyeong: {
    intro:
      "제주 동쪽 구좌읍에 위치한 김녕해변은 에메랄드빛 바다와 하얀 모래사장으로 유명한 인생샷 명소입니다. 김녕성세기해변, 김녕요트투어, 김녕미로공원 등 다양한 즐길거리가 모여있는 동쪽 여행 1번지입니다.",
    nearby: ["김녕성세기해변", "김녕요트투어", "김녕미로공원", "월정해변(차로 5분)", "행원포구"],
  },
  woljeong: {
    intro:
      "월정해변은 제주 동쪽 구좌읍의 대표 인기 해변으로, 투명한 옥빛 바다와 새하얀 모래로 유명합니다. 해변가 카페거리와 함께 제주 동쪽 여행 필수 코스이며, 인스타그램 사진 명소로 사랑받고 있습니다.",
    nearby: ["월정리 카페거리", "행원포구 (풍력발전)", "김녕해변", "용천동굴 (유네스코)", "평대해변"],
  },
  hamdeok: {
    intro:
      "함덕해변은 제주 북동부 조천읍을 대표하는 해변으로, 에메랄드빛 바다와 부드러운 모래사장이 일품입니다. 서우봉을 끼고 있어 일출 명소로도 유명하며, 가족 여행객들에게 특히 인기가 많습니다.",
    nearby: ["서우봉 둘레길", "함덕 카페거리", "조천 만세동산", "북촌포구", "신촌포구"],
  },
  hyeopjae: {
    intro:
      "협재해변은 제주 서쪽 한림읍을 대표하는 해변으로, 비양도가 보이는 환상적인 뷰가 일품입니다. 에메랄드빛 바다와 하얀 모래, 야자수가 어우러진 이국적인 풍경으로 제주 여행 필수 코스로 꼽힙니다.",
    nearby: ["비양도", "한림공원", "금능해수욕장", "협재 카페거리", "수월봉"],
  },
  seongsan: {
    intro:
      "유네스코 세계자연유산으로 지정된 성산일출봉은 제주를 대표하는 랜드마크입니다. 분화구의 웅장한 모습과 일출 명소로 유명하며, 동쪽 여행의 시작점이자 대한민국 사진 명소 TOP 10에 늘 꼽힙니다.",
    nearby: ["섭지코지", "광치기해변", "오조포구", "성산항 (우도행)", "혼인지"],
  },
  jeju_airport: {
    intro:
      "제주국제공항은 연간 3천만 명이 이용하는 대한민국 두 번째 공항입니다. 실시간 영상으로 공항 주변 날씨와 교통 상황을 확인하세요.",
    nearby: ["용두암", "도두봉", "이호테우해변", "탑동광장", "용연다리"],
  },
  jungmun: {
    intro:
      "중문관광단지의 중문색달해수욕장은 검은 모래와 황금빛 모래가 어우러진 독특한 풍경의 해변입니다. 서퍼들의 성지로도 유명하며, 주변에 카지노·리조트·신라호텔·롯데호텔 등 럭셔리 시설이 모여있습니다.",
    nearby: ["천제연폭포", "여미지식물원", "신라호텔", "주상절리대", "박물관은살아있다"],
  },
  seopjikoji: {
    intro:
      "섭지코지는 드라마 '올인' 촬영지로 유명해진 해안 절벽 명소입니다. 등대와 유채꽃, 바다가 어우러진 풍경은 사진작가들의 단골 출사지이며, 봄철 유채꽃 시즌엔 노란 바다가 펼쳐집니다.",
    nearby: ["성산일출봉", "휘닉스 제주", "광치기해변", "오조포구", "표선해비치"],
  },
  cheonjiyeon: {
    intro:
      "천지연폭포는 22m 높이의 웅장한 폭포로 서귀포 도심에서 도보 이동이 가능한 접근성 좋은 명소입니다. 밤에는 조명이 켜져 환상적인 야경을 자아내며, 주변 새연교와 함께 서귀포 여행 필수 코스입니다.",
    nearby: ["새연교", "서귀포항", "정방폭포", "이중섭거리", "올레시장"],
  },
  sanbangsan: {
    intro:
      "산방산은 제주 서남부 안덕면의 상징적인 종모양 화산암 봉우리입니다. 산방굴사, 용머리해안, 사계해변과 함께 어우러진 풍경은 제주 서남부 여행의 백미입니다.",
    nearby: ["용머리해안", "사계해변", "산방굴사", "송악산", "안덕계곡"],
  },
  mosulpo: {
    intro:
      "모슬포항은 제주 최남단의 어항으로, 마라도와 가파도행 배편이 출발하는 곳입니다. 신선한 자리돔과 방어로 유명하며, 겨울철 방어 축제 시즌엔 미식가들의 성지로 변합니다.",
    nearby: ["마라도", "가파도", "송악산", "산이수동", "운진항"],
  },
};

/**
 * CCTV에 대한 완전한 SEO 데이터 생성
 */
export function getCctvSeo(
  id: string,
  name: string,
  region: string,
  category: string,
  description: string
): CctvSeoData {
  const { core, longTail } = generateCommonKeywords(name, region, category);
  const special = SPECIAL_SEO[id] || {};
  const template = CATEGORY_DESC[category] || CATEGORY_DESC["관광지"];

  return {
    keywords: [...core, region, category, "제주 여행", "펀제주", "FunJeju"],
    longTailKeywords: longTail,
    intro: special.intro || `${description} ${template.intro}`,
    nearby: special.nearby || [],
    bestTime: special.bestTime || template.bestTime,
    tips: special.tips || template.tips,
  };
}
