import "server-only";
import { generateJSON, analyzeImageJSON } from "@/lib/biz/gemini";
import { stripHtml, restaurantImageUrl } from "@/lib/restaurants";
import { listRecentFeedsRich } from "@/lib/feed-server";
import { pickWebzineTopic } from "@/lib/webzine-ai";
import { getWeatherCamerasForNow } from "@/lib/cardnews-config";
import { getAdminDb, uploadPublicImage } from "@/lib/firebase-admin";
import type { Content, ContentSection } from "@/types/content";

/**
 * 카드뉴스 자동 생성 — 인스타/스레드 캐러셀용 (4:5, 8~10장).
 * 카드는 "한 장에 짧게"가 트렌드라 웹진의 긴 본문이 아닌 **카드 전용 짧은 카피**를 새로 생성한다.
 * 결과는 Content(type: card_news)로 저장 → og 라우트(/api/og/cardnews)가 slug+index로 PNG 렌더.
 *
 * sections[i] = 본문 카드 i (heading=짧은 제목, body=2~3줄, image, category=위치칩).
 * 표지(coverImage+title)와 CTA는 og 템플릿이 자동 합성한다.
 */

export type CardNewsSource = "webzine" | "briefing" | "feed" | "weather";

function slug(): string {
  return `cn-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

const CARD_SYS = `너는 제주 로컬 브랜드의 SNS 카드뉴스 카피라이터다. 인스타/스레드 캐러셀(밀어 보는 카드)을 만든다.
규칙:
- 카드는 한 장에 짧게. heading(카드 제목)은 12자 이내, body는 2~3줄(공백 포함 45~75자) 후킹+정보.
- 표지 title은 저장·클릭을 부르는 훅 한 줄(최대 18자, 줄바꿈 \\n 1회 허용). subtitle은 한 줄 보조(최대 16자).
- 클리셰 금지(힐링·인생샷·너무예뻐요). 과장·날조 금지. 주어진 사실에만 근거.
- 반드시 유효한 JSON만 반환.`;

type CardAI = {
  coverTitle: string;
  coverSubtitle: string;
  keywords: string[];
  cards: { ref: string; heading: string; body: string }[];
};

/** 웹진/도민맛집 → 맛집 N곳 카드 */
async function fromWebzine(): Promise<Content | null> {
  const topic = await pickWebzineTopic();
  if (!topic) return null;
  const picks = topic.picks.slice(0, 7);
  const list = picks
    .map((r) => `- [${r.id}] ${r.title} (${r.region}, ${r.menu}) :: ${stripHtml(r.content, 120)}`)
    .join("\n");

  const prompt = `제주 ${topic.region}의 ${topic.menu} 맛집들로 인스타 카드뉴스를 만들어라.
맛집 목록 (형식: [id] 이름 (지역, 메뉴) :: 소개):
${list}

JSON 형식:
{
  "coverTitle": "저장 부르는 훅 (예: ${topic.region} ${topic.menu}\\n맛집 ${picks.length}곳)",
  "coverSubtitle": "한 줄 보조 (현지인 단골 등)",
  "keywords": ["제주 ${topic.menu}", "${topic.region} 맛집", "..."],
  "cards": [{ "ref": "위 [id]", "heading": "맛집 이름(12자 이내)", "body": "2~3줄 후킹+특징" }]
}`;

  const ai = await generateJSON<CardAI>(CARD_SYS, prompt);
  const byId = new Map(picks.map((r) => [r.id, r]));
  const sections: ContentSection[] = (ai.cards ?? [])
    .filter((c) => byId.has(c.ref))
    .map((c) => {
      const r = byId.get(c.ref)!;
      return {
        heading: c.heading || r.title,
        body: c.body || "",
        restaurantId: r.id,
        image: restaurantImageUrl(r.images?.[0]),
        category: r.region,
      };
    });
  if (sections.length === 0) return null;

  const cover = picks.find((r) => r.images?.[0]);
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    type: "card_news",
    status: "draft",
    slug: slug(),
    title: ai.coverTitle || `제주 ${topic.region} ${topic.menu} 맛집`,
    subtitle: ai.coverSubtitle || "현지인 단골 한 상",
    intro: "",
    sections,
    keywords: [...(ai.keywords ?? []), `제주 ${topic.menu}`, `${topic.region} 맛집`, "제주 카드뉴스"],
    coverImage: restaurantImageUrl(cover?.images?.[0]) ?? sections[0]?.image,
    region: topic.region,
    menu: topic.menu,
    sourceIds: picks.map((r) => r.id),
    createdAt: now,
  };
}

/** 라이브피드 → 최근 사진 큐레이션 카드 */
async function fromFeed(): Promise<Content | null> {
  const feeds = (await listRecentFeedsRich(12)).filter((f) => f.imageUrl);
  if (feeds.length < 3) return null;
  const picks = feeds.slice(0, 7);

  const list = picks
    .map((f, i) => `- [${i}] ${f.placeName || f.regionName || "제주"} / ${f.category ?? ""} :: ${f.aiCopy ?? ""}`)
    .join("\n");

  const prompt = `제주 여행자들이 올린 최근 라이브 사진들로 '이번 주 제주' 카드뉴스를 만들어라.
사진 목록 (형식: [번호] 장소 / 카테고리 :: 기존 카피):
${list}

JSON 형식:
{
  "coverTitle": "이번 주 제주\\n지금 이 모습",
  "coverSubtitle": "여행자들이 담은 실시간",
  "keywords": ["제주 여행", "제주 실시간", "..."],
  "cards": [{ "ref": "위 [번호]", "heading": "장소(12자 이내)", "body": "사진 분위기 2~3줄" }]
}`;

  const ai = await generateJSON<CardAI>(CARD_SYS, prompt);
  const sections: ContentSection[] = (ai.cards ?? [])
    .map((c) => {
      const idx = Number(c.ref);
      const f = picks[idx];
      if (!f) return null;
      return {
        heading: c.heading || f.placeName || f.regionName || "제주",
        body: c.body || f.aiCopy || "",
        image: f.imageUrl,
        category: [f.regionName, f.placeName].filter(Boolean).join(" ") || undefined,
      } as ContentSection;
    })
    .filter((s): s is ContentSection => s !== null);
  if (sections.length === 0) return null;

  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    type: "card_news",
    status: "draft",
    slug: slug(),
    title: ai.coverTitle || "이번 주 제주\n지금 이 모습",
    subtitle: ai.coverSubtitle || "여행자들이 담은 실시간",
    intro: "",
    sections,
    keywords: [...(ai.keywords ?? []), "제주 여행", "제주 실시간", "제주 카드뉴스"],
    coverImage: picks[0].imageUrl,
    sourceIds: [],
    createdAt: now,
  };
}

/** 모닝브리핑 → 섹션별 카드 (브리핑 초안을 카드용으로 요약) */
async function fromBriefing(): Promise<Content | null> {
  const { generateBriefingDraft } = await import("@/lib/briefing-ai");
  const brief = await generateBriefingDraft();
  const src = brief.sections.slice(0, 7);
  if (src.length === 0) return null;

  const list = src.map((s, i) => `- [${i}] ${s.heading} :: ${s.body.slice(0, 160)}`).join("\n");
  const prompt = `다음 제주 모닝브리핑 섹션들을 인스타 카드뉴스로 요약하라(섹션당 카드 1장).
섹션 목록 (형식: [번호] 제목 :: 본문):
${list}

JSON 형식:
{
  "coverTitle": "${brief.title.slice(0, 16)}",
  "coverSubtitle": "오늘의 제주 한눈에",
  "keywords": ["제주 소식", "..."],
  "cards": [{ "ref": "위 [번호]", "heading": "카드 제목(12자 이내)", "body": "핵심 2~3줄" }]
}`;

  const ai = await generateJSON<CardAI>(CARD_SYS, prompt);
  const sections: ContentSection[] = (ai.cards ?? [])
    .map((c) => {
      const idx = Number(c.ref);
      const s = src[idx];
      if (!s) return null;
      return { heading: c.heading || s.heading, body: c.body || s.body.slice(0, 80), image: s.image, category: s.category } as ContentSection;
    })
    .filter((s): s is ContentSection => s !== null);
  if (sections.length === 0) return null;

  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    type: "card_news",
    status: "draft",
    slug: slug(),
    title: ai.coverTitle || brief.title,
    subtitle: ai.coverSubtitle || "오늘의 제주 한눈에",
    intro: "",
    sections,
    keywords: [...(ai.keywords ?? []), "제주 소식", "제주 카드뉴스"],
    coverImage: brief.coverImage || sections.find((s) => s.image)?.image,
    sourceIds: [],
    createdAt: now,
  };
}

// ── 실시간 날씨 ─────────────────────────────────────────────
type WeatherAI = { weather: string; scene: string };

/** Vultr 스냅샷 1장 가져오기 (ffmpeg 1프레임) */
async function grabSnapshot(id: string): Promise<Buffer | null> {
  const base = process.env.NEXT_PUBLIC_PROXY_URL || "";
  const key = process.env.PROXY_KEY || "";
  if (!base) return null;
  try {
    const res = await fetch(`${base}/snapshot?cctv=${encodeURIComponent(id)}&key=${encodeURIComponent(key)}`, {
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    return ab.byteLength > 0 ? Buffer.from(ab) : null;
  } catch {
    return null;
  }
}

const WEATHER_SYS = `너는 제주 CCTV 화면을 보고 현장 날씨를 읽는 분석가다. 보이는 것만 판단하고 추측·날조 금지.
반환(JSON): { "weather": "맑음|구름조금|흐림|비|눈|안개|야간 중 하나", "scene": "현장 모습 한 줄(파도·하늘·혼잡 등, 18자 이내)" }`;

async function fromWeather(): Promise<Content | null> {
  const weatherCameraIds = await getWeatherCamerasForNow(); // KST 기준 오전/오후 세트 자동 선택
  if (weatherCameraIds.length === 0) return null;

  const db = getAdminDb();
  const ts = Date.now();
  const sections: ContentSection[] = [];
  let coverImage: string | undefined;

  for (const id of weatherCameraIds) {
    const buf = await grabSnapshot(id);
    if (!buf) continue; // 캡처 실패(다운/멈춤) 카메라는 건너뜀
    let imageUrl: string;
    try {
      imageUrl = await uploadPublicImage(`cctv-snapshots/${id}-${ts}.jpg`, buf, "image/jpeg");
    } catch {
      continue;
    }
    // 카메라 메타
    const camSnap = await db.collection("cctvs").doc(id).get();
    const cam = camSnap.exists ? (camSnap.data() as { name?: string; region?: string }) : {};
    const name = cam.name || id;
    // 비전 분석
    let ai: WeatherAI = { weather: "—", scene: "" };
    try { ai = await analyzeImageJSON<WeatherAI>(WEATHER_SYS, buf.toString("base64"), "image/jpeg"); } catch { /* 분석 실패 시 기본값 */ }
    sections.push({
      heading: name,
      body: `${ai.weather}${ai.scene ? ` · ${ai.scene}` : ""}`,
      image: imageUrl,
      category: cam.region || undefined,
    });
    if (!coverImage) coverImage = imageUrl;
  }

  if (sections.length === 0) return null;

  const now = new Date();
  const hh = now.getHours();
  const part = hh < 12 ? "오전" : "오후";
  const dateStr = `${now.getMonth() + 1}월 ${now.getDate()}일 ${part}`;
  return {
    id: crypto.randomUUID(),
    type: "card_news",
    status: "draft",
    slug: slug(),
    title: `제주 실시간 날씨\n${dateStr}`,
    subtitle: "동서남북 지금 이 모습",
    intro: "",
    sections,
    keywords: ["제주 날씨", "제주 실시간", "제주 CCTV", "제주 여행", "제주 카드뉴스"],
    coverImage,
    sourceIds: weatherCameraIds,
    createdAt: now.toISOString(),
  };
}

/** 소스별 카드뉴스 초안 생성 */
export async function generateCardNewsDraft(source: CardNewsSource): Promise<Content | null> {
  if (source === "feed") return fromFeed();
  if (source === "briefing") return fromBriefing();
  if (source === "weather") return fromWeather();
  return fromWebzine();
}
