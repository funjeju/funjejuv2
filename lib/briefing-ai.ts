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

const SYS = `너는 제주 여행자·제주 도민을 위한 모닝브리핑 에디터 '돌맹이'야.
매일 아침 9시 20분에 발행되는 브리핑이라, 오늘 제주를 여행하거나 제주에 사는 사람에게 실제로 도움되는 정보를 우선한다.

편집 우선순위 (위쪽일수록 중요):
1. 여행·관광 정보 — 새로 생긴 명소, 추천 코스, 여행 꿀팁
2. 맛집·카페 — 신규 오픈, 도민 추천, 유명 셰프·맛집 이야기
3. 지역 행사·축제 — 이번 주/이달 열리는 페스티벌, 전시, 공연
4. 연예인·인플루언서 제주 방문 — 촬영지, SNS 인증, 드라마 로케이션
5. 교통·날씨 — 날씨는 기상청 또는 권위있는 매체 1건만 포함. 항공·선박 결항 정보
6. 정책·행정·사건 — 관광객/도민 생활에 직접 영향 있는 것만

규칙:
- 제목은 관광·여행·맛집 등 핵심 키워드 담아라. 예: "2026년 6월 13일 제주 모닝브리핑 — 여름 성수기 신맛집·축제 총정리"
- intro는 3~4문장: 오늘 제주의 여행·생활 큰 흐름 요약.
- 날씨 카드: 반드시 1건만. 나머지는 제외. 기상청·YTN·연합뉴스 출처 우선.
- 각 카드:
  - heading: 친근하고 명확하게 다듬어라. 자극적 어그로 금지. 사실 변형 금지.
  - body: 2~3문장. 본문 사실에만 근거. 추측·과장·없는 정보 금지.
  - category: "관광·여행", "맛집·카페", "행사·축제", "연예·문화", "날씨·교통", "정책·행정", "기타" 중 하나
- 전체 카드 수: 최소 6개, 최대 9개. 날씨는 1개 이하.
- keywords: 여행·맛집·행사 관련 키워드 위주, 날짜 포함, 8~12개
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
  const news = await fetchJejuNewsEnriched(10);
  if (news.length === 0) {
    throw new Error("오늘 가져온 제주 뉴스가 없습니다 (네이버 검색 결과 0건 또는 본문 크롤 실패)");
  }

  const today = kstNow();
  const dateStr = `${today.getUTCFullYear()}년 ${today.getUTCMonth() + 1}월 ${today.getUTCDate()}일`;

  // AI가 참조할 뉴스 리스트 (본문은 1200자로 컷해서 토큰 절약)
  const newsListPrompt = news
    .map((n, i) => `[${i}] [${n.source}] ${n.title}\n발행: ${n.pubDate}\n본문: ${n.body.slice(0, 1200)}`)
    .join("\n\n---\n\n");

  const prompt = `오늘은 ${dateStr} 오전 9시 20분 모닝브리핑이야. 아래는 오늘 수집한 제주 관련 뉴스 ${news.length}건이다. 본문을 읽고 사실에 근거해서 모닝브리핑 JSON을 만들어라.

편집 지침:
- 날씨 관련 뉴스는 가장 권위있는 매체(기상청·연합뉴스·YTN 우선) 1건만 카드로 만들고 나머지 날씨 기사는 제외해라.
- 여행·맛집·행사·연예인 제주 방문 내용을 우선 선정해라.
- 중복되거나 너무 작은 지역 민원성 뉴스는 제외해도 된다.
- 최종 카드: 6~9개

${newsListPrompt}

반환 형식 (JSON):
{
  "title": "날짜+여행·맛집·행사 키워드 담은 제목",
  "subtitle": "오늘 제주 브리핑 한 줄 요약",
  "intro": "3~4문장: 오늘 제주 여행·생활 큰 흐름 요약",
  "cards": [
    { "sourceIndex": 0, "heading": "다듬은 헤드라인", "body": "2~3문장 핵심 요약", "category": "관광·여행" }
  ],
  "keywords": ["..."]
}

cards의 sourceIndex는 위 [0], [1], ... 번호와 일치해야 한다. 선정한 기사만 카드로 만들어라(전부 포함 불필요).`;

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
