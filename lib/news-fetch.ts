import "server-only";

/**
 * 모닝브리핑용 뉴스 수집 파이프라인.
 *
 * 1) 네이버 뉴스 검색 API로 "제주" 키워드 후보 수집
 * 2) n.news.naver.com 도메인(네이버뉴스 통합)만 추려 본문 풀텍스트 크롤
 * 3) 매체명·발행시각·본문 함께 반환
 *
 * 네이버뉴스 본문은 #dic_area selector로 통일돼있어 정규식만으로 안정 추출 가능.
 * cheerio 같은 파서 의존성 없이 동작.
 */

export type NaverNewsItem = {
  title: string;           // 검색 API의 미리보기 제목 (HTML 태그 제거됨)
  description: string;     // 검색 API 미리보기 (2~3줄)
  link: string;            // n.news.naver.com/... 원문
  pubDate: string;         // RFC822 → ISO 변환
};

export type EnrichedNewsItem = NaverNewsItem & {
  body: string;            // 본문 풀텍스트 (크롤로 받아온 것)
  source: string;          // 매체명 (예: "연합뉴스")
};

const NAVER_SEARCH = "https://openapi.naver.com/v1/search/news.json";

function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

type NaverSearchItem = { title: string; description: string; link: string; originallink: string; pubDate: string };

async function searchKeyword(id: string, secret: string, query: string, display = 10): Promise<NaverNewsItem[]> {
  const url = `${NAVER_SEARCH}?query=${encodeURIComponent(query)}&display=${display}&sort=date`;
  try {
    const res = await fetch(url, {
      headers: { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": secret },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: NaverSearchItem[] };
    return (data.items ?? []).map((it) => ({
      title: stripTags(it.title),
      description: stripTags(it.description),
      link: it.link,
      pubDate: new Date(it.pubDate).toISOString(),
    }));
  } catch {
    return [];
  }
}

/**
 * 모닝브리핑용 다목적 뉴스 수집.
 * 날씨 1건 + 여행·맛집·행사·연예인 위주 키워드별로 수집해 합산.
 */
export async function searchJejuNews(display = 20): Promise<NaverNewsItem[]> {
  const id = process.env.NAVER_CLIENT_ID;
  const secret = process.env.NAVER_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error("NAVER_CLIENT_ID/SECRET 환경변수가 설정되어 있지 않습니다.");
  }

  // 키워드별 병렬 검색
  const [weather, travel, event, food, celebrity, local] = await Promise.all([
    searchKeyword(id, secret, "제주 날씨", 3),           // 날씨는 3건만 (1건으로 추림)
    searchKeyword(id, secret, "제주 여행 추천", 8),
    searchKeyword(id, secret, "제주 축제 행사", 8),
    searchKeyword(id, secret, "제주 맛집", 8),
    searchKeyword(id, secret, "제주 연예인 촬영", 6),
    searchKeyword(id, secret, "제주 관광", 8),
  ]);

  // 날씨 1건만 (가장 최신), 나머지 키워드 합산 후 중복 제거
  const weatherOne = weather.slice(0, 1);
  const rest = [...travel, ...event, ...food, ...celebrity, ...local];

  const seen = new Set<string>(weatherOne.map((n) => n.title.replace(/\s/g, "")));
  const deduped: NaverNewsItem[] = [...weatherOne];
  for (const it of rest) {
    const key = it.title.replace(/\s/g, "");
    if (!seen.has(key)) { seen.add(key); deduped.push(it); }
  }

  return deduped.slice(0, display);
}

/** n.news.naver.com 본문 크롤 + 매체명 추출 */
async function fetchNaverNewsArticle(link: string): Promise<{ body: string; source: string } | null> {
  try {
    const res = await fetch(link, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    // 본문: <article id="dic_area" ...> ... </article>  또는 <div id="dic_area" ...> ... </div>
    const m = html.match(/<(article|div)[^>]*id=["']dic_area["'][^>]*>([\s\S]*?)<\/\1>/);
    if (!m) return null;

    const body = stripTags(
      m[2]
        .replace(/<script[\s\S]*?<\/script>/g, "")
        .replace(/<style[\s\S]*?<\/style>/g, "")
        .replace(/<br\s*\/?>/gi, "\n")
    ).slice(0, 4000); // 너무 길면 컷

    if (body.length < 200) return null; // 본문 너무 짧으면 버림

    // 매체명: <meta property="og:article:author"> 또는 <a class="media_end_head_top_logo"><img alt="매체명">
    const ogAuthor = html.match(/<meta\s+property=["']og:article:author["']\s+content=["']([^"']+)["']/i);
    const ogSite = html.match(/<meta\s+property=["']og:site_name["']\s+content=["']([^"']+)["']/i);
    const logoAlt = html.match(/class=["'][^"']*media_end_head_top_logo[^"']*["'][\s\S]{0,300}?alt=["']([^"']+)["']/);
    const source =
      (ogAuthor && stripTags(ogAuthor[1])) ||
      (logoAlt && stripTags(logoAlt[1])) ||
      (ogSite && stripTags(ogSite[1])) ||
      "네이버뉴스";

    return { body, source };
  } catch {
    return null;
  }
}

/**
 * 검색 결과에서 네이버뉴스 통합 링크만 추려 본문 크롤.
 * - 비제주/광고성/너무 짧은 글은 자동 배제
 * - 병렬 fetch (Naver 측 부하 고려해 동시 5 limit)
 */
export async function fetchJejuNewsEnriched(target = 7): Promise<EnrichedNewsItem[]> {
  const candidates = await searchJejuNews(25);

  // 네이버뉴스 도메인만, 중복 제거
  const seen = new Set<string>();
  const naverOnly = candidates.filter((it) => {
    if (!/^https?:\/\/n\.news\.naver\.com\//.test(it.link)) return false;
    const key = it.title.replace(/\s/g, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const out: EnrichedNewsItem[] = [];
  // 동시 5씩 처리
  for (let i = 0; i < naverOnly.length && out.length < target; i += 5) {
    const batch = naverOnly.slice(i, i + 5);
    const enriched = await Promise.all(
      batch.map(async (it) => {
        const article = await fetchNaverNewsArticle(it.link);
        if (!article) return null;
        // 제주 관련성 한 번 더 체크 (검색에 잡혔지만 본문은 안 다룰 수도)
        if (!/제주/.test(article.body.slice(0, 800))) return null;
        return { ...it, body: article.body, source: article.source } as EnrichedNewsItem;
      })
    );
    for (const e of enriched) {
      if (e && out.length < target) out.push(e);
    }
  }
  return out;
}
