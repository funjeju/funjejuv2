/**
 * 비즈니스 원페이지 홈페이지 스키마 (aiweb 이식)
 *
 * funjeju 비즈 회원이 상호 입력 → AI 자동 생성하는 사이트의 데이터 구조.
 * /biz/[slug] 서브경로로 발행되어 funjeju 도메인 SEO 권위를 상속한다.
 *
 * aiweb 원본(lib/types/site.ts) 대비 변경점:
 * - subdomain → slug (서브도메인 대신 funjeju.com/biz/[slug] 서브경로)
 * - merchantInfo.restaurantId 추가 (도민맛집 589곳과 연결 → 양방향 링크/prefill)
 */

export type SiteRole = "owner" | "agency" | "admin";
export type SiteType = "cafe" | "restaurant" | "beauty" | "stay" | "attraction" | "general";
export type GenerationModeType = "zero-input" | "low-input" | "agency";

export type GenerationSource =
  | "domin-food"      // 도민맛집 자동 주입 (funjeju 전용)
  | "naver-place"
  | "instagram"
  | "manual-input"
  | "menu-image"
  | "hero-image";

export interface MerchantInfo {
  name: string;
  category: string;
  phone: string;
  address: string;
  description: string;
  coordinates?: { lat: number; lng: number };
  businessHours?: string;
  /** 도민맛집(domin_food.json) ID — 연결된 경우. 양방향 링크/prefill 출처 */
  restaurantId?: string;
}

export interface ExternalLinks {
  naverPlace?: string;
  instagram?: string;
  kakaoTalk?: string;
  booking?: string;
  /** 카카오맵 장소 상세 URL (카카오 매칭 시) */
  kakaoPlace?: string;
}

/** 하단 고정 CTA 버튼 (최대 3개) */
export type CtaButtonType = "call" | "naver" | "directions" | "kakao" | "link";

export interface CtaButton {
  type: CtaButtonType;
  label: string;
  /** 전화번호 / URL */
  value: string;
}

export type ThemeId =
  | "warm-ocean"
  | "jeju-warm"
  | "luxury-modern"
  | "minimal-clean"
  | "vintage-cozy"
  | "fresh-green";

export interface DesignTokens {
  themeId: ThemeId;
  primaryColor: string;
  fontFamily: string;
  radius: "sm" | "md" | "lg";
}

export interface ContentAssets {
  heroImage: string;
  logoImage: string;
  galleryImages: string[];
  menuImages: string[];
  reviewImages: string[];
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  category?: string;
}

export interface MenuData {
  source: "ocr" | "manual" | "ai";
  items: MenuItem[];
}

// Block component types (Pattern Library)
export type BlockComponentType =
  | "HeroCentered-v1"
  | "HeroCentered-v2"
  | "HeroCentered-v3"
  | "HeroSplit-v1"
  | "HeroSplit-v2"
  | "MenuGrid-v1"
  | "MenuGrid-v2"
  | "FeaturedCard-v1"
  | "FeaturedCard-v2"
  | "FeaturedCard-v3"
  | "GalleryGrid-v1"
  | "GalleryMasonry-v2"
  | "ReviewCarousel-v1"
  | "ReviewCard-v2"
  | "ReviewSummary-v1"
  | "MapBlock-v1"
  | "CTABanner-v1"
  | "CTABanner-v2"
  | "ContactBlock-v1"
  | "AnnouncementBlock-v1"
  | "PriceList-v1"
  | "BusinessHours-v1"
  | "BlogReviews-v1"
  | "AttractionInfo-v1";

export interface SiteBlock {
  blockId: string;
  componentType: BlockComponentType;
  data: Record<string, unknown>;
  visible?: boolean;
}

export interface SiteSchema {
  siteId: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  role: SiteRole;
  siteType: SiteType;
  published: boolean;
  /** funjeju.com/biz/[slug] 의 slug. siteId와 동일하게 시작 */
  slug: string;

  generationMode: {
    type: GenerationModeType;
    source: GenerationSource[];
  };

  merchantInfo: MerchantInfo;
  externalLinks: ExternalLinks;
  /** 하단 고정 CTA 버튼 (최대 3개) */
  ctaButtons?: CtaButton[];
  designTokens: DesignTokens;
  contentAssets: ContentAssets;
  menuData: MenuData;
  layout: SiteBlock[];
}

// Template definitions
export interface TemplateDefinition {
  id: string;
  name: string;
  siteType: SiteType;
  blocks: BlockComponentType[];
  description: string;
}

export const TEMPLATES: TemplateDefinition[] = [
  {
    id: "cafe-default",
    name: "카페 기본",
    siteType: "cafe",
    blocks: ["HeroCentered-v2", "FeaturedCard-v2", "GalleryGrid-v1", "ReviewCarousel-v1", "MapBlock-v1", "CTABanner-v1"],
    description: "오션뷰, 감성 카페에 최적화된 레이아웃",
  },
  {
    id: "restaurant-default",
    name: "식당 기본",
    siteType: "restaurant",
    blocks: ["HeroCentered-v1", "FeaturedCard-v1", "MenuGrid-v1", "ReviewCard-v2", "CTABanner-v2", "MapBlock-v1"],
    description: "메뉴 중심, 예약 유도형 레이아웃",
  },
  {
    id: "beauty-default",
    name: "미용실 기본",
    siteType: "beauty",
    blocks: ["HeroSplit-v1", "GalleryMasonry-v2", "PriceList-v1", "CTABanner-v1", "ReviewCard-v2"],
    description: "스타일 갤러리, 예약 중심 레이아웃",
  },
  {
    id: "stay-default",
    name: "펜션/숙박 기본",
    siteType: "stay",
    blocks: ["HeroCentered-v3", "GalleryGrid-v1", "FeaturedCard-v3", "CTABanner-v2", "ReviewCarousel-v1", "MapBlock-v1"],
    description: "공간 경험 중심, 예약 유도 레이아웃",
  },
  {
    id: "attraction-default",
    name: "관광지/오름 기본",
    siteType: "attraction",
    blocks: ["HeroCentered-v2", "AttractionInfo-v1", "GalleryGrid-v1", "MapBlock-v1", "BlogReviews-v1"],
    description: "탐방 정보(난이도/소요시간/주차) 중심 관광지 레이아웃",
  },
];

// Vibe/Theme definitions
export interface VibeDefinition {
  id: ThemeId;
  name: string;
  label: string;
  primaryColor: string;
  fontFamily: string;
  mood: string[];
}

export const VIBES: VibeDefinition[] = [
  {
    id: "warm-ocean",
    name: "Warm Ocean",
    label: "따뜻한 오션",
    primaryColor: "#6366F1",
    fontFamily: "Pretendard",
    mood: ["warm", "ocean", "jeju"],
  },
  {
    id: "jeju-warm",
    name: "Jeju Warm",
    label: "제주 감성",
    primaryColor: "#F97316",
    fontFamily: "Pretendard",
    mood: ["warm", "jeju", "nature"],
  },
  {
    id: "luxury-modern",
    name: "Luxury Modern",
    label: "럭셔리 모던",
    primaryColor: "#1C1C1E",
    fontFamily: "Pretendard",
    mood: ["luxury", "minimal", "premium"],
  },
  {
    id: "minimal-clean",
    name: "Minimal Clean",
    label: "미니멀 클린",
    primaryColor: "#3B82F6",
    fontFamily: "Pretendard",
    mood: ["minimal", "clean", "modern"],
  },
  {
    id: "vintage-cozy",
    name: "Vintage Cozy",
    label: "빈티지 코지",
    primaryColor: "#92400E",
    fontFamily: "Pretendard",
    mood: ["vintage", "cozy", "warm"],
  },
  {
    id: "fresh-green",
    name: "Fresh Green",
    label: "프레시 그린",
    primaryColor: "#16A34A",
    fontFamily: "Pretendard",
    mood: ["fresh", "nature", "healthy"],
  },
];
