import "server-only";

/**
 * 제주도청 보도자료 크롤 — 공공누리 공식 자료(출처표시 이용).
 * 목록(server HTML) → 상세 og:description(본문)에서 요약 추출. 모닝브리핑 보조 소스.
 */

const LIST = "https://www.jeju.go.kr/news/bodo/list.htm";

export type GovPress = {
  seq: string;
  title: string;
  body: string;       // 정제된 본문 요약
  link: string;       // 제주도청 원문
};

function decode(s: string): string {
  return s
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")   // 인코딩된 태그를 실제 태그로
    .replace(/<[^>]+>/g, " ")                        // 그 다음 태그 제거
    .replace(/&quot;/g, '"').replace(/&middot;/g, "·")
    .replace(/&lsquo;|&rsquo;/g, "'").replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/[❑□▣◦○]/g, " ")                       // 보도자료 머리표 기호 정리
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/\s+/g, " ").trim();
}

/** 최근 보도자료 N건 (본문 요약 포함) */
export async function fetchGovPressReleases(limit = 5): Promise<GovPress[]> {
  try {
    const listHtml = await (await fetch(LIST, { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 1800 } })).text();
    const re = /href="\/news\/bodo\/list\.htm\?act=view&amp;seq=(\d+)">\s*<strong class="text-ellipsis">\s*([^<]+?)\s*</g;
    const heads: { seq: string; title: string }[] = [];
    const seen = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = re.exec(listHtml)) && heads.length < limit) {
      const seq = m[1];
      if (seen.has(seq)) continue;
      seen.add(seq);
      heads.push({ seq, title: decode(m[2]) });
    }

    const out: GovPress[] = [];
    for (const h of heads) {
      const link = `${LIST}?act=view&seq=${h.seq}`;
      try {
        const detail = await (await fetch(link, { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 1800 } })).text();
        const og = detail.match(/property=["']og:description["'][^>]*content=["']([\s\S]*?)["']\s*\/?>/i);
        const body = og ? decode(og[1]).slice(0, 400) : "";
        out.push({ seq: h.seq, title: h.title, body, link });
      } catch {
        out.push({ seq: h.seq, title: h.title, body: "", link });
      }
    }
    return out;
  } catch {
    return [];
  }
}
