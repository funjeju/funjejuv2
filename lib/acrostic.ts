import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { AcrosticTopic, AcrosticEntry } from "@/types/acrostic";

const TOPICS = "acrostic_topics";
const ENTRIES = "acrostic_entries";
const LIKES = "acrostic_likes";

// ── 주제(Topic) ──────────────────────────────────────────
export async function createTopic(t: AcrosticTopic): Promise<void> {
  await getAdminDb().collection(TOPICS).doc(t.id).set(t);
}

export async function updateTopic(
  id: string,
  updates: Partial<Pick<AcrosticTopic, "word" | "businessName" | "homepageUrl" | "homepageName" | "image" | "maxEntriesPerUser" | "endsAt">>
): Promise<void> {
  await getAdminDb().collection(TOPICS).doc(id).update(updates);
}

export async function setTopicPublished(id: string, published: boolean): Promise<void> {
  await getAdminDb().collection(TOPICS).doc(id).update({ status: published ? "published" : "draft" });
}

export async function deleteTopic(id: string): Promise<void> {
  await getAdminDb().collection(TOPICS).doc(id).delete();
}

export async function getTopic(id: string): Promise<AcrosticTopic | null> {
  const snap = await getAdminDb().collection(TOPICS).doc(id).get();
  return snap.exists ? (snap.data() as AcrosticTopic) : null;
}

export async function listTopics(opts?: { publishedOnly?: boolean }): Promise<AcrosticTopic[]> {
  const snap = await getAdminDb().collection(TOPICS).orderBy("createdAt", "desc").limit(100).get();
  let items = snap.docs.map((d) => d.data() as AcrosticTopic);
  if (opts?.publishedOnly) items = items.filter((t) => t.status === "published");
  return items;
}

// ── 엔트리(Entry) ────────────────────────────────────────
export async function listEntries(topicId: string): Promise<AcrosticEntry[]> {
  const snap = await getAdminDb().collection(ENTRIES).where("topicId", "==", topicId).limit(500).get();
  return snap.docs
    .map((d) => d.data() as AcrosticEntry)
    .sort((a, b) => b.likes - a.likes || a.createdAt - b.createdAt); // 좋아요순, 동률은 먼저 쓴 순
}

export async function countUserEntries(topicId: string, userId: string): Promise<number> {
  const snap = await getAdminDb().collection(ENTRIES).where("topicId", "==", topicId).where("userId", "==", userId).get();
  return snap.size;
}

export async function addEntry(e: AcrosticEntry): Promise<void> {
  const db = getAdminDb();
  await db.collection(ENTRIES).doc(e.id).set(e);
  await db.collection(TOPICS).doc(e.topicId).update({ entryCount: FieldValue.increment(1) }).catch(() => {});
}

/** 본인 엔트리만 수정 (userId 일치 검사) */
export async function editEntry(entryId: string, userId: string, lines: string[]): Promise<boolean> {
  const ref = getAdminDb().collection(ENTRIES).doc(entryId);
  const snap = await ref.get();
  if (!snap.exists || (snap.data() as AcrosticEntry).userId !== userId) return false;
  await ref.update({ lines, updatedAt: Date.now() });
  return true;
}

export async function deleteEntry(entryId: string, userId: string): Promise<boolean> {
  const ref = getAdminDb().collection(ENTRIES).doc(entryId);
  const snap = await ref.get();
  if (!snap.exists) return false;
  const e = snap.data() as AcrosticEntry;
  if (e.userId !== userId) return false;
  await ref.delete();
  await getAdminDb().collection(TOPICS).doc(e.topicId).update({ entryCount: FieldValue.increment(-1) }).catch(() => {});
  return true;
}

/** 좋아요 토글 — 1인 1엔트리 1표. 반환: 적용 후 likes 수 + 좋아요 여부 */
export async function toggleLike(entryId: string, userId: string): Promise<{ likes: number; liked: boolean } | null> {
  const db = getAdminDb();
  const entryRef = db.collection(ENTRIES).doc(entryId);
  const likeRef = db.collection(LIKES).doc(`${entryId}__${userId}`);
  return db.runTransaction(async (tx) => {
    const [entrySnap, likeSnap] = await Promise.all([tx.get(entryRef), tx.get(likeRef)]);
    if (!entrySnap.exists) return null;
    const cur = (entrySnap.data() as AcrosticEntry).likes ?? 0;
    if (likeSnap.exists) {
      tx.delete(likeRef);
      tx.update(entryRef, { likes: Math.max(0, cur - 1) });
      return { likes: Math.max(0, cur - 1), liked: false };
    }
    tx.set(likeRef, { entryId, userId, createdAt: Date.now() });
    tx.update(entryRef, { likes: cur + 1 });
    return { likes: cur + 1, liked: true };
  });
}

/** 유저가 이미 좋아요한 엔트리 id 목록 (해당 주제 내) */
export async function likedEntryIds(topicId: string, userId: string): Promise<string[]> {
  const entries = await getAdminDb().collection(ENTRIES).where("topicId", "==", topicId).get();
  const ids = entries.docs.map((d) => d.id);
  if (!ids.length) return [];
  const likeSnaps = await getAdminDb().getAll(...ids.map((id) => getAdminDb().collection(LIKES).doc(`${id}__${userId}`)));
  return likeSnaps.filter((s) => s.exists).map((s) => (s.data() as { entryId: string }).entryId);
}
