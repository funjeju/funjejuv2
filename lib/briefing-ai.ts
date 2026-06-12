import "server-only";
import { fetchWeather } from "@/lib/weather";
import { generateJSON } from "@/lib/biz/gemini";
import { loadAllRestaurants, stripHtml } from "@/lib/restaurants";
import type { Content, ContentSection } from "@/types/content";

/**
 * AI데일리제주 — 매일 아침 제주 날씨 + 추천 맛집으로 '오늘의 제주' 브리핑 자동 생성.
 * contents 컬렉션 type="briefing". /daily 게시판에 ISR 노출.
 */

const JEJU_CENTER = { lat: 33.38, lng: 126.55 };

const SYS = `너는 제주 여행 데일리 에디터 '돌맹이'야. 오늘 제주 날씨와 추천 맛집으로 친근한 아침 브리핑을 써.

규칙:
- 날씨를 반말로 요약하고, 그 날씨에 어울리는 여행 팁을 제안 (맑으면 해변·오름, 비/강풍이면 실내·카페 등)
- 추천 맛집은 데이터(이름/지역/메뉴)에만 근거. 없는 사실 날조 금지.
- "제주 날씨", "오늘 제주", "제주 여행" 키워드를 자연스럽게 녹여
- 반드시 유효한 JSON만 반환`;

type BriefingAI = {
  title: string;
  subtitle: string;
  intro: string;
  sections: { restaurantId: string; heading: string; body: string }[];
  keywords: string[];
};

function slugify(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `daily-${ymd}-${Math.random().toString(36).slice(2, 5)}`;
}

export async function generateBriefingDraft(): Promise<Content> {
  const w = await fetchWeather(JEJU_CENTER.lat, JEJU_CENTER.lng).catch(() => null);

  const all = await loadAllRestaurants();
  const withImg = all.filter((r) => r.images?.[0] && r.lat && r.lng);
  const picks = withImg.sort(() => Math.random() - 0.5).slice(0, 4);

  const weatherLine = w
    ? `오늘 제주 날씨: ${w.description} ${Math.round(w.temperature)}°C(체감 ${Math.round(w.apparentTemp)}°C), 풍속 ${w.windSpeed}m/s(${w.windLabel}), 물때 ${w.tide}.`
    : "오늘 제주 날씨 정보를 불러오지 못했어. 일반적인 추천으로 작성해.";
  const list = picks
    .map((r) => `- [${r.id}] ${r.title} (${r.region}, ${r.menu}) :: ${stripHtml(r.content, 100)}`)
    .join("\n");

  const prompt = `${weatherLine}

추천 맛집:
${list}

위 날씨와 맛집으로 '오늘의 제주' 데일리 브리핑을 JSON으로 작성하라.

반환 형식 (JSON):
{
  "title": "오늘 날씨와 추천을 담은 제목",
  "subtitle": "한 줄 부제",
  "intro": "날씨 요약 + 그 날씨에 맞는 여행 팁 2~3문장 (반말)",
  "sections": [{ "restaurantId": "위 [id]", "heading": "맛집 이름", "body": "2문장 소개" }],
  "keywords": ["제주 날씨", "오늘 제주", "제주 여행", "..."]
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
    title: ai.title || "오늘의 제주",
    subtitle: ai.subtitle || "오늘 제주 날씨와 추천 스팟",
    intro: ai.intro || "",
    sections,
    keywords: [...(ai.keywords ?? []), "제주 날씨", "오늘 제주", "제주 여행", "제주 맛집", "AI데일리제주"],
    coverImage: cover?.images?.[0] ? `/restaurant-images/${cover.images[0]}` : undefined,
    sourceIds: picks.map((r) => r.id),
    createdAt: now,
  };
}
