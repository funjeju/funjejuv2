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
      // 옛 CCTV 게시판 — 트래픽 확인된 wr_id는 새 전용 페이지로 1:1 매핑(랭킹 승계).
      //  wr_id=53 = "엉또폭포 실시간" → /cctv/ungddo
      {
        source: "/bbs/board.php",
        has: [
          { type: "query", key: "bo_table", value: "cctv" },
          { type: "query", key: "wr_id", value: "53" },
        ],
        destination: "/cctv/ungddo",
        permanent: true,
      },
      //  wr_id=52 = "애월 해안도로 실시간" → /cctv/hagwi (하귀애월해안도로)
      {
        source: "/bbs/board.php",
        has: [
          { type: "query", key: "bo_table", value: "cctv" },
          { type: "query", key: "wr_id", value: "52" },
        ],
        destination: "/cctv/hagwi",
        permanent: true,
      },
      // 그 외 옛 CCTV 게시판 → /cctv 목록 (관련성 높은 301, 403 출혈 차단)
      {
        source: "/bbs/board.php",
        has: [{ type: "query", key: "bo_table", value: "cctv" }],
        destination: "/cctv",
        permanent: true,
      },
      // 옛 여행팁 게시판: /tip/{한글슬러그} → /guide (이용 가이드/여행 정보)
      {
        source: "/tip/:slug*",
        destination: "/guide",
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
      { protocol: "https", hostname: "storage.googleapis.com" }, // 비즈 사진 재호스팅(네이버 이미지검색)
      { protocol: "https", hostname: "api.cdn.visitjeju.net" }, // 비짓제주 적재 맛집 대표사진
    ],
  },
};

export default nextConfig;
