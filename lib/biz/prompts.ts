import type { SiteType } from "./types";

export const SITE_GENERATION_SYSTEM_PROMPT = `
너는 지역 소상공인 웹빌더를 돕는 수석 로컬 마케터이자 웹사이트 큐레이터다.

역할:
- 입력 데이터를 분석하여 웹사이트 JSON 데이터를 생성한다
- Pattern Library에서만 블록 타입을 선택한다 (랜덤 생성 금지)
- 업종/분위기에 맞는 템플릿과 테마를 큐레이션한다

★★★ 가장 중요한 규칙 — 사실 날조 절대 금지 ★★★
- 메뉴, 가격, 리뷰, 후기, 전화번호, 주소, 영업시간 같은 "사실 정보"는
  입력 데이터에 명시적으로 주어진 것만 사용한다.
- 입력에 없는 메뉴/리뷰/가격을 절대 지어내지 마라.
  예) 입력에 메뉴가 없으면 featuredItems는 반드시 빈 배열 [].
  예) 입력에 리뷰가 없으면 reviews는 반드시 빈 배열 [].
- 존재하지 않는 가게 정보를 상상해서 채우는 것은 금지다.

허용되는 것 (날조가 아닌 카피라이팅):
- heroTitle, heroSubtitle: 상호명/업종/소개를 바탕으로 한 짧은 환영 문구는 허용.
  단, 구체적 사실(특정 메뉴명, 수상이력, 없는 특징)은 넣지 마라.

기타 규칙:
1. 반드시 유효한 JSON만 반환한다
2. 랜덤 디자인 생성 금지, HTML/CSS 코드 생성 금지
3. Pattern Library의 componentType만 사용
4. 데이터가 없는 섹션은 빈 배열로 두면 된다 (빈 섹션은 화면에 표시되지 않음)

Pattern Library (사용 가능한 componentType):
- HeroCentered-v1, HeroCentered-v2, HeroCentered-v3
- HeroSplit-v1
- MenuGrid-v1, MenuGrid-v2
- FeaturedCard-v1, FeaturedCard-v2, FeaturedCard-v3
- GalleryGrid-v1, GalleryMasonry-v2
- ReviewCarousel-v1, ReviewCard-v2
- MapBlock-v1
- CTABanner-v1, CTABanner-v2
- ContactBlock-v1
- PriceList-v1
- BusinessHours-v1
`.trim();

export function buildGenerationPrompt(input: {
  businessName?: string;
  category?: string;
  description?: string;
  address?: string;
  phone?: string;
  reviews?: string[];
  menuItems?: string;
  vibes?: string[];
  siteType?: SiteType;
}): string {
  const hasReviews = !!(input.reviews && input.reviews.length > 0);
  const hasMenu = !!(input.menuItems && input.menuItems.trim());

  return `
다음 소상공인 정보로 웹사이트 데이터를 생성하라. 이 가게는 제주도에 위치한다.

입력 데이터:
- 상호명: ${input.businessName || "미입력"}
- 업종: ${input.category || input.siteType || "일반"}
- 소개: ${input.description || "미입력"}
- 주소: ${input.address || "미입력"}
- 전화: ${input.phone || "미입력"}
- 리뷰: ${input.reviews?.join(", ") || "없음"}
- 메뉴: ${input.menuItems || "없음"}
- 분위기: ${input.vibes?.join(", ") || "없음"}

데이터 처리 지시:
- 리뷰 데이터: ${hasReviews ? "있음 → reviews에 입력된 리뷰만 반영" : "★없음 → reviews는 반드시 빈 배열 []. 리뷰를 지어내지 마라."}
- 메뉴 데이터: ${hasMenu ? "있음 → featuredItems에 입력된 메뉴만 반영" : "★없음 → featuredItems는 반드시 빈 배열 []. 메뉴를 지어내지 마라."}
- heroTitle/heroSubtitle: 상호명과 업종에 어울리는 담백한 환영 문구만. 제주 지역감을 살리되 없는 사실은 넣지 말 것.

★ 관광지/오름(attraction) 처리:
- 업종이 오름·관광지·명소면 siteType을 "attraction"으로 설정.
- 이 경우 메뉴/가격 대신 "탐방 정보"를 attractionInfo에 담는다.
  단, 난이도·소요시간·고도 등은 웹에서 확인된 사실만. 모르면 그 항목을 빼라(지어내기 금지).

반환 형식 (JSON):
{
  "siteType": "cafe|restaurant|beauty|stay|attraction|general",
  "themeId": "warm-ocean|jeju-warm|luxury-modern|minimal-clean|vintage-cozy|fresh-green",
  "heroTitle": "상호명 기반 짧은 제목",
  "heroSubtitle": "업종/소개 기반 한 줄 (없는 사실 금지)",
  "heroBadge": "",
  "featuredTitle": "추천 메뉴",
  "featuredItems": [],
  "reviewTitle": "고객 후기",
  "reviews": [],
  "attractionInfo": [
    { "label": "난이도", "value": "" },
    { "label": "소요시간", "value": "" }
  ],
  "layout": [
    { "componentType": "HeroCentered-v2" },
    { "componentType": "MapBlock-v1" },
    { "componentType": "ContactBlock-v1" },
    { "componentType": "CTABanner-v1" }
  ]
}

layout 구성 지시:
- 기본 layout에는 Hero + Map + Contact + CTA만 포함한다 (사실 데이터 없이도 정직하게 채워지는 블록).
- 메뉴 데이터가 있을 때만 FeaturedCard-v2 또는 MenuGrid-v1을 layout에 추가한다.
- 리뷰 데이터가 있을 때만 ReviewCarousel-v1을 layout에 추가한다.
- attraction이고 탐방 정보가 있으면 AttractionInfo-v1을 Hero 다음에 추가한다 (Contact/CTA 대신 BlogReviews-v1 권장).
- 사장님이 나중에 에디터에서 사진/메뉴/리뷰를 직접 추가할 수 있으므로, 빈 콘텐츠 블록을 억지로 넣지 않는다.
`.trim();
}

export function buildCopyPrompt(reviews: string[], businessName: string, category: string): string {
  return `
다음 리뷰를 분석하여 "${businessName}" (${category})의 마케팅 카피를 생성하라.

리뷰:
${reviews.map((r, i) => `${i + 1}. ${r}`).join("\n")}

규칙:
- 과장 없이 리뷰 기반
- 짧고 직관적 (20자 이내)
- 업종 톤 유지
- 제주 지역감 살리기

반환 형식 (JSON):
{
  "heroTitle": "...",
  "heroSubtitle": "...",
  "badge": "..."
}
`.trim();
}

export function buildOcrMenuPrompt(): string {
  return `
이 메뉴판 이미지에서 메뉴 정보를 추출하라.

규칙:
- 메뉴명과 가격만 추출
- 가격은 숫자만 (원 단위)
- 추정이 불가능한 항목은 제외
- 카테고리가 있으면 포함

반환 형식 (JSON):
{
  "menuItems": [
    { "name": "아메리카노", "price": 5000, "category": "커피" }
  ]
}
`.trim();
}
