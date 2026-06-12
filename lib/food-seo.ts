/**
 * 도민맛집 SEO 데이터 — 룰 기반 생성 (CCTV `constants/cctv-seo.ts` 패턴 이식).
 *
 * 589개 전체를 빌드타임에 비용 0으로 채운다.
 * - 3-레이어 키워드: 헤비(제주맛집/제주여행) × 지역(애월·성산) × 롱테일(가게×지역×메뉴×의도)
 * - intro: 메뉴 유형별 SEO 본문 (네이버/구글 봇이 좋아하는 풍부한 텍스트)
 * - faqs: 위치/영업시간/가격/도민인증 → FAQPage JSON-LD 매핑
 *
 * AI 보강(하이브리드): 상위 트래픽 맛집은 추후 `getFoodSeoOverride(id)`(Firestore)로
 * 고유 설명을 캐싱해 룰 결과를 override한다(CCTV의 SPECIAL_SEO와 동일 패턴). — 트랙 A 후반.
 */

import type { Restaurant } from "@/types/restaurant";
import { parseOptions, formatHours } from "@/lib/restaurants";

export type FoodSeoData = {
  keywords: string[];
  longTailKeywords: string[];
  intro: string;          // SEO 본문 (룰 생성)
  faqs: { q: string; a: string }[];
  highlights: string[];   // 방문 포인트 칩
};

/** 메뉴 텍스트(자유 입력) → 유형별 SEO 설명 템플릿 (포함 매칭) */
function menuTemplate(menu: string, region: string, title: string): { intro: string; highlights: string[] } {
  const has = (...ks: string[]) => ks.some((k) => menu.includes(k));

  if (has("흑돼지", "근고기", "고기", "돼지", "오겹", "구이"))
    return {
      intro: `${title}은(는) 제주 ${region}의 흑돼지 맛집입니다. 제주 청정 자연에서 자란 흑돼지 특유의 쫄깃한 식감과 진한 풍미를 즐길 수 있어, 제주 여행 중 고기 한 점이 생각날 때 찾기 좋은 ${region} 대표 맛집입니다.`,
      highlights: ["제주 흑돼지 전문", `${region} 고기 맛집`, "제주 여행 필수 먹거리"],
    };
  if (has("회", "물회", "해산물", "갈치", "고등어", "전복", "해물", "조개", "문어", "오징어", "성게", "해녀"))
    return {
      intro: `${title}은(는) 제주 ${region}의 해산물 맛집입니다. 제주 앞바다에서 갓 잡은 신선한 해산물로 차려내, 제주 바다의 맛을 그대로 느낄 수 있는 ${region} 인기 맛집입니다.`,
      highlights: ["제주 신선 해산물", `${region} 회·해산물`, "제주 바다 먹거리"],
    };
  if (has("카페", "커피", "디저트", "베이커리", "브런치", "빵", "차", "티"))
    return {
      intro: `${title}은(는) 제주 ${region}의 카페입니다. 제주 특유의 감성과 풍경 속에서 커피 한 잔의 여유를 즐기기 좋아, 제주 여행 중 ${region} 일대를 둘러볼 때 쉬어가기 좋은 공간입니다.`,
      highlights: ["제주 감성 카페", `${region} 카페`, "제주 여행 쉼터"],
    };
  if (has("국수", "고기국수", "국밥", "칼국수", "면", "탕", "국"))
    return {
      intro: `${title}은(는) 제주 ${region}의 국수·국물 요리 맛집입니다. 제주식 진한 국물과 든든한 한 그릇으로, 현지인도 즐겨 찾는 ${region} 향토 맛집입니다.`,
      highlights: ["제주 향토 국수", `${region} 국물요리`, "현지인 맛집"],
    };
  return {
    intro: `${title}은(는) 제주 ${region}에 자리한 ${menu} 맛집입니다. 제주 현지의 맛을 담아내, 제주 여행 중 ${region} 일대를 둘러볼 때 들르기 좋은 곳입니다.`,
    highlights: [`제주 ${menu}`, `${region} 맛집`, "제주 여행 먹거리"],
  };
}

export function ruleFoodSeo(r: Restaurant): FoodSeoData {
  const { title, region, menu } = r;
  const options = parseOptions(r.options);
  const hours = formatHours(r.hours);
  const certified = options.includes("펀제주인증");

  // 헤비 × 지역 키워드
  const core = [
    title,
    `${title} 맛집`,
    `${title} 제주`,
    `${region} ${menu}`,
    `${region} ${menu} 맛집`,
    `${region} 맛집`,
    `제주 ${menu}`,
    `제주 ${menu} 맛집`,
    `제주 맛집`,
    `제주도 맛집`,
    `제주도 ${menu}`,
  ];

  // 롱테일 (가게 × 지역 × 메뉴 × 검색의도)
  const longTail = [
    `${region} ${menu} 추천`,
    `${region} 맛집 추천`,
    `제주 ${menu} 맛집 추천`,
    `${title} 가격`,
    `${title} 영업시간`,
    `${title} 메뉴`,
    `${title} 예약`,
    `${region} 가볼만한 맛집`,
    `제주 여행 ${menu}`,
    `${region} 현지인 맛집`,
    `제주 ${region} 맛집`,
    `${menu} 잘하는 집 ${region}`,
    certified && `제주 도민 맛집 ${region}`,
    certified && `${region} 현지인 추천 맛집`,
  ].filter(Boolean) as string[];

  const tmpl = menuTemplate(menu, region, title);

  const faqs = [
    {
      q: `${title}은(는) 어디에 있나요?`,
      a: `제주특별자치도 ${region}${r.address ? ` (${r.address})` : ""}에 위치한 ${menu} 맛집입니다.`,
    },
    hours && {
      q: `${title} 영업시간은 어떻게 되나요?`,
      a: `영업시간은 ${hours}입니다. 방문 전 영업 여부를 확인하시는 것을 권장합니다.`,
    },
    r.prices && { q: `${title} 가격대는 어느 정도인가요?`, a: `${r.prices}` },
    {
      q: `${region}에서 ${menu} 맛집을 찾는다면?`,
      a: `${title}을(를) 추천합니다. 제주 ${region} 일대 여행 중 들르기 좋은 ${menu} 맛집입니다.`,
    },
    certified && {
      q: `${title}은(는) 도민 맛집인가요?`,
      a: `네, 펀제주가 인증한 제주 도민 맛집입니다. 제주 현지인이 즐겨 찾는 검증된 곳입니다.`,
    },
  ].filter(Boolean) as { q: string; a: string }[];

  return {
    keywords: [...core, region, menu, "제주맛집", "도민맛집", "제주여행", "펀제주"],
    longTailKeywords: longTail,
    intro: tmpl.intro,
    faqs,
    highlights: tmpl.highlights,
  };
}
