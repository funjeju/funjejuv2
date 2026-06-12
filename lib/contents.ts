import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import type { Content, ContentType, ContentStatus } from "@/types/content";

/**
 * 콘텐츠 저장소 (Admin SDK, `contents` 컬렉션 — rules 불필요).
 * 크론이 draft 생성 → 어드민이 published로 승인 → 퍼블릭 ISR 렌더.
 */

const COLLECTION = "contents";

export async function createContent(c: Content): Promise<void> {
  await getAdminDb().collection(COLLECTION).doc(c.id).set(c);
}

export async function getContentBySlug(slug: string): Promise<Content | null> {
  const snap = await getAdminDb().collection(COLLECTION).where("slug", "==", slug).limit(1).get();
  return snap.empty ? null : (snap.docs[0].data() as Content);
}

export async function publishContent(id: string): Promise<void> {
  await getAdminDb().collection(COLLECTION).doc(id).update({
    status: "published",
    publishedAt: new Date().toISOString(),
  });
}

export async function deleteContent(id: string): Promise<void> {
  await getAdminDb().collection(COLLECTION).doc(id).delete();
}

/** 어드민 목록 (status 필터, 최신순) — 복합 인덱스 회피 위해 메모리 정렬 */
export async function listContents(opts?: {
  status?: ContentStatus;
  type?: ContentType;
  limit?: number;
}): Promise<Content[]> {
  let q = getAdminDb().collection(COLLECTION) as FirebaseFirestore.Query;
  if (opts?.status) q = q.where("status", "==", opts.status);
  if (opts?.type) q = q.where("type", "==", opts.type);
  const snap = await q.limit(opts?.limit ?? 200).get();
  return snap.docs
    .map((d) => d.data() as Content)
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

/** 특정 맛집이 소개된 발행 웹진 (맛집→웹진 역링크 — 트랙 C 양방향) */
export async function findWebzinesByRestaurant(restaurantId: string, limit = 3): Promise<Content[]> {
  const all = await listPublished("webzine", 200);
  return all.filter((c) => c.sourceIds.includes(restaurantId)).slice(0, limit);
}

/** 퍼블릭 — 발행된 것만 (sitemap/목록용) */
export async function listPublished(type?: ContentType, limit = 100): Promise<Content[]> {
  const snap = await getAdminDb()
    .collection(COLLECTION)
    .where("status", "==", "published")
    .limit(limit)
    .get();
  const items = snap.docs.map((d) => d.data() as Content).filter((c) => !type || c.type === type);
  return items.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
}
