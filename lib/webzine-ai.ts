import "server-only";
import { generateJSON } from "@/lib/biz/gemini";
import { loadContentRestaurants, stripHtml, restaurantImageUrl } from "@/lib/restaurants";
import { listRecentFeedsRich, type FeedRich } from "@/lib/feed-server";
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
  const all = await loadContentRestaurants();
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
  faqs?: { q: string; a: string }[];
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

[AEO/GEO 작성 규칙 — AI 검색·답변엔진 인용 최적화]
- intro와 각 섹션 body의 "첫 문장"은 40~60자의 자기완결 직답으로 시작하라. (개체 명시: "제주 [지역]의 [메뉴]는 …" / "[상호]는 [지역]에 있는 …집으로 …")
- heading은 가능하면 검색 질문형 또는 핵심 명사구로. 모호한 수사보다 사실·고유명사(지역·메뉴·상호) 우선.
- "맛있는·예쁜" 같은 형용사 대신 구체 사실(대표 메뉴·위치·특징·방문 팁)을 적어라. 날조는 절대 금지.
- 가능하면 본문에 "자주 묻는 질문(FAQ)" 3개를 만들어 faqs 배열로 반환하라. 각 q는 실제 검색 질문형, a는 40~60자 직답.
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
  "keywords": ["제주 ${topic.menu}", "${topic.region} ${topic.menu}", "제주 ${topic.region} 맛집", "..."],
  "faqs": [{ "q": "검색 질문형 (예: 제주 ${topic.region} ${topic.menu} 맛집 추천은?)", "a": "40~60자 직답" }]
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
        image: restaurantImageUrl(r.images?.[0]),
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
    faqs: (ai.faqs ?? []).filter((f) => f?.q && f?.a).slice(0, 5),
    coverImage: restaurantImageUrl(cover?.images?.[0]),
    region: topic.region,
    menu: topic.menu,
    sourceIds: topic.picks.map((r) => r.id),
    createdAt: now,
  };
}

/* ──────────────────────────────────────────────
 * 피드 기반 웹진 — 여행자들이 올린 실시간 사진(EXIF·장소)으로 SEO 블로그 글
 * ────────────────────────────────────────────── */

const FEED_SYS = `너는 제주 여행 매거진 에디터다. 여행자들이 직접 올린 실시간 제주 사진들(장소·지역·카테고리·EXIF 촬영정보)을 바탕으로,
검색에 잘 걸리는 블로그형 여행 글을 쓴다.

규칙:
- 사진에 딸린 장소명/지역/카테고리는 사실이다. 없는 정보(가격·영업시간·평점)는 날조하지 마라.
- 글은 "실시간 제주 스냅"·"지금 제주" 컨셉. 사진 한 장 한 장을 자연스럽게 소개하며 이어간다.
- 제목: 검색 의도 키워드를 앞에. 예) "제주 [지역] 지금 이 모습 | 여행자들이 담은 실시간 스냅 N선", "요즘 제주 [지역/계절] 여행 사진 모음, 가볼 만한 곳 총정리".
- intro 4~5문장: 계절·날씨·요즘 제주 분위기, 이 사진들이 담긴 지역 흐름, 여행 동선 힌트. 제주/지역 키워드 자연스럽게.
- 각 사진 섹션 3~5문장: 그 장소(또는 지역)의 분위기, 사진에서 느껴지는 순간, 가볼 때 팁(시간대·동선 등). EXIF(카메라/촬영일)가 있으면 "직접 담은 생생한 컷"이라는 신뢰 요소로 가볍게 활용.
- 전체 본문(intro + 섹션 합산) 1,500자 이상.
- keywords: 제주+지역+계절+여행 롱테일 10~15개.
- sections 수는 입력 사진 수와 같게. 각 섹션은 입력의 imageIndex를 그대로 반환.

[AEO/GEO 작성 규칙]
- intro·각 섹션 body의 "첫 문장"은 40~60자 자기완결 직답으로 시작(지역·장소·계절 등 개체 명시).
- 모호한 수사보다 구체 사실(지역명·장소·촬영시점·동선)을 우선.
- 반드시 유효한 JSON만 반환.`;

type FeedWebzineAI = {
  title: string;
  subtitle: string;
  intro: string;
  sections: { imageIndex: number; heading: string; body: string }[];
  keywords: string[];
  region?: string;
};

/** 최근 피드가 3개 이상이면 그 사진들로 웹진 초안 생성. 부족하면 null. */
export async function generateFeedWebzineDraft(): Promise<Content | null> {
  const feeds: FeedRich[] = await listRecentFeedsRich(8);
  if (feeds.length < 3) return null; // 3개 미만이면 생성 안 함

  const list = feeds
    .map((f, i) => {
      const parts = [
        `[${i}]`,
        f.placeName ? `장소:${f.placeName}` : "",
        f.regionName ? `지역:${f.regionName}${f.regionCity ? `(${f.regionCity})` : ""}` : "",
        f.category ? `분류:${f.category}` : "",
        f.aiCopy ? `한줄:${f.aiCopy}` : "",
        f.exif?.camera ? `카메라:${f.exif.camera}` : "",
        f.exif?.date ? `촬영일:${f.exif.date}` : "",
      ].filter(Boolean);
      return parts.join(" / ");
    })
    .join("\n");

  const prompt = `다음은 여행자들이 올린 제주 실시간 사진 ${feeds.length}장의 정보다. 이걸로 SEO 블로그형 웹진 글을 JSON으로 써라.
전체 본문(intro + 각 섹션 body 합산)은 반드시 1,500자 이상.

사진 목록:
${list}

반환 형식 (JSON):
{
  "title": "검색 키워드 앞에 오는 제목",
  "subtitle": "한 줄 부제",
  "intro": "4~5문장 도입",
  "sections": [{ "imageIndex": 0, "heading": "소제목", "body": "3~5문장" }],
  "keywords": ["제주 여행", "..."],
  "region": "대표 지역명(가장 많이 등장한 지역, 없으면 제주)"
}
sections는 위 [0]..[${feeds.length - 1}] 사진 순서대로, imageIndex를 그대로 채워라.`;

  const ai = await generateJSON<FeedWebzineAI>(FEED_SYS, prompt);

  const sections: ContentSection[] = (ai.sections ?? [])
    .filter((s) => typeof s.imageIndex === "number" && feeds[s.imageIndex])
    .map((s) => ({
      heading: s.heading || "제주의 한 순간",
      body: s.body || "",
      image: feeds[s.imageIndex].imageUrl, // 피드 사진 (Storage 절대 URL)
    }));

  // AI가 섹션을 빠뜨렸으면 남은 사진으로 폴백
  const usedIdx = new Set((ai.sections ?? []).map((s) => s.imageIndex));
  feeds.forEach((f, i) => {
    if (!usedIdx.has(i)) sections.push({ heading: f.placeName || f.regionName || "제주", body: f.aiCopy || "", image: f.imageUrl });
  });

  const region = ai.region || feeds.find((f) => f.regionName)?.regionName || "제주";
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    type: "webzine",
    status: "draft",
    slug: `wz-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
    title: ai.title || `요즘 제주 ${region} 실시간 여행 스냅`,
    subtitle: ai.subtitle || "여행자들이 지금 담은 제주",
    intro: ai.intro || "",
    sections,
    keywords: [...(ai.keywords ?? []), "제주 여행", "제주 여행 사진", `제주 ${region}`, "요즘 제주", "제주 스냅", "제주 가볼만한곳"],
    coverImage: feeds[0].imageUrl,
    region,
    sourceIds: [],
    createdAt: now,
  };
}
