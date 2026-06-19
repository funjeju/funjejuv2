import type { MetadataRoute } from "next";
import { getAllIds } from "@/lib/restaurants";
import { loadMergedRestaurants } from "@/lib/restaurants-merged";
import { mockCctvs } from "@/constants/mock-cctvs";
import { GUIDE_SLUGS } from "@/lib/guides";
import { listPublished } from "@/lib/contents";
import { listPublishedSites } from "@/lib/biz/store";
import { listLocations } from "@/lib/cctv-location";
import { GROUP_HUB } from "@/types/cctv-location";

// canonical 도메인(non-www, 네이버 등록 도메인)으로 통일 — 색인 신호 분산 방지
const BASE = "https://funjeju.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // 정적 페이지
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE}/cctv`, lastModified: now, changeFrequency: "always", priority: 0.9 },
    { url: `${BASE}/food`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/feed`, lastModified: now, changeFrequency: "hourly", priority: 0.7 },
    { url: `${BASE}/jeju-ai`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/chat`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/youtube`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE}/trip-ai`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/saved`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/search`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/guide`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/magazine`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE}/webzine`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE}/card`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE}/daily`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
  ];

  // 카드뉴스 (발행된 것만)
  let cardPages: MetadataRoute.Sitemap = [];
  try {
    const cards = await listPublished("card_news", 200);
    cardPages = cards.map((c) => ({
      url: `${BASE}/card/${c.slug}`,
      lastModified: c.publishedAt ? new Date(c.publishedAt) : now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  } catch { /* Firestore 미설정 시 스킵 */ }

  // AI데일리제주 모닝브리핑 (발행된 것만)
  let dailyPages: MetadataRoute.Sitemap = [];
  try {
    const briefings = await listPublished("briefing", 200);
    dailyPages = briefings.map((c) => ({
      url: `${BASE}/daily/${c.slug}`,
      lastModified: c.publishedAt ? new Date(c.publishedAt) : now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  } catch { /* Firestore 미설정 시 스킵 */ }

  // 웹진 (콘텐츠 엔진 2단계 — 발행된 것만)
  let webzinePages: MetadataRoute.Sitemap = [];
  try {
    const published = await listPublished("webzine", 200);
    webzinePages = published.map((c) => ({
      url: `${BASE}/webzine/${c.slug}`,
      lastModified: c.publishedAt ? new Date(c.publishedAt) : now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));
  } catch { /* Firestore 미설정 시 스킵 */ }

  // 이용 가이드 (FAQ 위키) — 콘텐츠 엔진 1단계 SEO 자산
  const guidePages: MetadataRoute.Sitemap = GUIDE_SLUGS.map((slug) => ({
    url: `${BASE}/guide/${slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // CCTV 지역 SEO 데이터 (lastmod = 실제 콘텐츠 변경일 · 가짜 신선도 금지)
  let locMap = new Map<string, string>();
  let themeHubPages: MetadataRoute.Sitemap = [];
  try {
    const locs = await listLocations();
    locMap = new Map(locs.map((l) => [l.id, l.updatedAt || ""]));
    // 테마 허브 — 그룹 내 최신 updatedAt을 lastmod로
    const groupLatest = new Map<string, string>();
    for (const l of locs) {
      if (!l.group) continue;
      const cur = groupLatest.get(l.group) || "";
      if ((l.updatedAt || "") > cur) groupLatest.set(l.group, l.updatedAt || "");
    }
    themeHubPages = Object.entries(GROUP_HUB)
      .filter(([g]) => groupLatest.has(g))
      .map(([g, hub]) => ({
        url: `${BASE}/cctv/theme/${hub.slug}`,
        lastModified: groupLatest.get(g) ? new Date(groupLatest.get(g)!) : now,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));
  } catch { /* Firestore 미설정 시 스킵 */ }

  // CCTV 상세 페이지 — 본문은 evergreen이므로 monthly + 실제 updatedAt 기준
  const cctvPages: MetadataRoute.Sitemap = mockCctvs.map((c) => {
    const upd = locMap.get(c.id);
    return {
      url: `${BASE}/cctv/${c.id}`,
      lastModified: upd ? new Date(upd) : now,
      changeFrequency: "monthly" as const,
      priority: upd ? 0.85 : 0.7, // SEO 데이터 있는 페이지 우선
    };
  });

  // 지역별 허브 페이지
  const regions = [...new Set(mockCctvs.map((c) => c.region))];
  const regionPages: MetadataRoute.Sitemap = regions.map((region) => ({
    url: `${BASE}/cctv/region/${encodeURIComponent(region)}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.75,
  }));

  // 도민맛집 상세 페이지 — JSON 589 + Firestore 신규(비짓제주 적재 등) 병합
  let foodIds: string[] = [];
  try {
    const merged = await loadMergedRestaurants();
    foodIds = merged.map((r) => r.id);
  } catch {
    foodIds = await getAllIds(); // 폴백: JSON만
  }
  const foodPages: MetadataRoute.Sitemap = foodIds.map((id) => ({
    url: `${BASE}/food/${id}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // 비즈 홈페이지 (/biz/[slug] — 발행된 것만, 롱테일 SEO 출구)
  let bizPages: MetadataRoute.Sitemap = [];
  try {
    const sites = await listPublishedSites();
    bizPages = sites.map((s) => ({
      url: `${BASE}/biz/${s.slug}`,
      lastModified: s.updatedAt ? new Date(s.updatedAt) : now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch { /* Firestore 미설정 시 스킵 */ }

  // mockCctvs에 없는 located 카메라(예: halla_1100) 보강
  const mockIds = new Set(mockCctvs.map((c) => c.id));
  const extraCctvPages: MetadataRoute.Sitemap = [...locMap.entries()]
    .filter(([id]) => !mockIds.has(id))
    .map(([id, upd]) => ({
      url: `${BASE}/cctv/${id}`,
      lastModified: upd ? new Date(upd) : now,
      changeFrequency: "monthly" as const,
      priority: 0.85,
    }));

  return [...staticPages, ...guidePages, ...webzinePages, ...dailyPages, ...cardPages, ...bizPages, ...cctvPages, ...extraCctvPages, ...themeHubPages, ...regionPages, ...foodPages];
}
