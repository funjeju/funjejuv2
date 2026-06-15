import "server-only";

/**
 * 제주도청 카드뉴스 크롤 — 공공 홍보물(공공누리, 출처표시 시 이용 가능).
 * 서버렌더 HTML 파싱. 사실(제목·이미지·링크)만 가져오고 출처는 제주특별자치도 표기.
 * fetch 캐시(revalidate)로 부담 최소화.
 */

const LIST_URL = "https://www.jeju.go.kr/news/jeunews/card/card.htm";
const ORIGIN = "https://www.jeju.go.kr";

export type GovCardNews = {
  seq: string;
  title: string;
  imageUrl: string;   // 대표 카드 이미지(원본)
  detailUrl: string;  // 제주도청 원문
};

/** 최근 카드뉴스 N건 (기본 12) */
export async function fetchGovCardNews(limit = 12): Promise<GovCardNews[]> {
  try {
    const res = await fetch(LIST_URL, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 3600 }, // 1시간 캐시
    });
    if (!res.ok) return [];
    const html = await res.text();
    // <a ...(/files/board/{uuid}.png)" id="article{seq}" ... data-alt="{title}">
    const re = /(\/files\/board\/[a-f0-9-]+\.(?:png|jpe?g))"\s+id="article(\d+)"[^>]*?data-alt="([^"]*)"/g;
    const out: GovCardNews[] = [];
    const seen = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) && out.length < limit) {
      const [, path, seq, rawTitle] = m;
      if (seen.has(seq)) continue;
      seen.add(seq);
      const title = rawTitle.replace(/&amp;/g, "&").replace(/\?+$/, "").trim();
      if (!title) continue;
      out.push({
        seq,
        title,
        imageUrl: `${ORIGIN}${path}`,
        detailUrl: `${LIST_URL}?act=view&seq=${seq}`,
      });
    }
    return out;
  } catch {
    return [];
  }
}
