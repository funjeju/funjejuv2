import "server-only";
import { generateJSON } from "@/lib/biz/gemini";
import { getAdminDb } from "@/lib/firebase-admin";
import { generateTripPlanCore } from "@/lib/trip-plan-core";
import { loadAttractions } from "@/lib/attractions-store";
import { loadContentRestaurants, restaurantImageUrl } from "@/lib/restaurants";
import type { Content, ContentSection } from "@/types/content";
import type { TripPlan, TripPlanRequest } from "@/types/trip";

/**
 * 여행일정 시뮬 포스팅 — 페르소나로 일정 생성기를 돌려 나온 동선을 SEO/AEO/GEO 글로 발행.
 * "제주 여행일정/N박N일 코스" 롱테일. type=webzine 저장 + TouristTrip JSON-LD(extraLd).
 */

const USED = ["app_config", "itinerary_post"] as const;

type Persona = { key: string; label: string; companions: string[]; nights: number; days: number; style: string };

const PERSONAS: Persona[] = [
  { key: "fam40_23", label: "40대 가족 4인", companions: ["40대 부부", "초중생 자녀"], nights: 2, days: 3, style: "가족 친화 · 여유로운 템포 · 아이도 즐길 거리" },
  { key: "fam_34", label: "가족 (아이와 길게)", companions: ["부부", "초등 자녀"], nights: 3, days: 4, style: "체험·동물·테마파크 위주, 하루 동선 짧게" },
  { key: "couple_23", label: "20·30대 커플", companions: ["연인"], nights: 2, days: 3, style: "감성 카페·노을·드라이브 중심 데이트" },
  { key: "couple_12", label: "커플 짧은 휴식", companions: ["연인"], nights: 1, days: 2, style: "한 권역 집중, 카페·노을·맛집 알차게" },
  { key: "honeymoon", label: "신혼여행", companions: ["신혼 부부"], nights: 3, days: 4, style: "프리미엄 뷰·근사한 식사·노을·여유로운 동선" },
  { key: "parents", label: "부모님 모시고 (효도)", companions: ["부모님"], nights: 2, days: 3, style: "걷기 적은 편안한 명소·전망 좋은 카페·맛집 위주" },
  { key: "threegen", label: "3대 가족여행", companions: ["조부모", "부모", "아이"], nights: 2, days: 3, style: "남녀노소 함께·이동 짧게·휠체어/유모차 편한 곳 우선" },
  { key: "friends_23", label: "친구끼리", companions: ["친구"], nights: 2, days: 3, style: "액티비티·핫플·맛집 알차게" },
  { key: "friends_girls", label: "여자끼리 우정여행", companions: ["친구 여럿"], nights: 2, days: 3, style: "사진맛집·감성카페·소품샵·맛집 중심" },
  { key: "kids_baby", label: "아기와 (유아 동반)", companions: ["배우자", "영유아"], nights: 3, days: 4, style: "수유·기저귀 편의·실내·동물 위주, 이동 최소" },
  { key: "pet", label: "반려견 동반", companions: ["반려견"], nights: 2, days: 3, style: "반려동물 동반 가능한 해변·카페·오름 위주 동선" },
  { key: "solo", label: "혼자 여행", companions: ["혼자"], nights: 1, days: 2, style: "오름·바다·카페로 사색하는 동선" },
  { key: "tukbeoki", label: "뚜벅이 (대중교통)", companions: ["혼자"], nights: 2, days: 3, style: "버스·도보 가능 권역 집중, 이동 부담 적게" },
  { key: "workation", label: "워케이션 (한 달 살기 맛보기)", companions: ["혼자"], nights: 3, days: 4, style: "한 권역 거점·카페·오름·로컬 맛집으로 천천히" },
  { key: "daytrip", label: "당일치기", companions: ["친구"], nights: 0, days: 1, style: "공항 근처 한 권역만 알차게 도는 루프 동선" },
];

type UsedState = { used: Record<string, number> };
async function pickPersona(): Promise<Persona> {
  const snap = await getAdminDb().collection(USED[0]).doc(USED[1]).get();
  const used = (snap.exists ? (snap.data() as Partial<UsedState>).used : {}) ?? {};
  const sorted = [...PERSONAS].sort((a, b) => (used[a.key] ?? 0) - (used[b.key] ?? 0));
  return sorted[0];
}
async function markPersona(key: string): Promise<void> {
  await getAdminDb().collection(USED[0]).doc(USED[1]).set({ used: { [key]: Date.now() } }, { merge: true });
}

function reqFor(p: Persona): TripPlanRequest {
  return {
    mode: "detailed",
    nights: p.nights,
    days: p.days,
    arrivalTime: "10:00",
    departureTime: p.days >= 3 ? "17:00" : "18:00",
    companions: p.companions,
    transportation: "렌터카",
    accommodationStatus: "not_booked",
    accommodationRecommendationStyle: "daily_move",
    tripStyle: p.style,
    pace: p.nights >= 3 ? "여유롭게" : "보통",
  };
}

type ItinAI = {
  title: string;
  subtitle: string;
  intro: string;
  dayLeads?: { day: number; lead: string }[]; // 각 일차 도입 1~2문장(선택)
  faqs: { q: string; a: string }[];
  keywords: string[];
};

const SYS = `너는 제주 여행 매거진 에디터다. 주어진 "확정된 일정 데이터"로 검색·AI답변에 강한 여행일정 글의 머리말을 쓴다.

규칙:
- 일정 데이터의 장소·시간·동선은 사실이다. 없는 장소·정보 추가/날조 금지.
- 제목은 검색 의도 키워드를 앞에. 형태: "제주 N박N일 [동반자] 여행 코스 — [핵심 요약]".
- intro 첫 문장은 40~60자 자기완결 직답("제주 N박N일 [동반자] 여행은 [요약]"). 이어 누구에게 맞는 코스인지·동선 개요·계절 팁 5~6문장(충분히 길게).
- dayLeads: 각 일차마다 그날 동선을 요약한 1~2문장(왜 이 순서가 좋은지·이동 포인트). day는 일정 데이터의 일차 번호.
- FAQ 3개(q=실제 검색 질문형 예: "제주 N박N일 [동반자] 코스 추천?"·"제주 N박N일 렌터카 동선?", a=40~60자 직답).
- keywords는 제주+기간+동반자 롱테일 10~15개.
- 반드시 유효한 JSON만 반환.`;

const TYPE_LABEL: Record<string, string> = { 맛집: "🍽", 카페: "☕", 관광지: "📍", 자연: "🌿", 액티비티: "🤸", 쇼핑: "🛍", 문화: "🎭", 숙소: "🏨" };

/** 일정 데이터로 그날 본문을 결정적으로 구성 (장소·시간·코멘트 — 그라운드된 사실) */
function dayBody(items: TripPlan["days"][number]["items"], lead?: string): string {
  // 코스별로 한 줄씩(시간·장소·코멘트). 리드 문장 뒤에 빈 줄로 단락 분리.
  const lines = items.map((it) => `${it.time}  ${TYPE_LABEL[it.type] ?? "•"} ${it.name}${it.duration ? ` (${it.duration})` : ""}${it.comment ? `\n   ${it.comment}` : ""}`);
  const head = lead?.trim() ? [lead.trim(), ""] : [];
  return [...head, ...lines].join("\n\n");
}

function planToText(plan: TripPlan): string {
  return plan.days
    .map((d) => `## ${d.day}일차: ${d.theme}\n` + d.items.map((it) => `- ${it.time} [${it.type}] ${it.name} (${it.duration}) — ${it.comment}`).join("\n"))
    .join("\n\n");
}

/** TouristTrip JSON-LD — 일자별 itinerary(ItemList) */
function buildTripLd(title: string, intro: string, plan: TripPlan) {
  let pos = 0;
  const items = plan.days.flatMap((d) =>
    d.items.map((it) => {
      const type = it.type === "숙소" ? "LodgingBusiness" : it.type === "맛집" || it.type === "카페" ? "FoodEstablishment" : "TouristAttraction";
      const node: Record<string, unknown> = { "@type": type, name: it.name };
      if (typeof it.lat === "number" && typeof it.lng === "number" && it.lat) {
        node.geo = { "@type": "GeoCoordinates", latitude: it.lat, longitude: it.lng };
      }
      return { "@type": "ListItem", position: ++pos, item: node };
    }),
  );
  return {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: title,
    description: intro,
    touristType: "leisure",
    itinerary: { "@type": "ItemList", numberOfItems: items.length, itemListElement: items },
  };
}

export async function buildItineraryPost(): Promise<Content | null> {
  const persona = await pickPersona();
  const period = persona.nights === 0 ? "당일치기" : `${persona.nights}박${persona.days}일`;
  let plan: TripPlan;
  try {
    plan = await generateTripPlanCore(reqFor(persona));
  } catch {
    return null;
  }
  if (!plan?.days?.length) return null;

  let ai: ItinAI;
  try {
    ai = await generateJSON<ItinAI>(SYS, `페르소나: ${persona.label} (${persona.companions.join(", ")}), ${period}, 렌터카.\n확정 일정 데이터:\n${planToText(plan)}\n\n위 일정으로 여행일정 글의 머리말(제목·intro·일차별 lead·FAQ·키워드)을 JSON으로 작성하라. dayLeads는 ${plan.days.length}개 일차 전부.`);
  } catch {
    // AI 실패(과부하 등) — 이미 생성된 일정 데이터로 결정적 폴백(비싼 일정 생성을 버리지 않음)
    ai = {
      title: `제주 ${period} ${persona.label} 여행 코스`,
      subtitle: plan.overview?.slice(0, 40) || `${persona.label} 맞춤 동선`,
      intro: plan.overview || `제주 ${period} ${persona.label} 여행 추천 코스입니다.`,
      faqs: [],
      keywords: [],
    };
  }
  // FAQ 폴백 (AEO — 비면 기본 질문 1개라도)
  let faqs = (ai.faqs ?? []).filter((f) => f?.q && f?.a).slice(0, 5);
  if (faqs.length === 0) {
    faqs = [{ q: `제주 ${period} ${persona.label} 코스 추천?`, a: (ai.intro || plan.overview || "").slice(0, 60) || `${persona.label}에 맞춘 ${persona.days}일 렌터카 동선을 추천합니다.` }];
  }

  // 이미지: 일정 아이템 썸네일(도민맛집) + 관광지 매칭(attractions)
  const restaurants = await loadContentRestaurants().catch(() => []);
  const attractions = await loadAttractions().catch(() => []);
  const rById = new Map(restaurants.map((r) => [r.id, r]));
  const norm = (s: string) => s.replace(/\s+/g, "").toLowerCase();
  const spotImg = (name: string): string | undefined => {
    const n = norm(name);
    const a = attractions.find((x) => (x.image || x.imageUrl) && (n.includes(norm(x.title)) || norm(x.title).includes(n)));
    return a?.image || a?.imageUrl || undefined;
  };
  const dayImage = (dayIdx: number): string | undefined => {
    const d = plan.days[dayIdx];
    if (!d) return undefined;
    for (const it of d.items) {
      if (it.restaurantId) { const r = rById.get(it.restaurantId); const u = restaurantImageUrl(r?.images?.[0]); if (u) return u; }
      const s = spotImg(it.name); if (s) return s;
    }
    return undefined;
  };

  const leadByDay = new Map((ai.dayLeads ?? []).map((l) => [l.day, l.lead]));
  const sections: ContentSection[] = plan.days.map((d, i) => ({
    heading: `${d.day}일차: ${d.theme}`,
    body: dayBody(d.items, leadByDay.get(d.day)),
    image: dayImage(i),
    category: `${period}`,
  }));
  if (sections.length === 0) return null;

  await markPersona(persona.key);
  const title = ai.title || `제주 ${period} ${persona.label} 여행 코스`;
  const intro = ai.intro || plan.overview || "";
  const cover = sections.find((s) => s.image)?.image;
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    type: "webzine",
    status: "draft",
    slug: `it-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
    title,
    subtitle: ai.subtitle || `${persona.label} 맞춤 ${period} 동선`,
    intro,
    sections,
    keywords: [
      ...(ai.keywords ?? []),
      `제주 ${period}`,
      `제주 ${period} 코스`,
      `제주 여행일정`, `제주 여행 코스`, `제주 ${persona.label} 여행`,
    ],
    faqs,
    coverImage: cover,
    region: "제주",
    menu: `${persona.label} 일정`,
    sourceIds: plan.days.flatMap((d) => d.items.map((it) => it.restaurantId).filter((x): x is string => !!x)),
    createdAt: now,
    extraLd: buildTripLd(title, intro, plan),
  };
}
