import "server-only";
import { generateJSON } from "@/lib/biz/gemini";
import { getAdminDb } from "@/lib/firebase-admin";
import { loadAttractions } from "@/lib/spot-ingest";
import { loadContentRestaurants, restaurantImageUrl, stripHtml } from "@/lib/restaurants";
import { REGIONS, type RegionKey } from "@/lib/spot-guide";
import type { Content, ContentSection } from "@/types/content";

/**
 * 제주 여행 매거진 엔진(#2) — "가볼만한곳" 외 고검색 테마(코스·카페·오름·해변·포토·힐링)로
 * 롱테일 SEO/AEO/GEO 글을 자동 생성. 사실은 데이터(관광지·맛집), 카피만 AI. type=webzine 저장.
 */

const USED = ["app_config", "jeju_magazine"] as const;

type MagFormat = "course" | "best";
type MagSource = "attractions" | "restaurants";
type MagTopicDef = {
  key: string;
  head: string;   // 검색 head 키워드 ("제주 오름")
  noun: string;   // 제목 명사구 ("오름", "카페", "여행 코스")
  format: MagFormat;
  source: MagSource;
  match?: RegExp; // attractions: 명칭+소개 / restaurants: menu
};

// 데이터로 근거 가능한 고검색 테마
export const MAG_TOPICS: MagTopicDef[] = [
  { key: "course",  head: "제주 여행 코스",  noun: "여행 코스",       format: "course", source: "attractions" },
  { key: "cafe",    head: "제주 카페",       noun: "카페",            format: "best",   source: "restaurants", match: /카페|베이커리|디저트|브런치|로스터/ },
  { key: "oreum",   head: "제주 오름",       noun: "오름",            format: "best",   source: "attractions", match: /오름/ },
  { key: "beach",   head: "제주 해변",       noun: "해변·해수욕장",   format: "best",   source: "attractions", match: /해변|해수욕|바다|포구|해안|등대/ },
  { key: "photo",   head: "제주 포토스팟",   noun: "포토스팟",        format: "best",   source: "attractions", match: /전망|노을|일몰|정원|벽화|미술관|숲|등대|폭포/ },
  { key: "healing", head: "제주 힐링 명소",  noun: "자연·힐링 명소",  format: "best",   source: "attractions", match: /숲|곶자왈|폭포|계곡|수목원|정원|습지|둘레길|올레|치유/ },
];

type Place = { id: string; title: string; address: string; intro: string; image?: string; lng?: number };

export type MagTopic = { def: MagTopicDef; regionLabel: string | null; places: Place[] };

type UsedState = { used: Record<string, number> };
async function getUsed(): Promise<UsedState> {
  const snap = await getAdminDb().collection(USED[0]).doc(USED[1]).get();
  return { used: (snap.exists ? (snap.data() as Partial<UsedState>).used : {}) ?? {} };
}
async function markUsed(key: string): Promise<void> {
  await getAdminDb().collection(USED[0]).doc(USED[1]).set({ used: { [key]: Date.now() } }, { merge: true });
}

function magLabels(t: MagTopicDef, regionLabel: string | null) {
  const reg = regionLabel ? `${regionLabel} ` : "";
  const title = `제주 ${reg}${t.noun}`;
  const keywords = [
    `제주 ${reg}${t.noun}`.replace(/\s+/g, " ").trim(),
    `${t.head}`,
    regionLabel ? `${regionLabel} ${t.noun}` : `제주 ${t.noun} 추천`,
    `제주 ${t.noun} 추천`,
    `제주 ${t.noun} 베스트`,
    regionLabel ? `제주 ${regionLabel} 여행` : "제주 여행 코스",
    "제주 가볼만한곳", "제주 여행", "제주 여행지 추천",
  ];
  return { title, keywords };
}

/** 후보(테마×지역) 중 가장 오래전에 쓴 것 선정. 데이터 4곳 이상만. */
export async function pickMagazineTopic(): Promise<MagTopic | null> {
  const [attractions, restaurants] = await Promise.all([loadAttractions(), loadContentRestaurants()]);
  const { used } = await getUsed();

  type Cand = { def: MagTopicDef; regionLabel: string | null; places: Place[]; usedAt: number };
  const cands: Cand[] = [];

  for (const def of MAG_TOPICS) {
    // 매칭된 장소 풀(이미지 보유 우선)
    let pool: Place[] = [];
    if (def.source === "attractions") {
      pool = attractions
        .filter((a) => (a.image || a.imageUrl) && (!def.match || def.match.test(`${a.title} ${a.intro}`)))
        .map((a) => ({ id: a.id, title: a.title, address: a.address, intro: a.intro, image: a.image || a.imageUrl, lng: a.lng ?? undefined }));
    } else {
      pool = restaurants
        .filter((r) => (!def.match || def.match.test(r.menu)) && (r.images?.[0]))
        .map((r) => ({ id: r.id, title: r.title, address: r.address ?? "", intro: stripHtml(r.content, 180), image: restaurantImageUrl(r.images?.[0]), lng: r.lng ?? undefined }));
    }
    if (pool.length < 4) continue;

    // 지역 버킷: attractions=권역 라벨, restaurants=원 지역명
    const buckets = new Map<string, Place[]>();
    if (def.source === "attractions") {
      for (const a of attractions) {
        if ((a.image || a.imageUrl) && (!def.match || def.match.test(`${a.title} ${a.intro}`))) {
          const label = REGIONS[a.region as RegionKey]?.label ?? null;
          if (!label) continue;
          const arr = buckets.get(label) ?? []; arr.push({ id: a.id, title: a.title, address: a.address, intro: a.intro, image: a.image || a.imageUrl, lng: a.lng ?? undefined }); buckets.set(label, arr);
        }
      }
    } else {
      for (const r of restaurants) {
        if ((!def.match || def.match.test(r.menu)) && r.images?.[0] && r.region) {
          const arr = buckets.get(r.region) ?? []; arr.push({ id: r.id, title: r.title, address: r.address ?? "", intro: stripHtml(r.content, 180), image: restaurantImageUrl(r.images?.[0]), lng: r.lng ?? undefined }); buckets.set(r.region, arr);
        }
      }
    }

    // 지역별 후보(4곳+) + 전체(제주) 후보
    for (const [label, arr] of buckets) if (arr.length >= 4) cands.push({ def, regionLabel: label, places: arr, usedAt: used[`${def.key}__${label}`] ?? 0 });
    cands.push({ def, regionLabel: null, places: pool, usedAt: used[`${def.key}__all`] ?? 0 });
  }

  if (cands.length === 0) return null;
  // 테마 단위로 먼저 분산(특정 테마만 연속 안 나오게) → 같은 테마 내에선 오래전 지역
  const topicLast: Record<string, number> = {};
  for (const x of cands) topicLast[x.def.key] = Math.max(topicLast[x.def.key] ?? 0, x.usedAt);
  cands.sort((a, b) => (topicLast[a.def.key] - topicLast[b.def.key]) || (a.usedAt - b.usedAt));
  const c = cands[0];

  // course면 동선 자연스럽게 서→동 정렬, 최대 6곳
  const places = [...c.places].sort((a, b) => (a.lng ?? 0) - (b.lng ?? 0)).slice(0, 6);
  return { def: c.def, regionLabel: c.regionLabel, places };
}

type MagAI = {
  title: string; subtitle: string; intro: string;
  sections: { placeId: string; heading: string; body: string }[];
  keywords: string[]; faqs?: { q: string; a: string }[];
};

const SYS = `너는 제주 여행 매거진 에디터다. 주어진 장소 목록(사실)으로 검색 최적화된 여행 큐레이션 글을 쓴다.

규칙:
- 각 장소의 사실(명칭/지역/특징)은 데이터에 근거. 없는 시설·요금·운영시간·메뉴·수상이력 날조 금지.
- 제목은 검색 의도 head 키워드를 앞에 배치. 형태: "제주 [지역] [테마] 추천 BEST N | 현지인 코스" 류.
- "코스" 글이면 동선(이동 순서·소요·묶음)을 자연스럽게 안내. "BEST" 글이면 각 장소를 비교·추천식으로.
- intro 4~5문장: 테마 개요, 누구에게/언제 좋은지, 동선·계절 팁. head 키워드 자연스럽게.
- 각 섹션 4~6문장: 장소 성격(위치·특징), 볼거리/즐길거리, 이 테마에 맞는 이유, 방문 팁. 과장 금지.
- 전체 글(intro + 섹션 body 합산) 1,500자 이상.

[AEO/GEO]
- intro·각 섹션 body 첫 문장은 40~60자 자기완결 직답(개체 명시: "[장소명]은 제주 …에 있는 …").
- heading은 장소명 또는 핵심 명사구. 형용사보다 사실 우선. 날조 금지.
- FAQ 3개를 faqs로(q=검색 질문형, a=40~60자 직답).
- 반드시 유효한 JSON만 반환.`;

export async function generateMagazineDraft(topic: MagTopic): Promise<Content> {
  const { def, regionLabel, places } = topic;
  const { title: seedTitle, keywords } = magLabels(def, regionLabel);
  const regTxt = regionLabel ? `제주 ${regionLabel}` : "제주";

  const list = places.map((p) => `- [${p.id}] ${p.title} (${p.address})${p.intro ? ` :: ${p.intro.slice(0, 160)}` : ""}`).join("\n");

  const prompt = `다음 ${regTxt} "${def.noun}" 장소들로 ${def.format === "course" ? "여행 코스(동선) 글" : "BEST 추천 글"}을 JSON으로 작성하라.
전체 글(intro + 섹션 body 합산)은 반드시 1,500자 이상.

장소 목록 (형식: [id] 이름 (주소) :: 소개):
${list}

반환 형식(JSON):
{
  "title": "검색 head 앞에 둔 제목 (예: ${seedTitle} ${def.format === "course" ? "추천 코스" : `BEST ${places.length}`} | 현지인 추천)",
  "subtitle": "한 줄 부제",
  "intro": "4~5문장 도입",
  "sections": [{ "placeId": "위 [id]", "heading": "장소명", "body": "4~6문장" }],
  "keywords": ${JSON.stringify(keywords.slice(0, 6))},
  "faqs": [{ "q": "검색 질문형", "a": "40~60자 직답" }]
}`;

  const ai = await generateJSON<MagAI>(SYS, prompt);
  const byId = new Map(places.map((p) => [p.id, p]));
  const sections: ContentSection[] = (ai.sections ?? [])
    .filter((s) => byId.has(s.placeId))
    .map((s) => {
      const p = byId.get(s.placeId)!;
      return { heading: s.heading || p.title, body: s.body || "", image: p.image || undefined };
    });

  const cover = places.find((p) => p.image);
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    type: "webzine",
    status: "draft",
    slug: `mg-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
    title: ai.title || `${seedTitle} BEST ${places.length}`,
    subtitle: ai.subtitle || `${regTxt} ${def.noun} 추천`,
    intro: ai.intro || "",
    sections,
    keywords: [...(ai.keywords ?? []), ...keywords],
    faqs: (ai.faqs ?? []).filter((f) => f?.q && f?.a).slice(0, 5),
    coverImage: cover?.image,
    region: regTxt,
    menu: def.noun,
    sourceIds: places.map((p) => p.id),
    createdAt: now,
  };
}

/** 토픽 선정 → 생성 → 사용기록. 발행여부는 호출측. */
export async function buildMagazine(): Promise<Content | null> {
  const topic = await pickMagazineTopic();
  if (!topic) return null;
  const draft = await generateMagazineDraft(topic);
  await markUsed(`${topic.def.key}__${topic.regionLabel ?? "all"}`);
  return draft;
}
