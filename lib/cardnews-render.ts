import "server-only";
import { saveCardImage, setContentCardImages } from "@/lib/contents";
import type { Content } from "@/types/content";

/**
 * 카드뉴스 사전 렌더 → Storage 저장.
 * og 라우트(/api/og/cardnews)로 카드 N장을 "한 번만" 렌더해 PNG로 받아 Storage에 저장하고,
 * URL들을 콘텐츠 문서(cardImages)에 기록한다. 이후 뷰어는 정적 URL을 CDN에서 즉시 로드
 * → 조회 때마다의 Firestore 읽기·폰트 4.7MB·satori 래스터가 전부 사라진다.
 *
 * 발행 크론(app/api/cron/cardnews)과 백필 라우트(app/api/admin/cardnews/render)에서 호출.
 */
export async function renderAndStoreCards(origin: string, content: Content): Promise<string[]> {
  const total = 1 + (content.sections?.length ?? 0) + 1; // 표지 + 본문 + CTA
  const urls: string[] = [];
  for (let i = 0; i < total; i++) {
    const res = await fetch(
      `${origin}/api/og/cardnews?slug=${encodeURIComponent(content.slug)}&i=${i}`,
      { signal: AbortSignal.timeout(30000) }
    );
    if (!res.ok) throw new Error(`카드 ${i} 렌더 실패 (${res.status})`);
    const buf = Buffer.from(await res.arrayBuffer());
    urls.push(await saveCardImage(buf, content.slug, i));
  }
  await setContentCardImages(content.id, urls);
  return urls;
}
