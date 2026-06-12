import "server-only";
import { generateJSON } from "@/lib/biz/gemini";
import { fetchJejuNewsEnriched, type EnrichedNewsItem } from "@/lib/news-fetch";
import type { Content, ContentSection } from "@/types/content";

/**
 * AI데일리제주 — 매일 아침 제주 관련 뉴스 5~7건을 수집해 헤드라인+2~3문장 핵심 요약+카테고리로 정리.
 *
 * 파이프라인:
 * 1) 네이버 뉴스 검색 → n.news.naver.com 풀텍스트 크롤 (lib/news-fetch)
 * 2) Gemini가 본문 받아 다듬은 헤드라인 + 핵심 요약 작성
 * 3) 매체명·발행시각·원문 링크는 보존, content.sections에 카드 단위로 적재
 */

const SYS = `너는 제주 지역 뉴스를 매일 아침 5분 안에 훑을 수 있게 정리해주는 데일리 에디터 '돌맹이'야.

규칙:
- 제목은 '오늘의 제주 뉴스 N선' 류로 날짜·뉴스 키워드 담아라. 예: "2026년 6월 13일 제주 오늘의 뉴스 7선 — 관광·날씨·정책 한눈에"
- intro는 3~4문장: 오늘 뉴스의 큰 흐름(관광·정책·사건·날씨 중 두드러진 것) 요약. 무리해서 트렌드를 지어내지 말고 실제 헤드라인 분포에 근거하라.
- 각 뉴스 카드:
  - heading: 원래 헤드라인을 다듬어 친근하고 명확하게. 자극적 어그로 금지. 사실 변형 금지.
  - body: 2~3문장. 본문에 적힌 사실에만 근거해 핵심만. 추측·과장·없는 정보 금지.
  - category: "관광·여행", "사회·사건", "정책·행정", "경제·산업", "날씨·환경", "문화·축제", "스포츠", "기타" 중 하나
- keywords: "제주 뉴스", "오늘 제주", 날짜, 주요 키워드 8~12개
- 반드시 유효한 JSON만 반환`;

type BriefingAI = {
  title: string;
  subtitle: string;
  intro: string;
  cards: { sourceIndex: number; heading: string; body: string; category: string }[];
  keywords: string[];
};

function kstNow(): Date {
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

function slugify(): string {
  const d = kstNow();
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  return `daily-${ymd}-${Math.random().toString(36).slice(2, 5)}`;
}

export async function generateBriefingDraft(): Promise<Content> {
  const news = await fetchJejuNewsEnriched(7);
  if (news.length === 0) {
    throw new Error("오늘 가져온 제주 뉴스가 없습니다 (네이버 검색 결과 0건 또는 본문 크롤 실패)");
  }

  const today = kstNow();
  const dateStr = `${today.getUTCFullYear()}년 ${today.getUTCMonth() + 1}월 ${today.getUTCDate()}일`;

  // AI가 참조할 뉴스 리스트 (본문은 1200자로 컷해서 토큰 절약)
  const newsListPrompt = news
    .map((n, i) => `[${i}] [${n.source}] ${n.title}\n발행: ${n.pubDate}\n본문: ${n.body.slice(0, 1200)}`)
    .join("\n\n---\n\n");

  const prompt = `오늘은 ${dateStr}이야. 아래는 오늘 수집한 제주 관련 뉴스 ${news.length}건이다. 본문을 읽고 사실에 근거해서 모닝브리핑 JSON을 만들어라.

${newsListPrompt}

반환 형식 (JSON):
{
  "title": "오늘 날짜+뉴스 키워드 담은 제목",
  "subtitle": "오늘 제주 뉴스 한 줄 요약",
  "intro": "3~4문장: 오늘 뉴스 큰 흐름 요약 (실제 헤드라인 분포 기반)",
  "cards": [
    { "sourceIndex": 0, "heading": "다듬은 헤드라인", "body": "2~3문장 핵심 요약", "category": "관광·여행" }
  ],
  "keywords": ["..."]
}

cards 배열의 sourceIndex는 위 [0], [1], ... 번호와 정확히 일치해야 한다. ${news.length}건 모두 카드로 포함해라.`;

  const ai = await generateJSON<BriefingAI>(SYS, prompt);

  // AI가 만든 카드 → ContentSection 매핑 (sourceIndex로 원본 뉴스와 결합)
  const sections: ContentSection[] = (ai.cards ?? [])
    .map((c): ContentSection | null => {
      const src = news[c.sourceIndex];
      if (!src) return null;
      return {
        heading: c.heading || src.title,
        body: c.body || "",
        sourceUrl: src.link,
        source: src.source,
        newsPublishedAt: src.pubDate,
        category: c.category || "기타",
      };
    })
    .filter((s): s is ContentSection => s !== null);

  // 혹시 AI가 일부 누락했으면 원본으로 폴백
  const includedIdx = new Set(
    (ai.cards ?? []).map((c) => c.sourceIndex)
  );
  news.forEach((n, i) => {
    if (!includedIdx.has(i)) {
      sections.push({
        heading: n.title,
        body: n.description, // 검색 API 미리보기로 폴백
        sourceUrl: n.link,
        source: n.source,
        newsPublishedAt: n.pubDate,
        category: "기타",
      });
    }
  });

  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    type: "briefing",
    status: "draft",
    slug: slugify(),
    title: ai.title || `${dateStr} 제주 오늘의 뉴스 ${news.length}선`,
    subtitle: ai.subtitle || "오늘 제주 주요 뉴스 한눈에",
    intro: ai.intro || "",
    sections,
    keywords: [
      ...(ai.keywords ?? []),
      "제주 뉴스",
      "오늘 제주",
      "제주 오늘",
      "제주 모닝브리핑",
      "AI데일리제주",
    ],
    sourceIds: news.map((n) => n.link),
    createdAt: now,
  };
}

// 외부에서 한 건씩 다시 끌어다 쓸 일이 있을지 몰라 타입 export
export type { EnrichedNewsItem };
