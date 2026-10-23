import type { MetadataRoute } from "next";
import { mockCctvs } from "@/constants/mock-cctvs";
export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/cctv", "/cctv/multiview", ...mockCctvs.map(c => `/cctv/${c.id}`)].map(path => ({url:`https://funjeju.com${path}`}));
}
