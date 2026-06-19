import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/mypage",
          "/_next/",
        ],
      },
      // 네이버 검색 우대
      {
        userAgent: "Yeti",
        allow: "/",
        disallow: ["/admin/", "/api/", "/mypage"],
      },
    ],
    sitemap: "https://www.funjeju.com/sitemap.xml",
    host: "https://www.funjeju.com",
  };
}
