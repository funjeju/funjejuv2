import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // 비즈 홈페이지(/biz/*)는 캐시 금지 — 생성 직후 옛 404가 브라우저/엣지에 박히는 문제 방지
  async headers() {
    return [
      {
        source: "/biz/:slug*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0, must-revalidate" },
          { key: "CDN-Cache-Control", value: "no-store" },
          { key: "Vercel-CDN-Cache-Control", value: "no-store" },
        ],
      },
    ];
  },

  // 그누보드 → Next.js URL 301 리다이렉트
  async redirects() {
    return [
      // 도민맛집: /bbs/board.php?bo_table=food&wr_id=N → /food/N
      {
        source: "/bbs/board.php",
        has: [
          { type: "query", key: "bo_table", value: "food" },
          { type: "query", key: "wr_id", value: "(?<id>\\d+)" },
        ],
        destination: "/food/:id",
        permanent: true, // 301
      },
      // 페이지 보기 형식: /bbs/board.php?bo_table=food
      {
        source: "/bbs/board.php",
        has: [{ type: "query", key: "bo_table", value: "food" }],
        destination: "/food",
        permanent: true,
      },
    ];
  },

  // 이미지 최적화 설정
  images: {
    formats: ["image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 1주
    // Firestore 신규 맛집 썸네일 (Firebase Storage)
    remotePatterns: [
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
    ],
  },
};

export default nextConfig;
