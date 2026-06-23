import "server-only";
import { generateJSON } from "@/lib/biz/gemini";
import { getAdminDb } from "@/lib/firebase-admin";
import { loadAttractions, type Attraction } from "@/lib/spot-ingest";
import { REGIONS, THEMES, topicLabels, type RegionKey, type ThemeKey } from "@/lib/spot-guide";
import type { Content, ContentSection } from "@/types/content";

/**
 * 가볼만한곳 웹진 자동 생성 — 비짓제주 관광지(권역×테마)로 롱테일 SEO/AEO/GEO 글.
 * ⚠️ 사실(명칭·지역·소개)은 데이터 기반, 묶음 카피만 AI. 날조 금지.
 * type="webzine" 으로 저장 → /webzine/[slug] 렌더·사이트맵 자동 포함.
 */

const USED = ["app_config", "spot_guide"] as const;

export type SpotTopic = { region: RegionKey; theme: ThemeKey; picks: (Attraction & { id: string })[] };

type UsedState = { used: Record<string, number> }; // "region__theme" → 마지막 사용 ms

async function getUsed(): Promise<UsedState> {
  const snap = await getAdminDb().collection(USED[0]).doc(USED[1]).get();
  const d = snap.exists ? (snap.data() as Partial<UsedState>) : {};
  return { used: d.used ?? {} };
}
async function markUsed(key: string): Promise<void> {
  await getAdminDb().collection(USED[0]).doc(USED[1]).set(
    { used: { [key]: Date.now() } }, { merge: true },
  );
}

/** 관광지 4곳 이상인 권역×테마 조합 중, 가장 오래전에 쓴(또는 안 쓴) 것 선정 */
export async function pickSpotTopic(): Promise<SpotTopic | null> {
  const all = await loadAttractions();
  if (all.length === 0) return null;

  const groups = new Map<string, (Attraction & { id: string })[]>();
  for (const a of all) {
    if (!a.region || !Array.isArray(a.themes)) continue;
    for (const theme of a.themes) {
      const key = `${a.region}__${theme}`;
      const arr = groups.get(key) ?? [];
      arr.push(a);
      groups.set(key, arr);
    }
  }

  const candidates = [...groups.entries()].filter(([, arr]) => arr.filter((x) => x.image || x.imageUrl).length >= 4);
  if (candidates.length === 0) return null;

  const { used } = await getUsed();
  candidates.sort((a, b) => (used[a[0]] ?? 0) - (used[b[0]] ?? 0)); // 오래전에 쓴 순
  const [key, arr] = candidates[0];
  const [region, theme] = key.split("__") as [RegionKey, ThemeKey];

  // 이미지 있는 것 우선, 최대 6곳
  const picks = arr
    .filter((x) => x.image || x.imageUrl)
    .sort((a, b) => (b.image ? 1 : 0) - (a.image ? 1 : 0))
    .slice(0, 6);

  return { region, theme, picks };
}

type SpotAIResult = {
  title: string;
  subtitle: string;
  intro: string;
  sections: { spotId: string; heading: string; body: string }[];
  keywords: string[];
  faqs?: { q: string; a: string }[];
};

const SYS = `너는 제주 여행 매거진 에디터다. 주어진 제주 관광지(가볼만한곳) 목록으로 검색 최적화된 여행 큐레이션 글을 쓴다.

규칙:
- 각 장소의 사실(명칭/지역/특징)은 데이터에 근거. 없는 시설·요금·운영시간·수상이력 날조 금지.
- 제목은 검색 의도 키워드를 앞에 배치. 형태: "제주 [권역] [테마] 가볼만한곳 BEST N | 현지인 추천 코스" 류.
- subtitle은 권역+테마 특색 한 줄.
- intro 4~5문장: 권역 분위기, 이 테마(예: 비 오는 날·아이와)에 왜 좋은지, 동선·계절 팁. 제주/권역/테마 키워드 자연스럽게.
- 각 장소 섹션 4~6문장: 어떤 곳인지(위치·성격), 볼거리/즐길거리, 이 테마에 맞는 이유, 방문 팁(주차·시간·동선 등). 과장 금지, 정보성.
- 전체 글(intro + 모든 섹션 body 합산)이 1,500자 이상이 되도록 충분히.
- keywords는 제주+권역+테마 롱테일 10~15개.

[AEO/GEO 작성 규칙 — AI 검색·답변엔진 인용 최적화]
- intro와 각 섹션 body의 "첫 문장"은 40~60자의 자기완결 직답으로 시작(개체 명시: "[장소명]은 제주 [권역]에 있는 …").
- heading은 장소명 또는 핵심 명사구. 모호한 수사보다 고유명사·사실 우선.
- "예쁜·멋진" 같은 형용사 대신 구체 사실(위치·특징·방문 팁)을 적어라. 날조 절대 금지.
- 본문에 "자주 묻는 질문(FAQ)" 3개를 faqs 배열로. q는 실제 검색 질문형, a는 40~60자 직답.
- 반드시 유효한 JSON만 반환.`;

export async function generateSpotGuideDraft(topic: SpotTopic): Promise<Content> {
  const r = REGIONS[topic.region], t = THEMES[topic.theme];
  const { title: topicTitle, keywords: topicKw } = topicLabels(topic.region, topic.theme);

  const list = topic.picks
    .map((s) => `- [${s.id}] ${s.title} (제주 ${r.label}, ${s.address})${s.intro ? ` :: ${s.intro.slice(0, 180)}` : ""}`)
    .join("\n");

  const prompt = `다음 제주 ${r.label} 지역의 "${t.phrase}" 관광지들로 여행 큐레이션 웹진 글을 JSON으로 작성하라.
전체 글(intro + 각 섹션 body 합산)은 반드시 1,500자 이상이어야 한다.

관광지 목록 (형식: [id] 이름 (권역, 주소) :: 소개):
${list}

반환 형식 (JSON):
{
  "title": "검색 의도 키워드 앞에 오는 제목 (예: ${topicTitle} BEST ${topic.picks.length} | 현지인 추천)",
  "subtitle": "한 줄 부제",
  "intro": "4~5문장 도입",
  "sections": [{ "spotId": "위 [id]", "heading": "장소명", "body": "4~6문장 소개" }],
  "keywords": ${JSON.stringify(topicKw.slice(0, 6))},
  "faqs": [{ "q": "검색 질문형", "a": "40~60자 직답" }]
}`;

  const ai = await generateJSON<SpotAIResult>(SYS, prompt);

  const byId = new Map(topic.picks.map((s) => [s.id, s]));
  const sections: ContentSection[] = (ai.sections ?? [])
    .filter((s) => byId.has(s.spotId))
    .map((s) => {
      const a = byId.get(s.spotId)!;
      return {
        heading: s.heading || a.title,
        body: s.body || "",
        image: a.image || a.imageUrl || undefined,
      };
    });

  const cover = topic.picks.find((s) => s.image || s.imageUrl);
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    type: "webzine",
    status: "draft",
    slug: `sg-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
    title: ai.title || `${topicTitle} BEST ${topic.picks.length}`,
    subtitle: ai.subtitle || `${r.search} ${t.phrase}`,
    intro: ai.intro || "",
    sections,
    keywords: [...(ai.keywords ?? []), ...topicKw],
    faqs: (ai.faqs ?? []).filter((f) => f?.q && f?.a).slice(0, 5),
    coverImage: cover?.image || cover?.imageUrl || undefined,
    region: `제주 ${r.label}`,
    menu: t.label,
    sourceIds: topic.picks.map((s) => s.id),
    createdAt: now,
  };
}

/** 토픽 선정 → 생성 → (사용기록). 발행여부는 호출측에서 결정. */
export async function buildSpotGuide(): Promise<Content | null> {
  const topic = await pickSpotTopic();
  if (!topic) return null;
  const draft = await generateSpotGuideDraft(topic);
  await markUsed(`${topic.region}__${topic.theme}`);
  return draft;
}
