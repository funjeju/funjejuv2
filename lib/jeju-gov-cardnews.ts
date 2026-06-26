import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";

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
  thumbUrl: string;   // 썸네일(목록 표시용·가벼움)
  imageUrl: string;   // 대표 카드 이미지(원본)
  detailUrl: string;  // 제주도청 원문
};

// 마지막 성공분 캐시 — 운영(Vercel)에서 jeju.go.kr 차단/타임아웃 시 섹션이 사라지지 않게 폴백
const CACHE = ["app_config", "gov_cardnews_cache"] as const;
async function readGovCache(): Promise<GovCardNews[]> {
  try {
    const s = await getAdminDb().collection(CACHE[0]).doc(CACHE[1]).get();
    return (s.exists ? (s.data()?.cards as GovCardNews[]) : []) ?? [];
  } catch { return []; }
}
async function writeGovCache(cards: GovCardNews[]): Promise<void> {
  try { await getAdminDb().collection(CACHE[0]).doc(CACHE[1]).set({ cards, at: Date.now() }); } catch { /* noop */ }
}

/** 최근 카드뉴스 N건 (기본 12). 실패 시 마지막 성공분(캐시) 폴백. */
export async function fetchGovCardNews(limit = 12): Promise<GovCardNews[]> {
  try {
    const res = await fetch(LIST_URL, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 3600 }, // 1시간 캐시
    });
    if (!res.ok) return readGovCache();
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
      const thumb = path.replace(/\/files\/board\//, "/files/board/thumb-");
      out.push({
        seq,
        title,
        thumbUrl: `${ORIGIN}${thumb}`,
        imageUrl: `${ORIGIN}${path}`,
        detailUrl: `${LIST_URL}?act=view&seq=${seq}`,
      });
    }
    if (out.length > 0) { await writeGovCache(out); return out; } // 성공 → 캐시 갱신
    return readGovCache(); // 파싱 0건(HTML 변경 등) → 캐시 폴백
  } catch {
    return readGovCache(); // 네트워크 실패(차단·타임아웃) → 캐시 폴백
  }
}
