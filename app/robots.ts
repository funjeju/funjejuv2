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
      // GEO — AI 답변/생성 엔진 크롤러 명시 허용 (차단되면 해당 엔진에 인용 자체가 불가)
      // OpenAI(ChatGPT/검색), Anthropic(Claude), Google(Gemini·AI Overviews), Perplexity,
      // Bing(Copilot), Apple, CommonCrawl(다수 LLM 학습), Amazon
      {
        userAgent: [
          "GPTBot",
          "OAI-SearchBot",
          "ChatGPT-User",
          "ClaudeBot",
          "anthropic-ai",
          "Claude-Web",
          "Google-Extended",
          "PerplexityBot",
          "Perplexity-User",
          "Applebot-Extended",
          "Bingbot",
          "CCBot",
          "Amazonbot",
        ],
        allow: "/",
        disallow: ["/admin/", "/api/", "/mypage"],
      },
    ],
    sitemap: "https://funjeju.com/sitemap.xml",
    host: "https://funjeju.com",
  };
}
