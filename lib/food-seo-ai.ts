import "server-only";
import { generateJSON } from "@/lib/biz/gemini";
import { stripHtml, formatHours } from "@/lib/restaurants";
import type { Restaurant } from "@/types/restaurant";

/**
 * 도민맛집 AI SEO 생성 — 상위 트래픽 맛집의 고유 소개글/FAQ를 Gemini로 1회 생성.
 * 결과는 food_seo에 캐싱(saveFoodSeoOverride)되어 룰 결과를 override한다.
 * ⚠️ 사실(메뉴/위치/시간/가격)은 입력 데이터에만 근거 — 날조 금지.
 *
 * 구글/네이버 SEO 기준:
 * - 본문: 최소 600자, 3문단 구조 (소개 → 메뉴·특징 → 방문 팁)
 * - FAQ: 실제 검색 의도 기반 질문 5개, 답변 2-3문장
 * - 제목 h2에 들어갈 키워드 포함
 */

const SYS = `너는 제주 여행 로컬 SEO 카피라이터다. 주어진 도민맛집 정보로 검색 최적화된 고유 소개글과 FAQ를 작성한다.

규칙:
- 사실 정보(메뉴/위치/영업시간/가격)는 주어진 데이터에만 근거. 데이터에 없는 메뉴·수상이력·특징을 절대 지어내지 마라.
- 소개글(intro)은 4문단 구조, 900~1300자 (검색 노출·체류시간 위해 충분히 길게):
  1문단(200~280자): 가게명·지역·메뉴 핵심 소개 + "첫 문장은 40~60자 직답"으로 시작. 제주/지역명/메뉴 키워드를 자연스럽게 녹여라.
  2문단(250~350자): 메뉴·식재료·조리 특징 + 제주 식문화 맥락. 검색자가 궁금해할 구체적 정보 포함.
  3문단(200~300자): "이런 분들이 찾는 곳" — 실제 검색 의도(예: "제주 OO 흑돼지 현지인 맛집", "제주공항 근처 OO", "비 오는 날 제주 OO", "아이랑 제주 OO", "제주 OO 주차") 같은 방문 상황·키워드를 본문에 자연스럽게 녹여라.
  4문단(150~250자): 방문 팁 (웨이팅, 주차, 계절 추천, 제주 여행 동선 연계). 롱테일 키워드 포함.
- FAQ는 방문객이 실제로 검색할 질문 5개 (위치/영업/가격/메뉴특징/주차/예약 등). 각 답은 "첫 문장 40~60자 직답" + 2~3문장. 데이터 근거, 모르면 "방문 전 확인 권장".
- highlights는 짧은 특징 칩 3개 (검색 키워드가 될 만한 것으로).
- 과장·홍보문구 금지. 담백하고 정보성 있게. 사람·검색엔진·AI 답변엔진 모두 읽기 좋게(AEO).
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
원본 소개: ${stripHtml(r.content, 800) || "없음"}

반환 형식 (JSON):
{
  "intro": "900~1300자 SEO 소개글 (4문단, \\n\\n으로 문단 구분)",
  "faqs": [
    { "q": "질문 (검색 의도 기반)", "a": "첫 문장 40~60자 직답 + 2~3문장" }
  ],
  "highlights": ["특징 키워드1", "특징 키워드2", "특징 키워드3"]
}

주의: intro는 반드시 4문단 구조로. 각 문단은 \\n\\n으로 구분. 합산 900자 이상이어야 한다.`;

  const res = await generateJSON<FoodSeoAIResult>(SYS, prompt);
  return {
    intro: res.intro ?? "",
    faqs: Array.isArray(res.faqs) ? res.faqs.filter((f) => f.q && f.a).slice(0, 6) : [],
    highlights: Array.isArray(res.highlights) ? res.highlights.filter(Boolean).slice(0, 3) : [],
  };
}
