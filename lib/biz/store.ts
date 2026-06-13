import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import type { SiteSchema } from "./types";

/**
 * 비즈 홈페이지 저장소 (Admin SDK)
 *
 * 컬렉션 `biz_sites` — 문서 ID = siteId(=slug).
 * Admin SDK라 firestore.rules 의존성 없음 (jejutube_videos와 동일 패턴).
 */

const COLLECTION = "biz_sites";

export async function saveSite(site: SiteSchema): Promise<void> {
  const db = getAdminDb();
  await db.collection(COLLECTION).doc(site.siteId).set(site, { merge: true });
}

export async function getSite(slug: string): Promise<SiteSchema | null> {
  const db = getAdminDb();

  // 한글 슬러그는 NFC/NFD 정규화가 경로/문서ID 간 다를 수 있어 변형을 모두 시도한다.
  const variants = Array.from(
    new Set([slug, slug.normalize("NFC"), slug.normalize("NFD")])
  );

  // 1) 문서 ID로 조회 (정규화 변형들)
  for (const v of variants) {
    const snap = await db.collection(COLLECTION).doc(v).get();
    if (snap.exists) return snap.data() as SiteSchema;
  }

  // 2) slug 필드로 폴백 조회 (문서ID와 정규화가 어긋난 경우 대비)
  for (const v of variants) {
    const q = await db.collection(COLLECTION).where("slug", "==", v).limit(1).get();
    if (!q.empty) return q.docs[0].data() as SiteSchema;
  }

  return null;
}

export async function listSitesByOwner(ownerId: string): Promise<SiteSchema[]> {
  const db = getAdminDb();
  const snap = await db.collection(COLLECTION).where("ownerId", "==", ownerId).get();
  return snap.docs.map((d) => d.data() as SiteSchema);
}

/** 발행된 사이트만 — sitemap/SEO 용 */
export async function listPublishedSites(): Promise<SiteSchema[]> {
  const db = getAdminDb();
  const snap = await db.collection(COLLECTION).where("published", "==", true).get();
  return snap.docs.map((d) => d.data() as SiteSchema);
}

export async function setPublished(slug: string, published: boolean): Promise<void> {
  const db = getAdminDb();
  await db.collection(COLLECTION).doc(slug).update({
    published,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteSite(slug: string): Promise<void> {
  await getAdminDb().collection(COLLECTION).doc(slug).delete();
}

/** 부분 수정 — merchantInfo·ctaButtons 등 허용 필드만 병합 */
export async function updateSite(slug: string, patch: Partial<SiteSchema>): Promise<void> {
  await getAdminDb().collection(COLLECTION).doc(slug).set(
    { ...patch, updatedAt: new Date().toISOString() },
    { merge: true }
  );
}
