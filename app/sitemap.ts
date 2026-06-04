import type { MetadataRoute } from "next";
import { getAllIds } from "@/lib/restaurants";
import { mockCctvs } from "@/constants/mock-cctvs";

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
  ];

  // CCTV 상세 페이지 (40개)
  const cctvPages: MetadataRoute.Sitemap = mockCctvs.map((c) => ({
    url: `${BASE}/cctv/${c.id}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // 도민맛집 상세 페이지 (589개)
  const foodIds = await getAllIds();
  const foodPages: MetadataRoute.Sitemap = foodIds.map((id) => ({
    url: `${BASE}/food/${id}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...cctvPages, ...foodPages];
}
