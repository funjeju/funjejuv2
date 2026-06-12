import "server-only";
import { generateJSON } from "@/lib/biz/gemini";
import { loadAllRestaurants, stripHtml } from "@/lib/restaurants";
import type { Restaurant } from "@/types/restaurant";
import type { Content, ContentSection } from "@/types/content";

/**
 * 웹진 자동 생성 — 도민맛집 589개를 지역×메뉴로 묶어 여행 큐레이션 글 생성.
 * ⚠️ 맛집 사실은 데이터 기반, 묶음 카피만 AI. 날조 금지.
 *
 * SEO 기준 (구글/네이버):
 * - 전체 본문 1,500자 이상
 * - 제목: 검색 의도 키워드 먼저 (지역+메뉴+추천 패턴)
 * - intro: 4~5문장 (지역 특색 + 메뉴 계절성 + 여행 동선)
 * - 각 섹션: 4~6문장 (맛집 특징 + 대표 메뉴 + 분위기 + 방문 팁)
 */

export type WebzineTopic = {
  region: string;
  menu: string;
  picks: Restaurant[];
};

/** 맛집이 충분(3+)한 지역×메뉴 조합 중 하나를 무작위 선정 */
export async function pickWebzineTopic(seed?: number): Promise<WebzineTopic | null> {
  const all = await loadAllRestaurants();
  const groups = new Map<string, Restaurant[]>();
  for (const r of all) {
    if (!r.region || !r.menu) continue;
    const key = `${r.region}__${r.menu}`;
    const arr = groups.get(key) ?? [];
    arr.push(r);
    groups.set(key, arr);
  }
  const candidates = [...groups.entries()].filter(([, arr]) => arr.length >= 3);
  if (candidates.length === 0) return null;

  const idx = (seed ?? Date.now()) % candidates.length;
  const [key, arr] = candidates[idx];
  const [region, menu] = key.split("__");
  // 상위 6개까지 (이미지 있는 것 우선)
  const picks = [...arr]
    .sort((a, b) => (b.images?.length ?? 0) - (a.images?.length ?? 0))
    .slice(0, 6);
  return { region, menu, picks };
}

type WebzineAIResult = {
  title: string;
  subtitle: string;
  intro: string;
  sections: { restaurantId: string; heading: string; body: string }[];
  keywords: string[];
};

// slug는 ASCII만 — 한글 slug는 URL 인코딩 왕복에서 라우팅 매칭이 불안정.
function slugify(_region: string, _menu: string): string {
  return `wz-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

const SYS = `너는 제주 여행 매거진 에디터다. 주어진 도민맛집 목록으로 검색 최적화된 여행 큐레이션 글을 쓴다.

규칙:
- 각 맛집의 사실(이름/지역/메뉴)은 데이터에 근거. 없는 메뉴·가격·수상이력 날조 금지.
- 제목은 검색 의도 키워드를 앞에 배치한 매력적인 한 줄. 형태: "제주 [지역] [메뉴] 추천 N곳 | 현지인도 즐겨 찾는 맛집" 또는 "제주 여행 [지역] [메뉴] 맛집 BEST N, 현지인 단골집 총정리".
- subtitle은 지역+메뉴 특색을 한 줄로 요약.
- intro는 4~5문장 (지역 소개, 이 메뉴가 이 지역에서 특별한 이유, 계절·날씨별 추천 상황, 여행 동선 팁 포함). 제주/지역/메뉴 키워드 자연스럽게 녹여라.
- 각 맛집 섹션은 4~6문장. 맛집 특징, 대표 메뉴 또는 분위기, 이 맛집만의 포인트, 방문 팁(웨이팅·주차·계절 등) 포함. 과장 금지, 정보성 있게.
- 전체 글(intro + 모든 섹션 body 합산)이 1,500자 이상이 되도록 충분히 작성하라.
- keywords는 제주/지역/메뉴 조합 + 롱테일 10~15개.
- 반드시 유효한 JSON만 반환.`;

export async function generateWebzineDraft(topic: WebzineTopic): Promise<Content> {
  const list = topic.picks
    .map((r) => `- [${r.id}] ${r.title} (${r.region}, ${r.menu})${r.address ? ` / ${r.address}` : ""} :: ${stripHtml(r.content, 200)}`)
    .join("\n");

  const prompt = `다음 제주 ${topic.region}의 ${topic.menu} 맛집들로 여행 큐레이션 웹진 글을 JSON으로 작성하라.
전체 글(intro + 각 섹션 body 합산)은 반드시 1,500자 이상이어야 한다.

맛집 목록 (형식: [id] 이름 (지역, 메뉴) :: 소개):
${list}

반환 형식 (JSON):
{
  "title": "검색 의도 키워드 앞에 오는 제목 (제주+지역+메뉴+추천 패턴)",
  "subtitle": "한 줄 부제 (지역+메뉴 특색 요약)",
  "intro": "4~5문장 도입 (지역 분위기, 메뉴 특색, 여행 동선 팁, 계절 추천)",
  "sections": [{ "restaurantId": "위 [id]", "heading": "맛집 이름", "body": "4~6문장 소개 (특징·메뉴·방문팁 포함)" }],
  "keywords": ["제주 ${topic.menu}", "${topic.region} ${topic.menu}", "제주 ${topic.region} 맛집", "..."]
}`;

  const ai = await generateJSON<WebzineAIResult>(SYS, prompt);

  // AI 섹션을 picks와 매칭 (id 검증 — 날조 id 방어), 이미지 주입
  const byId = new Map(topic.picks.map((r) => [r.id, r]));
  const sections: ContentSection[] = (ai.sections ?? [])
    .filter((s) => byId.has(s.restaurantId))
    .map((s) => {
      const r = byId.get(s.restaurantId)!;
      return {
        heading: s.heading || r.title,
        body: s.body || "",
        restaurantId: r.id,
        image: r.images?.[0] ? `/restaurant-images/${r.images[0]}` : undefined,
      };
    });

  const cover = topic.picks.find((r) => r.images?.[0]);
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    type: "webzine",
    status: "draft",
    slug: slugify(topic.region, topic.menu),
    title: ai.title || `제주 ${topic.region} ${topic.menu} 추천 맛집`,
    subtitle: ai.subtitle || `${topic.region}에서 즐기는 제주 ${topic.menu}`,
    intro: ai.intro || "",
    sections,
    keywords: [
      ...(ai.keywords ?? []),
      `제주 ${topic.menu}`,
      `${topic.region} 맛집`,
      `제주 ${topic.region} 맛집`,
      `${topic.region} ${topic.menu} 추천`,
      "제주 맛집",
      "제주 여행",
      "도민맛집",
      "제주 맛집 추천",
    ],
    coverImage: cover?.images?.[0] ? `/restaurant-images/${cover.images[0]}` : undefined,
    region: topic.region,
    menu: topic.menu,
    sourceIds: topic.picks.map((r) => r.id),
    createdAt: now,
  };
}
