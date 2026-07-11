import "server-only";
import { getAdminDb, getAdminApp } from "@/lib/firebase-admin";
import { getStorage } from "firebase-admin/storage";
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

export async function getContentById(id: string): Promise<Content | null> {
  const snap = await getAdminDb().collection(COLLECTION).doc(id).get();
  return snap.exists ? (snap.data() as Content) : null;
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

/** 카드 PNG를 Storage에 저장 (영구 캐시). 발행/백필 시 1회. */
export async function saveCardImage(buffer: Buffer, slug: string, i: number): Promise<string> {
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!bucketName) throw new Error("Storage bucket 미설정");
  const path = `cardnews/${slug}/${String(i).padStart(2, "0")}-${Math.random().toString(36).slice(2, 7)}.png`;
  const token = crypto.randomUUID();
  const file = getStorage(getAdminApp()).bucket(bucketName).file(path);
  await file.save(buffer, {
    metadata: {
      contentType: "image/png",
      cacheControl: "public, max-age=31536000, immutable", // 정적 카드 = 1년 캐시
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

/** 사전 렌더된 카드 URL들을 콘텐츠 문서에 기록 */
export async function setContentCardImages(id: string, cardImages: string[]): Promise<void> {
  await getAdminDb().collection(COLLECTION).doc(id).update({ cardImages });
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
  // type 필터는 메모리에서 처리 (복합 인덱스 불필요). Firestore limit은 여유있게 잡아야 함.
  const fetchLimit = type ? Math.max(limit * 10, 200) : limit;
  const snap = await getAdminDb()
    .collection(COLLECTION)
    .where("status", "==", "published")
    .limit(fetchLimit)
    .get();
  const items = snap.docs.map((d) => d.data() as Content).filter((c) => !type || c.type === type);
  return items
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
    .slice(0, limit);
}
