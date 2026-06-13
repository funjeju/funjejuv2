import "server-only";
import { generateJSON, analyzeImageJSON, searchBusinessInfo } from "./gemini";
import {
  SITE_GENERATION_SYSTEM_PROMPT,
  buildGenerationPrompt,
  buildCopyPrompt,
  buildOcrMenuPrompt,
} from "./prompts";
import {
  TEMPLATES,
  type SiteSchema,
  type SiteType,
  type SiteBlock,
  type BlockComponentType,
  type ThemeId,
  type MenuItem,
  type GenerationSource,
  type CtaButton,
} from "./types";
import { loadAllRestaurants, formatHours } from "@/lib/restaurants";

interface AIGenerationInput {
  businessName: string;
  category?: string;
  description?: string;
  address?: string;
  phone?: string;
  reviews?: string[];
  menuItems?: string;
  vibes?: string[];
  businessHours?: string;
  heroImage?: string;
  galleryImages?: string[];
  ownerId: string;
  coordinates?: { lat: number; lng: number };
  placeUrl?: string;
  /** 사용자가 지정한 CTA 버튼 (최대 3개) */
  ctaButtons?: CtaButton[];
  /** 도민맛집(domin_food.json) ID — 주어지면 자동 prefill */
  restaurantId?: string;
  /** 편집 모드 — 주어지면 새 ID 생성 대신 이 슬러그를 덮어쓴다 */
  editSlug?: string;
}

/** 입력 정보로 기본 CTA 버튼을 구성한다 (최대 3개: 전화·네이버·길찾기). */
function buildDefaultCtaButtons(input: AIGenerationInput): CtaButton[] {
  const btns: CtaButton[] = [];
  if (input.phone) btns.push({ type: "call", label: "전화 예약", value: input.phone });

  const naverQ = encodeURIComponent(`${input.businessName} ${input.address ?? ""}`.trim());
  btns.push({ type: "naver", label: "네이버플레이스", value: `https://map.naver.com/p/search/${naverQ}` });

  if (input.coordinates) {
    const { lat, lng } = input.coordinates;
    btns.push({
      type: "directions",
      label: "길찾기",
      value: `https://map.kakao.com/link/to/${encodeURIComponent(input.businessName)},${lat},${lng}`,
    });
  } else if (input.address) {
    btns.push({
      type: "directions",
      label: "길찾기",
      value: `https://map.kakao.com/link/search/${encodeURIComponent(input.address)}`,
    });
  }
  return btns.slice(0, 3);
}

interface AIGenerationResult {
  siteType: SiteType;
  themeId: ThemeId;
  heroTitle: string;
  heroSubtitle: string;
  heroBadge?: string;
  featuredTitle?: string;
  featuredItems?: Array<{ title: string; description: string; badge?: string }>;
  reviewTitle?: string;
  reviews?: Array<{ author: string; rating: number; text: string }>;
  attractionInfo?: Array<{ label: string; value: string }>;
  layout?: Array<{ componentType: BlockComponentType }>;
}

/** 상호명 → URL-safe slug. 한글은 유지하되 공백/특수문자 정리 + 짧은 해시 suffix */
export function generateSiteId(businessName: string): string {
  // URL/문서ID는 영문·숫자만 — 한글 슬러그의 NFC/NFD 정규화 404 문제를 원천 차단.
  const base = businessName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  const suffix = Math.random().toString(36).slice(2, 8);
  return base ? `${base}-${suffix}` : `biz-${suffix}`;
}

/**
 * funjeju 전용: 도민맛집(domin_food.json)에서 가게 정보를 끌어와 입력에 자동 주입.
 * aiweb은 카카오 검색으로 0부터 채웠지만, funjeju는 589곳 검증 데이터가 이미 있어
 * restaurantId만 있으면 좌표/주소/영업시간/메뉴까지 클릭 한 번에 prefill된다.
 */
async function prefillFromDominFood(input: AIGenerationInput): Promise<GenerationSource> {
  if (!input.restaurantId) return "manual-input";
  try {
    const all = await loadAllRestaurants();
    const r = all.find((x) => x.id === input.restaurantId);
    if (!r) return "manual-input";

    input.businessName = input.businessName || r.title;
    input.category = input.category || r.menu;
    input.address = input.address || r.address;
    const lat = Number(r.lat);
    const lng = Number(r.lng);
    if (!input.coordinates && !isNaN(lat) && !isNaN(lng) && lat !== 0) {
      input.coordinates = { lat, lng };
    }
    const hours = formatHours(r.hours);
    if (hours) input.businessHours = input.businessHours || hours;
    if (r.prices && !input.menuItems) input.menuItems = r.prices;
    return "domin-food";
  } catch (err) {
    console.error("[biz] domin-food prefill failed:", err);
    return "manual-input";
  }
}

export async function generateSiteFromInput(input: AIGenerationInput): Promise<SiteSchema> {
  let searchedMenu: MenuItem[] = [];
  let searchedReviews: Array<{ author: string; rating: number; text: string }> = [];

  // ── 1단계: 도민맛집 자동 주입 (funjeju 고유 자산) ──
  const primarySource = await prefillFromDominFood(input);
  let coordinates: { lat: number; lng: number } | undefined = input.coordinates;

  // ── 2단계: 구글 웹 검색(grounding) — 메뉴/리뷰/소개 보강 ──
  const needsEnrichment = !input.description || !input.menuItems || !input.reviews?.length;
  if (needsEnrichment) {
    try {
      const region = input.address?.split(/\s+/)[1] || "제주";
      const info = await searchBusinessInfo(input.businessName, input.category, region);
      if (info.found) {
        input.address = input.address || info.address;
        input.phone = input.phone || info.phone;
        input.description = input.description || info.description;
        if (!input.category && info.category) input.category = info.category;
        if (info.businessHours) input.businessHours = input.businessHours || info.businessHours;
        if (info.vibes?.length) input.vibes = [...(input.vibes || []), ...info.vibes];

        if (info.menuItems?.length) {
          searchedMenu = info.menuItems
            .filter((m) => m.name && m.price > 0)
            .map((m) => ({ id: crypto.randomUUID(), name: m.name, price: m.price }));
          input.menuItems = input.menuItems || searchedMenu.map((m) => `${m.name} ${m.price}원`).join(", ");
        }
        if (info.reviews?.length) {
          searchedReviews = info.reviews
            .filter(Boolean)
            .slice(0, 6)
            .map((text) => ({ author: "방문자", rating: 5, text }));
          input.reviews = input.reviews?.length ? input.reviews : info.reviews;
        }
      }
    } catch (err) {
      console.error("[biz] business search enrichment failed:", err);
    }
  }

  const prompt = buildGenerationPrompt({
    businessName: input.businessName,
    category: input.category,
    description: input.description,
    address: input.address,
    phone: input.phone,
    reviews: input.reviews,
    menuItems: input.menuItems,
    vibes: input.vibes,
  });

  const ai = await generateJSON<AIGenerationResult>(SITE_GENERATION_SYSTEM_PROMPT, prompt);

  if (searchedReviews.length > 0) ai.reviews = searchedReviews;

  const siteId = input.editSlug || generateSiteId(input.businessName);
  const template = TEMPLATES.find((t) => t.siteType === ai.siteType) ?? TEMPLATES[0];

  const blocks: SiteBlock[] = (ai.layout ?? template.blocks.map((c) => ({ componentType: c }))).map(
    (b, i) => {
      const blockId = `block-${i}-${b.componentType.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
      const data: Record<string, unknown> = {};

      if (b.componentType.startsWith("Hero")) {
        data.title = ai.heroTitle || input.businessName;
        data.subtitle = ai.heroSubtitle || input.description || "";
        if (ai.heroBadge) data.badge = ai.heroBadge;
      } else if (b.componentType.startsWith("FeaturedCard")) {
        data.title = ai.featuredTitle || "추천";
        data.items = ai.featuredItems || [];
      } else if (b.componentType.startsWith("Review")) {
        data.title = ai.reviewTitle || "리뷰";
        data.reviews = ai.reviews || [];
      } else if (b.componentType.startsWith("AttractionInfo")) {
        data.title = "탐방 정보";
        data.items = (ai.attractionInfo || []).filter((it) => it.label && it.value);
      }

      return { blockId, componentType: b.componentType, data, visible: true };
    }
  );

  const ctaButtons = (input.ctaButtons?.length ? input.ctaButtons : buildDefaultCtaButtons(input)).slice(0, 3);

  const now = new Date().toISOString();
  const site: SiteSchema = {
    siteId,
    createdAt: now,
    updatedAt: now,
    ownerId: input.ownerId,
    role: "owner",
    siteType: ai.siteType ?? "general",
    published: true,
    slug: siteId,
    generationMode: {
      type: "low-input",
      source: [primarySource],
    },
    merchantInfo: {
      name: input.businessName,
      category: input.category || "",
      phone: input.phone || "",
      address: input.address || "",
      description: input.description || "",
      businessHours: input.businessHours || "",
      ...(coordinates ? { coordinates } : {}),
      ...(input.restaurantId ? { restaurantId: input.restaurantId } : {}),
    },
    externalLinks: input.placeUrl ? { kakaoPlace: input.placeUrl } : {},
    ctaButtons,
    designTokens: {
      themeId: ai.themeId ?? "warm-ocean",
      primaryColor: "",
      fontFamily: "Pretendard",
      radius: "lg",
    },
    contentAssets: {
      heroImage: input.heroImage || "",
      logoImage: "",
      galleryImages: input.galleryImages || [],
      menuImages: [],
      reviewImages: [],
    },
    menuData: { source: searchedMenu.length ? "ai" : "manual", items: searchedMenu },
    layout: blocks,
  };

  return site;
}

interface OcrResult {
  menuItems: Array<{ name: string; price: number; category?: string }>;
}

export async function extractMenuFromImage(
  imageBase64: string,
  mimeType: string
): Promise<MenuItem[]> {
  const result = await analyzeImageJSON<OcrResult>(buildOcrMenuPrompt(), imageBase64, mimeType);
  return (result.menuItems || []).map((item) => ({
    id: crypto.randomUUID(),
    name: item.name,
    price: item.price,
    category: item.category,
  }));
}

interface CopyResult {
  heroTitle: string;
  heroSubtitle: string;
  badge?: string;
}

export async function generateMarketingCopy(
  reviews: string[],
  businessName: string,
  category: string
): Promise<CopyResult> {
  return generateJSON<CopyResult>(
    SITE_GENERATION_SYSTEM_PROMPT,
    buildCopyPrompt(reviews, businessName, category)
  );
}
