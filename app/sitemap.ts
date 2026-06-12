import type { MetadataRoute } from "next";
import { getAllIds } from "@/lib/restaurants";
import { mockCctvs } from "@/constants/mock-cctvs";
import { GUIDE_SLUGS } from "@/lib/guides";
import { listPublished } from "@/lib/contents";

const BASE = "https://funjeju.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // 정적 페이지
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE}/cctv`, lastModified: now, changeFrequency: "always", priority: 0.9 },
    { url: `${BASE}/food`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/feed`, lastModified: now, changeFrequency: "hourly", priority: 0.7 },
    { url: `${BASE}/chat`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/youtube`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE}/trip-ai`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/saved`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/search`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/guide`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/webzine`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
  ];

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

  // CCTV 상세 페이지 (40개)
  const cctvPages: MetadataRoute.Sitemap = mockCctvs.map((c) => ({
    url: `${BASE}/cctv/${c.id}`,
    lastModified: now,
    changeFrequency: "always" as const, // 실시간 영상이라 변동 큼
    priority: 0.8,
  }));

  // 지역별 허브 페이지
  const regions = [...new Set(mockCctvs.map((c) => c.region))];
  const regionPages: MetadataRoute.Sitemap = regions.map((region) => ({
    url: `${BASE}/cctv/region/${encodeURIComponent(region)}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.75,
  }));

  // 도민맛집 상세 페이지 (589개)
  const foodIds = await getAllIds();
  const foodPages: MetadataRoute.Sitemap = foodIds.map((id) => ({
    url: `${BASE}/food/${id}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...guidePages, ...cctvPages, ...regionPages, ...foodPages];
}
