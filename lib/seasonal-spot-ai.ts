import "server-only";
import { generateJSON, generateWithSearch } from "@/lib/biz/gemini";
import { getAdminDb } from "@/lib/firebase-admin";
import { loadAttractions, type Attraction } from "@/lib/attractions-store";
import { REGIONS, type ThemeKey } from "@/lib/spot-guide";
import type { Content, ContentSection } from "@/types/content";

/**
 * 시기별(월별) 가볼만한곳 — 웹검색으로 그 달의 제주 이슈(축제·꽃·물놀이·제철)를 끌어오고,
 * 우리 관광지 풀(attractions)에서 시즌 테마에 맞는 스팟을 골라 SEO/AEO/GEO 글로 발행.
 * "N월 제주 가볼만한곳" 롱테일 + 신선도(freshness). type=webzine.
 */

const USED = ["app_config", "seasonal_post"] as const;

// 월 → 시즌 테마(우리 관광지 테마키와 매칭) + 시즌 라벨
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

function kstMonth(): number {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", month: "numeric" }).format(new Date()));
}

type UsedState = { used: Record<string, number> };

/** 이번달/다음달 중 덜 쓴 달 선택 (다음달 선발행으로 신선도 선점) */
async function pickMonth(): Promise<number> {
  const snap = await getAdminDb().collection(USED[0]).doc(USED[1]).get();
  const used = (snap.exists ? (snap.data() as Partial<UsedState>).used : {}) ?? {};
  const cur = kstMonth();
  const next = (cur % 12) + 1;
  const key = (m: number) => `${new Date().getFullYear()}-${String(m).padStart(2, "0")}`;
  return (used[key(cur)] ?? 0) <= (used[key(next)] ?? 0) ? cur : next;
}
async function markMonth(m: number): Promise<void> {
  const key = `${new Date().getFullYear()}-${String(m).padStart(2, "0")}`;
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
- 제목은 검색 의도 키워드 앞에. 형태: "N월 제주 가볼만한곳 BEST N — [시즌 키워드]".
- intro 첫 문장 40~60자 자기완결 직답("N월 제주는 [시즌 요약], 가볼만한 곳은 …"). 이어 이 달 여행 포인트 4~5문장.
- 각 섹션 4~6문장: 장소 성격·볼거리·이 시즌에 왜 좋은지·방문 팁. 구체 사실 우선.
- FAQ 3개(q=검색 질문형 "N월 제주 가볼만한곳?"·"N월 제주 날씨/옷차림?", a=40~60자 직답).
- keywords 제주+월+시즌 롱테일 10~15개.
- 반드시 유효한 JSON만 반환.`;

export async function buildSeasonalPost(): Promise<Content | null> {
  const month = await pickMonth();
  const meta = MONTH_META[month];

  // 1) 웹검색으로 그 달 제주 시즌 이슈 요약 (그라운딩)
  let seasonCtx = "";
  try {
    const r = await generateWithSearch(
      `${new Date().getFullYear()}년 ${month}월 제주 여행에서 지금 가장 주목할 시즌 이슈를 5줄 이내로 요약해줘: 이 시기 제주의 날씨/기온, 제철 풍경(꽃·억새·단풍 등), 대표 축제나 행사, 여행 팁(옷차림·혼잡). 사실 위주로, 확정 못 하는 날짜·요금은 적지 마.`,
    );
    seasonCtx = r.text.slice(0, 1200);
  } catch { /* 검색 실패 시 시즌 라벨만 사용 */ }

  // 2) 우리 관광지 풀에서 시즌 테마 매칭 스팟 (이미지 보유, 권역 다양하게)
  const all = await loadAttractions();
  const matched = all.filter((a) => (a.image || a.imageUrl) && Array.isArray(a.themes) && a.themes.some((t) => meta.themes.includes(t)));
  if (matched.length < 5) return null;
  // 권역 분산: 권역별 1~2개씩 라운드로빈
  const byRegion = new Map<string, (Attraction & { id: string })[]>();
  for (const a of matched) { const arr = byRegion.get(a.region) ?? []; arr.push(a); byRegion.set(a.region, arr); }
  const picks: (Attraction & { id: string })[] = [];
  let round = 0;
  while (picks.length < 7 && round < 4) {
    for (const arr of byRegion.values()) { if (arr[round]) picks.push(arr[round]); if (picks.length >= 7) break; }
    round++;
  }
  if (picks.length < 5) return null;

  const list = picks.map((s) => `- [${s.id}] ${s.title} (제주 ${REGIONS[s.region]?.label ?? ""}) :: ${(s.intro || "").slice(0, 140)}`).join("\n");

  const ai = await generateJSON<SeasonalAI>(
    SYS,
    `${month}월 제주 가볼만한곳 글을 JSON으로 작성하라. (시즌: ${meta.season})

[${month}월 제주 시즌 정보 — 웹검색 요약]
${seasonCtx || "(요약 없음 — 시즌 라벨만 참고)"}

[관광지 데이터 (형식: [id] 이름 (권역) :: 소개)]
${list}

days 대신 sections에 각 관광지 1개씩. spotId는 위 [id] 그대로.`,
  );

  // spotId 매칭 우선, 실패 시 순서 매핑(긴 id를 AI가 변형해도 견고) + intro 폴백
  const byId = new Map(picks.map((s) => [s.id, s]));
  const aiSecs = ai.sections ?? [];
  const sections: ContentSection[] = picks.map((s, i) => {
    const c = aiSecs.find((x) => x.spotId === s.id) ?? aiSecs[i];
    return {
      heading: c?.heading || s.title,
      body: c?.body || s.intro || "",
      image: s.image || s.imageUrl,
      category: REGIONS[s.region]?.label,
    };
  }).filter((x) => x.body);
  void byId;
  if (sections.length < 5) return null;

  let faqs = (ai.faqs ?? []).filter((f) => f?.q && f?.a).slice(0, 5);
  if (faqs.length === 0) {
    faqs = [{ q: `${month}월 제주 가볼만한곳은?`, a: (ai.intro || "").slice(0, 60) || `${month}월 제주는 ${meta.season} 시즌, 위 ${sections.length}곳을 추천합니다.` }];
  }

  await markMonth(month);
  const cover = picks.find((s) => s.image || s.imageUrl);
  const now = new Date().toISOString();
  const title = ai.title || `${month}월 제주 가볼만한곳 BEST ${sections.length} — ${meta.season}`;
  return {
    id: crypto.randomUUID(),
    type: "webzine",
    status: "draft",
    slug: `se-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
    title,
    subtitle: ai.subtitle || `${month}월 제주, ${meta.season} 여행지`,
    intro: ai.intro || "",
    sections,
    keywords: [
      ...(ai.keywords ?? []),
      `${month}월 제주 가볼만한곳`, `${month}월 제주 여행`, `${month}월 제주 여행지`,
      `제주 ${meta.season}`, "제주 가볼만한곳", "제주 여행",
    ],
    faqs,
    coverImage: cover?.image || cover?.imageUrl,
    region: "제주",
    menu: `${month}월 시즌`,
    sourceIds: picks.map((s) => s.id),
    createdAt: now,
  };
}
