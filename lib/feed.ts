"use client";

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  updateDoc,
  increment,
  onSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getStorage } from "firebase/storage";
import { getFirebaseDb } from "@/lib/firebase";
import { getApps } from "firebase/app";
import type { Feed, FeedAuthor, ExifData, FeedFilter } from "@/types/feed";

function getFirebaseStorage() {
  const app = getApps()[0];
  if (!app) throw new Error("Firebase not initialized");
  return getStorage(app);
}

/** 이미지 업로드 → Storage URL 반환 */
export async function uploadFeedImage(uid: string, file: File): Promise<string> {
  const storage = getFirebaseStorage();
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `feeds/${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file, { contentType: file.type });
  return await getDownloadURL(fileRef);
}

/** 피드 생성 */
export async function createFeed(input: {
  authorId: string;
  authorName: string;
  authorPhoto: string | null;
  imageUrl: string;
  exif: ExifData;
  aiCopy: string;
  filter: FeedFilter;
  category: string;
  regionId?: string;
  regionName?: string;
  regionCity?: "제주시" | "서귀포시";
  gps?: { lat: number; lng: number };
}): Promise<string> {
  const db = getFirebaseDb();
  const id = `feed_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const ref = doc(db, "feeds", id);

  // undefined 필드 제거 (Firestore 에러 방지)
  const cleanInput = Object.fromEntries(
    Object.entries(input).filter(([, v]) => v !== undefined)
  );

  await setDoc(ref, {
    ...cleanInput,
    createdAt: serverTimestamp(),
    likes: 0,
  });
  return id;
}

/** 피드 목록 (최신순, 실시간 구독) */
export function subscribeFeeds(
  callback: (feeds: Feed[]) => void,
  onError?: (err: Error) => void,
  max = 50
) {
  const db = getFirebaseDb();
  const q = query(collection(db, "feeds"), orderBy("createdAt", "desc"), limit(max));
  return onSnapshot(
    q,
    (snap) => {
      const feeds = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Feed, "id">) }));
      callback(feeds);
    },
    (err) => {
      console.error("[subscribeFeeds]", err);
      onError?.(err);
    }
  );
}

/** 일회성 조회 (홈 페이지용) */
export async function fetchFeeds(max = 12): Promise<Feed[]> {
  const db = getFirebaseDb();
  const q = query(collection(db, "feeds"), orderBy("createdAt", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Feed, "id">) }));
}

/** 작성자 프로필 정보 (비즈니스 여부, CTA 포함) */
export async function getAuthor(uid: string): Promise<FeedAuthor | null> {
  const db = getFirebaseDb();
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as DocumentData;
  return {
    uid,
    displayName: data.displayName ?? "",
    photoURL: data.photoURL ?? null,
    isBusiness: !!data.isBusiness,
    ctaData: data.ctaData,
  };
}

/** 사용자 프로필 저장 (마이페이지에서 호출) */
export async function updateUserProfile(
  uid: string,
  data: { displayName?: string; photoURL?: string | null; ctaData?: FeedAuthor["ctaData"] }
): Promise<void> {
  const db = getFirebaseDb();
  const ref = doc(db, "users", uid);
  await setDoc(ref, data, { merge: true });
}

/** 피드 삭제 (본인 또는 어드민) */
export async function deleteFeed(feedId: string): Promise<void> {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, "feeds", feedId));
}

/** 좋아요 증가 */
export async function likeFeed(feedId: string): Promise<void> {
  const db = getFirebaseDb();
  await updateDoc(doc(db, "feeds", feedId), { likes: increment(1) });
}

/** 어드민 — 비즈니스 권한 토글 */
export async function toggleBusiness(uid: string, isBusiness: boolean): Promise<void> {
  const db = getFirebaseDb();
  const ref = doc(db, "users", uid);
  await setDoc(
    ref,
    {
      isBusiness,
      businessVerifiedAt: isBusiness ? Timestamp.now() : null,
    },
    { merge: true }
  );
}
