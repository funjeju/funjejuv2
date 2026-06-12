import type { SiteSchema } from "@/lib/biz/types";

/** siteType → schema.org 타입 매핑 */
const SCHEMA_TYPE: Record<string, string> = {
  cafe: "CafeOrCoffeeShop",
  restaurant: "Restaurant",
  beauty: "BeautySalon",
  stay: "LodgingBusiness",
  attraction: "TouristAttraction",
  general: "LocalBusiness",
};

/**
 * 가게 정보를 schema.org JSON-LD(구조화 데이터)로 변환.
 * 구글 로컬 검색/지도/리치결과 노출의 핵심 (제주 비즈 홈페이지 SEO).
 */
export function buildLocalBusinessJsonLd(site: SiteSchema, url: string): Record<string, unknown> {
  const m = site.merchantInfo;
  const type = SCHEMA_TYPE[site.siteType] || "LocalBusiness";

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": type,
    name: m.name,
    url,
  };

  if (m.description) jsonLd.description = m.description;
  if (m.phone) jsonLd.telephone = m.phone;
  if (site.contentAssets?.heroImage) jsonLd.image = site.contentAssets.heroImage;

  if (m.address) {
    jsonLd.address = {
      "@type": "PostalAddress",
      streetAddress: m.address,
      addressRegion: "제주특별자치도",
      addressCountry: "KR",
    };
  }

  if (m.coordinates?.lat && m.coordinates?.lng) {
    jsonLd.geo = {
      "@type": "GeoCoordinates",
      latitude: m.coordinates.lat,
      longitude: m.coordinates.lng,
    };
  }

  if (m.businessHours) jsonLd.openingHours = m.businessHours;

  if (site.menuData?.items?.length && (type === "Restaurant" || type === "CafeOrCoffeeShop")) {
    jsonLd.hasMenu = {
      "@type": "Menu",
      hasMenuSection: {
        "@type": "MenuSection",
        hasMenuItem: site.menuData.items.slice(0, 30).map((item) => ({
          "@type": "MenuItem",
          name: item.name,
          ...(item.price > 0 ? { offers: { "@type": "Offer", price: item.price, priceCurrency: "KRW" } } : {}),
          ...(item.description ? { description: item.description } : {}),
        })),
      },
    };
  }

  const sameAs = [site.externalLinks?.naverPlace, site.externalLinks?.instagram].filter(Boolean);
  if (sameAs.length) jsonLd.sameAs = sameAs;

  return jsonLd;
}
