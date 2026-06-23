import "server-only";
import { generateJSON, generateWithSearch } from "@/lib/biz/gemini";
import { getAdminDb } from "@/lib/firebase-admin";
import { loadAttractions, type Attraction } from "@/lib/attractions-store";
import { REGIONS, type ThemeKey } from "@/lib/spot-guide";
import type { Content, ContentSection } from "@/types/content";

/**
 * 시기별(월별×앵글) 가볼만한곳 — 웹검색으로 그 달 제주 이슈를 끌어오고, 관광지 풀에서 앵글 테마에
 * 맞는 스팟을 골라 SEO/AEO/GEO 글로 발행. 월은 이번달/다음달로 자동 전진(연중 12달 순환) +
 * 한 달 안에서 앵글(물놀이·실내·아이와·드라이브·자연·노을·커플)로 쪼개 소재 무한.
 */

const USED = ["app_config", "seasonal_post"] as const;

// 월 → 시즌 라벨 + 기본(general 앵글) 테마
const MONTH_META: Record<number, { themes: ThemeKey[]; season: string }> = {
  1: { themes: ["indoor", "nature"], season: "겨울·눈" },
  2: { themes: ["nature", "couple"], season: "겨울 끝·매화" },
  3: { themes: ["nature", "drive"], season: "봄꽃·유채" },
  4: { themes: ["nature", "couple"], season: "봄·벚꽃" },
  5: { themes: ["nature", "ocean"], season: "신록·초여름" },
  6: { themes: ["ocean", "nature"], season: "초여름·수국" },
  7: { themes: ["ocean", "nature"], season: "한여름·물놀이" },
  8: { themes: ["ocean", "indoor"], season: "피서·해변" },
  9: { themes: ["nature", "drive"], season: "초가을·억새" },
  10: { themes: ["nature", "drive"], season: "가을·단풍·억새" },
  11: { themes: ["nature", "indoor"], season: "늦가을" },
  12: { themes: ["indoor", "couple"], season: "겨울·연말" },
};

// 한 달 안에서 쪼개는 앵글 (months 지정 시 그 달에만, 없으면 연중) — themes 비면 월 기본 사용
type Angle = { key: string; phrase: string; themes: ThemeKey[] | null; months?: number[] };
const ANGLES: Angle[] = [
  { key: "general", phrase: "가볼만한곳", themes: null },
  { key: "ocean", phrase: "물놀이·해변 명소", themes: ["ocean"], months: [5, 6, 7, 8, 9] },
  { key: "indoor", phrase: "실내·비 오는 날 가볼만한곳", themes: ["indoor", "rainy"] },
  { key: "kids", phrase: "아이와 가볼만한곳", themes: ["kids"] },
  { key: "drive", phrase: "드라이브 코스", themes: ["drive"] },
  { key: "nature", phrase: "자연·힐링 명소", themes: ["nature"] },
  { key: "couple", phrase: "커플 데이트 코스", themes: ["couple"] },
  { key: "sunset", phrase: "노을·일몰 명소", themes: ["sunset"] },
];

function kstMonth(): number {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", month: "numeric" }).format(new Date()));
}

type UsedState = { used: Record<string, number> };
type Topic = { month: number; angle: Angle; themes: ThemeKey[]; season: string };

/** 이번달/다음달 × 유효 앵글 조합 중 가장 오래전 쓴 것 (월 자동 전진 + 앵글 분산) */
async function pickTopic(): Promise<Topic> {
  const snap = await getAdminDb().collection(USED[0]).doc(USED[1]).get();
  const used = (snap.exists ? (snap.data() as Partial<UsedState>).used : {}) ?? {};
  const cur = kstMonth();
  const next = (cur % 12) + 1;
  const year = new Date().getFullYear();
  const cands: { month: number; angle: Angle; usedAt: number }[] = [];
  for (const month of [cur, next]) {
    for (const angle of ANGLES) {
      if (angle.months && !angle.months.includes(month)) continue;
      cands.push({ month, angle, usedAt: used[`${year}-${String(month).padStart(2, "0")}-${angle.key}`] ?? 0 });
    }
  }
  cands.sort((a, b) => a.usedAt - b.usedAt);
  const c = cands[0];
  const meta = MONTH_META[c.month];
  return { month: c.month, angle: c.angle, themes: c.angle.themes ?? meta.themes, season: meta.season };
}
async function markTopic(t: Topic): Promise<void> {
  const key = `${new Date().getFullYear()}-${String(t.month).padStart(2, "0")}-${t.angle.key}`;
  await getAdminDb().collection(USED[0]).doc(USED[1]).set({ used: { [key]: Date.now() } }, { merge: true });
}

type SeasonalAI = {
  title: string; subtitle: string; intro: string;
  sections: { spotId: string; heading: string; body: string }[];
  faqs: { q: string; a: string }[]; keywords: string[];
};

const SYS = `너는 제주 여행 매거진 에디터다. "그 달의 시즌 정보(웹검색)"와 "관광지 데이터"로 시기별 가볼만한곳 글을 쓴다.

규칙:
- 관광지의 명칭·위치·특징은 데이터에 근거. 없는 시설·요금·운영시간 날조 금지.
- 시즌 정보(축제·꽃·날씨·제철)는 주어진 웹검색 요약에 근거해 자연스럽게 녹여라(특정 날짜·요금은 "변동 가능"으로).
- 제목은 검색 의도 키워드 앞에. 형태: "N월 제주 [앵글] BEST N — [시즌 키워드]".
- intro 첫 문장 40~60자 자기완결 직답("N월 제주는 [시즌 요약], [앵글]은 …"). 이어 이 달 여행 포인트 4~5문장.
- 각 섹션 4~6문장: 장소 성격·볼거리·이 시즌/앵글에 왜 좋은지·방문 팁. 구체 사실 우선.
- FAQ 3개(q=검색 질문형 "N월 제주 [앵글]?"·"N월 제주 날씨/옷차림?", a=40~60자 직답).
- keywords 제주+월+앵글+시즌 롱테일 10~15개.
- 반드시 유효한 JSON만 반환.`;

export async function buildSeasonalPost(): Promise<Content | null> {
  const topic = await pickTopic();
  const { month, angle, themes, season } = topic;

  // 1) 웹검색으로 그 달 제주 시즌 이슈 요약 (그라운딩)
  let seasonCtx = "";
  try {
    const r = await generateWithSearch(
      `${new Date().getFullYear()}년 ${month}월 제주 여행에서 지금 가장 주목할 시즌 이슈를 5줄 이내로 요약해줘: 이 시기 제주의 날씨/기온, 제철 풍경(꽃·억새·단풍 등), 대표 축제나 행사, 여행 팁(옷차림·혼잡). 사실 위주로, 확정 못 하는 날짜·요금은 적지 마. ${angle.key !== "general" ? `특히 '${angle.phrase}' 관점에서.` : ""}`,
    );
    seasonCtx = r.text.slice(0, 1200);
  } catch { /* 검색 실패 시 시즌 라벨만 사용 */ }

  // 2) 관광지 풀에서 앵글 테마 매칭 스팟 (이미지 보유, 권역 분산)
  const all = await loadAttractions();
  const matched = all.filter((a) => (a.image || a.imageUrl) && Array.isArray(a.themes) && a.themes.some((t) => themes.includes(t)));
  if (matched.length < 5) return null;
  const byRegion = new Map<string, (Attraction & { id: string })[]>();
  for (const a of matched) { const arr = byRegion.get(a.region) ?? []; arr.push(a); byRegion.set(a.region, arr); }
  const picks: (Attraction & { id: string })[] = [];
  let round = 0;
  while (picks.length < 7 && round < 5) {
    for (const arr of byRegion.values()) { if (arr[round]) picks.push(arr[round]); if (picks.length >= 7) break; }
    round++;
  }
  if (picks.length < 5) return null;

  const list = picks.map((s) => `- [${s.id}] ${s.title} (제주 ${REGIONS[s.region]?.label ?? ""}) :: ${(s.intro || "").slice(0, 140)}`).join("\n");

  const ai = await generateJSON<SeasonalAI>(
    SYS,
    `${month}월 제주 "${angle.phrase}" 글을 JSON으로 작성하라. (시즌: ${season})

[${month}월 제주 시즌 정보 — 웹검색 요약]
${seasonCtx || "(요약 없음 — 시즌 라벨만 참고)"}

[관광지 데이터 (형식: [id] 이름 (권역) :: 소개)]
${list}

sections에 각 관광지 1개씩(순서대로). spotId는 위 [id] 그대로.`,
  );

  // spotId 매칭 우선, 실패 시 순서 매핑 + intro 폴백
  const aiSecs = ai.sections ?? [];
  const sections: ContentSection[] = picks.map((s, i) => {
    const c = aiSecs.find((x) => x.spotId === s.id) ?? aiSecs[i];
    return { heading: c?.heading || s.title, body: c?.body || s.intro || "", image: s.image || s.imageUrl, category: REGIONS[s.region]?.label };
  }).filter((x) => x.body);
  if (sections.length < 5) return null;

  let faqs = (ai.faqs ?? []).filter((f) => f?.q && f?.a).slice(0, 5);
  if (faqs.length === 0) faqs = [{ q: `${month}월 제주 ${angle.phrase}은?`, a: (ai.intro || "").slice(0, 60) || `${month}월 제주는 ${season} 시즌, 위 ${sections.length}곳을 추천합니다.` }];

  await markTopic(topic);
  const cover = picks.find((s) => s.image || s.imageUrl);
  const now = new Date().toISOString();
  const title = (ai.title || `${month}월 제주 ${angle.phrase} BEST ${sections.length} — ${season}`)
    .replace(/BEST\s*\d+/i, `BEST ${sections.length}`); // 제목의 개수를 실제 섹션 수로 정규화
  return {
    id: crypto.randomUUID(),
    type: "webzine",
    status: "draft",
    slug: `se-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
    title,
    subtitle: ai.subtitle || `${month}월 제주, ${season} ${angle.phrase}`,
    intro: ai.intro || "",
    sections,
    keywords: [
      ...(ai.keywords ?? []),
      `${month}월 제주 ${angle.phrase}`, `${month}월 제주 가볼만한곳`, `${month}월 제주 여행`, `${month}월 제주 여행지`,
      `제주 ${season}`, "제주 가볼만한곳", "제주 여행",
    ],
    faqs,
    coverImage: cover?.image || cover?.imageUrl,
    region: "제주",
    menu: `${month}월 ${angle.phrase}`,
    sourceIds: picks.map((s) => s.id),
    createdAt: now,
  };
}
