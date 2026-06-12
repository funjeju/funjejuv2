import "server-only";
import { generateJSON } from "@/lib/biz/gemini";
import { loadAllRestaurants, stripHtml } from "@/lib/restaurants";
import type { Restaurant } from "@/types/restaurant";
import type { Content, ContentSection } from "@/types/content";

/**
 * 웹진 자동 생성 — 도민맛집 589개를 지역×메뉴로 묶어 여행 큐레이션 글 생성.
 * ⚠️ 맛집 사실은 데이터 기반, 묶음 카피만 AI. 날조 금지.
 *
 * 헤비키워드(제주맛집/제주여행) × 지역(애월·성산) × 롱테일을 글 전체에 녹여
 * funjeju 도메인의 SEO 콘텐츠 출구를 지속적으로 채운다.
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

function slugify(region: string, menu: string): string {
  const base = `${region}-${menu}`
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}

const SYS = `너는 제주 여행 매거진 에디터다. 주어진 도민맛집 목록으로 검색 최적화된 여행 큐레이션 글을 쓴다.

규칙:
- 각 맛집의 사실(이름/지역/메뉴)은 데이터에 근거. 없는 메뉴·가격·수상이력 날조 금지.
- 제목은 제주+지역+메뉴 키워드를 담은 매력적인 한 줄 (예: "애월 감성 카페 5곳, 제주 서쪽 바다 뷰 맛집").
- intro는 제주 여행 맥락의 도입 2~3문장 (지역 분위기, 이 메뉴를 즐기기 좋은 이유).
- 각 맛집 섹션은 2~3문장 소개. 담백하고 정보성 있게, 과장 금지.
- keywords는 제주/지역/메뉴 조합 + 롱테일 8~12개.
- 반드시 유효한 JSON만 반환.`;

export async function generateWebzineDraft(topic: WebzineTopic): Promise<Content> {
  const list = topic.picks
    .map((r) => `- [${r.id}] ${r.title} (${r.region}, ${r.menu})${r.address ? ` / ${r.address}` : ""} :: ${stripHtml(r.content, 120)}`)
    .join("\n");

  const prompt = `다음 제주 ${topic.region}의 ${topic.menu} 맛집들로 여행 큐레이션 웹진 글을 JSON으로 작성하라.

맛집 목록 (형식: [id] 이름 (지역, 메뉴) :: 소개):
${list}

반환 형식 (JSON):
{
  "title": "제주+지역+메뉴 키워드 담은 제목",
  "subtitle": "한 줄 부제",
  "intro": "도입 2~3문장",
  "sections": [{ "restaurantId": "위 [id]", "heading": "맛집 이름", "body": "2~3문장 소개" }],
  "keywords": ["제주 ${topic.menu}", "${topic.region} ${topic.menu}", "..."]
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
    title: ai.title || `제주 ${topic.region} ${topic.menu} 맛집`,
    subtitle: ai.subtitle || `${topic.region}에서 즐기는 제주 ${topic.menu}`,
    intro: ai.intro || "",
    sections,
    keywords: [
      ...(ai.keywords ?? []),
      `제주 ${topic.menu}`,
      `${topic.region} 맛집`,
      "제주 맛집",
      "제주 여행",
      "도민맛집",
    ],
    coverImage: cover?.images?.[0] ? `/restaurant-images/${cover.images[0]}` : undefined,
    region: topic.region,
    menu: topic.menu,
    sourceIds: topic.picks.map((r) => r.id),
    createdAt: now,
  };
}
