import "server-only";
import { getStorage } from "firebase-admin/storage";
import { getAdminApp } from "@/lib/firebase-admin";

/**
 * 비즈 홈페이지 생성 시 업체 사진을 베스트에포트로 확보.
 * - 네이버 공식 이미지검색 API로 후보 수집(스크래핑 X, 약관 안전)
 * - 외부 이미지는 핫링크/만료 위험이 있어 우리 스토리지에 재호스팅
 * 실패해도 생성은 계속(빈 배열 반환).
 */

const NAVER_IMG = "https://openapi.naver.com/v1/search/image.json";
const BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

async function searchNaverImages(query: string, count: number): Promise<string[]> {
  const id = process.env.NAVER_CLIENT_ID;
  const secret = process.env.NAVER_CLIENT_SECRET;
  if (!id || !secret) return [];
  try {
    const url = `${NAVER_IMG}?query=${encodeURIComponent(query)}&display=${Math.min(30, count * 3)}&sort=sim&filter=large`;
    const r = await fetch(url, {
      headers: { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": secret },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return [];
    const d = (await r.json()) as { items?: Array<{ link?: string }> };
    return (d.items ?? [])
      .map((it) => it.link ?? "")
      .filter((l) => /^https?:\/\//.test(l));
  } catch {
    return [];
  }
}

async function rehostImage(srcUrl: string, destPath: string): Promise<string | null> {
  if (!BUCKET) return null;
  try {
    const r = await fetch(srcUrl, {
      headers: { "User-Agent": "Mozilla/5.0", Referer: "https://search.naver.com/" },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    const ct = r.headers.get("content-type") ?? "image/jpeg";
    if (!ct.startsWith("image/")) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 3000 || buf.length > 8 * 1024 * 1024) return null; // 너무 작거나 큰 건 스킵
    const file = getStorage(getAdminApp()).bucket(BUCKET).file(destPath);
    await file.save(buf, {
      contentType: ct,
      public: true,
      metadata: { cacheControl: "public, max-age=604800" },
    });
    return `https://storage.googleapis.com/${BUCKET}/${destPath}`;
  } catch {
    return null;
  }
}

/** 업체명+지역으로 사진 N장 확보(우리 스토리지 URL). 실패 시 빈 배열. */
export async function fetchBizPhotos(
  businessName: string,
  region: string,
  siteId: string,
  count = 6,
): Promise<string[]> {
  const links = await searchNaverImages(`${businessName} ${region}`.trim(), count + 6);
  const out: string[] = [];
  for (const link of links) {
    if (out.length >= count) break;
    const url = await rehostImage(link, `biz/${siteId}/photo-${out.length}-${Date.now()}.jpg`);
    if (url) out.push(url);
  }
  return out;
}
