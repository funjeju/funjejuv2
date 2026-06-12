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
  const snap = await db.collection(COLLECTION).doc(slug).get();
  return snap.exists ? (snap.data() as SiteSchema) : null;
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
