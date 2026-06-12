import "server-only";
import { fetchWeather } from "@/lib/weather";
import { generateJSON } from "@/lib/biz/gemini";
import { loadAllRestaurants, stripHtml } from "@/lib/restaurants";
import type { Content, ContentSection } from "@/types/content";

/**
 * AI데일리제주 — 매일 아침 제주 날씨 + 추천 맛집으로 '오늘의 제주' 브리핑 자동 생성.
 * contents 컬렉션 type="briefing". /daily 게시판에 ISR 노출.
 *
 * SEO 기준:
 * - 제목: 날짜·날씨·제주 여행 키워드 포함 (검색 의도 명확)
 * - intro: 4~5문장 (날씨 요약 + 여행 팁 + 오늘의 제주 분위기)
 * - 각 섹션: 3~4문장 (날씨 맥락 + 맛집 소개 + 방문 팁)
 * - 전체 800자 이상
 */

const JEJU_CENTER = { lat: 33.38, lng: 126.55 };

const SYS = `너는 제주 여행 데일리 에디터 '돌맹이'야. 오늘 제주 날씨와 추천 맛집으로 친근하고 검색 최적화된 아침 브리핑을 써.

규칙:
- 제목은 날씨·날짜·제주 여행 키워드를 담아라. 예: "오늘 제주 날씨 맑음, 나들이 딱 좋은 날! 추천 맛집 4곳" 또는 "제주 오늘 날씨 흐림·비, 실내 맛집으로 따뜻하게". 검색에 잘 걸리도록 "제주 날씨 오늘", "오늘 제주 여행" 키워드를 자연스럽게 제목에 녹여라.
- intro는 4~5문장: 오늘 제주 날씨 구체적 묘사(기온/풍속/체감) → 이 날씨에 어울리는 제주 여행 스타일 제안 → 오늘의 추천 포인트. "제주 날씨", "오늘 제주", "제주 여행" 키워드를 자연스럽게 포함.
- 각 맛집 섹션은 3~4문장: 오늘 날씨와 연결 지어 "맑은 날 테라스에서", "비 오는 날 따뜻하게" 같은 맥락 언급 후 맛집 소개. 맛집 데이터(이름/지역/메뉴)에만 근거.
- 전체 글(intro + 섹션 합산) 800자 이상.
- 추천 맛집은 데이터(이름/지역/메뉴)에만 근거. 없는 사실 날조 금지.
- keywords는 "제주 날씨 오늘", "오늘 제주 날씨", "오늘 제주 여행", 날씨 상태(맑음/흐림/비/바람 등), 추천 맛집 지역·메뉴 조합 포함 10~15개.
- 반드시 유효한 JSON만 반환.`;

type BriefingAI = {
  title: string;
  subtitle: string;
  intro: string;
  sections: { restaurantId: string; heading: string; body: string }[];
  keywords: string[];
};

/** KST(UTC+9) 기준 '지금'. Vercel은 UTC라 그대로 쓰면 06시 발행이 어제 날짜로 찍힌다. */
function kstNow(): Date {
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

function slugify(): string {
  const d = kstNow();
  // KST 시각의 Y/M/D를 뽑으려면 UTC 게터로 읽어야 한다 (+9 offset 이미 반영됨)
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  return `daily-${ymd}-${Math.random().toString(36).slice(2, 5)}`;
}

export async function generateBriefingDraft(): Promise<Content> {
  const w = await fetchWeather(JEJU_CENTER.lat, JEJU_CENTER.lng).catch(() => null);

  const all = await loadAllRestaurants();
  const withImg = all.filter((r) => r.images?.[0] && r.lat && r.lng);
  const picks = withImg.sort(() => Math.random() - 0.5).slice(0, 4);

  const today = kstNow();
  const dateStr = `${today.getUTCFullYear()}년 ${today.getUTCMonth() + 1}월 ${today.getUTCDate()}일`;

  const weatherLine = w
    ? `오늘(${dateStr}) 제주 날씨: ${w.description}, 기온 ${Math.round(w.temperature)}°C(체감 ${Math.round(w.apparentTemp)}°C), 풍속 ${w.windSpeed}m/s(${w.windLabel}), 물때 ${w.tide}.`
    : `오늘(${dateStr}) 제주 날씨 정보를 불러오지 못했어. 제주 여행 일반 추천으로 작성해.`;

  const list = picks
    .map((r) => `- [${r.id}] ${r.title} (${r.region}, ${r.menu}) :: ${stripHtml(r.content, 150)}`)
    .join("\n");

  const prompt = `${weatherLine}

추천 맛집:
${list}

위 날씨와 맛집으로 '오늘의 제주' 데일리 브리핑을 JSON으로 작성하라.
전체 글(intro + 섹션 합산)은 800자 이상이어야 한다.

반환 형식 (JSON):
{
  "title": "날씨+날짜+제주 여행 키워드 담은 제목 (검색 의도 명확하게)",
  "subtitle": "오늘 제주 날씨·추천을 한 줄로 요약",
  "intro": "4~5문장: 오늘 제주 날씨 묘사 + 이 날씨에 맞는 여행 스타일 제안 + 추천 포인트",
  "sections": [{ "restaurantId": "위 [id]", "heading": "맛집 이름", "body": "3~4문장: 날씨 맥락 + 맛집 소개 + 방문 팁" }],
  "keywords": ["제주 날씨 오늘", "오늘 제주 날씨", "오늘 제주 여행", "제주 맛집 추천", "..."]
}`;

  const ai = await generateJSON<BriefingAI>(SYS, prompt);

  const byId = new Map(picks.map((r) => [r.id, r]));
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

  const cover = picks.find((r) => r.images?.[0]);
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    type: "briefing",
    status: "draft",
    slug: slugify(),
    title: ai.title || `오늘 제주 날씨와 추천 맛집 — ${dateStr}`,
    subtitle: ai.subtitle || "오늘 제주 날씨와 추천 스팟",
    intro: ai.intro || "",
    sections,
    keywords: [
      ...(ai.keywords ?? []),
      "제주 날씨 오늘",
      "오늘 제주 날씨",
      "오늘 제주 여행",
      "제주 여행",
      "제주 맛집",
      "제주 맛집 추천",
      "AI데일리제주",
      "제주 오늘",
    ],
    coverImage: cover?.images?.[0] ? `/restaurant-images/${cover.images[0]}` : undefined,
    sourceIds: picks.map((r) => r.id),
    createdAt: now,
  };
}
