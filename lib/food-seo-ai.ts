import "server-only";
import { generateJSON } from "@/lib/biz/gemini";
import { stripHtml, formatHours } from "@/lib/restaurants";
import type { Restaurant } from "@/types/restaurant";

/**
 * 도민맛집 AI SEO 생성 — 상위 트래픽 맛집의 고유 소개글/FAQ를 Gemini로 1회 생성.
 * 결과는 food_seo에 캐싱(saveFoodSeoOverride)되어 룰 결과를 override한다.
 * ⚠️ 사실(메뉴/위치/시간/가격)은 입력 데이터에만 근거 — 날조 금지.
 */

const SYS = `너는 제주 여행 로컬 SEO 카피라이터다. 주어진 도민맛집 정보로 검색 최적화된 고유 소개글과 FAQ를 작성한다.

규칙:
- 사실 정보(메뉴/위치/영업시간/가격)는 주어진 데이터에만 근거한다. 데이터에 없는 메뉴·수상이력·특징을 절대 지어내지 마라.
- 소개글(intro)은 제주/지역명/메뉴 키워드를 자연스럽게 녹인 200~300자. 검색엔진과 사람 모두에게 읽기 좋게.
- FAQ는 방문객이 실제로 검색할 질문 3~4개 (위치/영업/주차/메뉴 등). 답은 데이터 근거 + 모르면 "방문 전 확인 권장".
- highlights는 짧은 특징 칩 3개.
- 과장·홍보문구 금지. 담백하고 정보성 있게.
- 반드시 유효한 JSON만 반환.`;

export type FoodSeoAIResult = {
  intro: string;
  faqs: { q: string; a: string }[];
  highlights: string[];
};

export async function generateFoodSeoAI(r: Restaurant): Promise<FoodSeoAIResult> {
  const hours = formatHours(r.hours);
  const prompt = `다음 제주 도민맛집 정보로 SEO 소개글과 FAQ를 JSON으로 생성하라.

상호: ${r.title}
지역: 제주 ${r.region}
메뉴/업종: ${r.menu}
주소: ${r.address || "미상"}
영업시간: ${hours || "미상"}
가격: ${r.prices || "미상"}
원본 소개: ${stripHtml(r.content, 600) || "없음"}

반환 형식 (JSON):
{
  "intro": "200~300자 SEO 소개글",
  "faqs": [{ "q": "질문", "a": "답변" }],
  "highlights": ["특징1", "특징2", "특징3"]
}`;

  const res = await generateJSON<FoodSeoAIResult>(SYS, prompt);
  return {
    intro: res.intro ?? "",
    faqs: Array.isArray(res.faqs) ? res.faqs.filter((f) => f.q && f.a) : [],
    highlights: Array.isArray(res.highlights) ? res.highlights.filter(Boolean) : [],
  };
}
