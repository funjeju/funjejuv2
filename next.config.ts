import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

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
  },
};

export default nextConfig;
