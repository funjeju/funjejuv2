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

/**
 * 업로드용 리사이즈 — 비율 유지(왜곡 없음) + 다단계로 1MB 이하 맞춤.
 * ① 긴 변 1920px로 비율 유지 축소 → ② 품질 0.9→0.5 단계 하향 → ③ 그래도 크면 치수 추가 축소.
 * 이미 1MB 이하 원본은 재압축 없이 그대로 반환.
 */
export async function resizeImageForUpload(file: File): Promise<Blob> {
  const TARGET = 1024 * 1024; // 1MB
  const MAX_EDGE = 1920;
  if (file.size <= TARGET) return file; // 작은 원본은 그대로 (화질 보존)

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new window.Image();
    const u = URL.createObjectURL(file);
    el.onload = () => { URL.revokeObjectURL(u); resolve(el); };
    el.onerror = () => { URL.revokeObjectURL(u); reject(new Error("image load")); };
    el.src = u;
  });

  let w = img.naturalWidth, h = img.naturalHeight;
  const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
  w = Math.round(w * scale); h = Math.round(h * scale);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  const draw = (cw: number, ch: number) => { canvas.width = cw; canvas.height = ch; ctx.drawImage(img, 0, 0, cw, ch); };
  const toBlob = (q: number) => new Promise<Blob>((res) => canvas.toBlob((b) => res(b ?? file), "image/jpeg", q));

  draw(w, h);
  let q = 0.9;
  let blob = await toBlob(q);
  while (blob.size > TARGET && q > 0.5) { q -= 0.1; blob = await toBlob(q); }
  // 그래도 크면 치수를 단계적으로 더 줄임 (비율 유지)
  while (blob.size > TARGET && w > 800) {
    w = Math.round(w * 0.85); h = Math.round(h * 0.85);
    draw(w, h);
    blob = await toBlob(0.8);
  }
  return blob;
}

/** 이미지 업로드 → Storage URL 반환 (Blob/File 모두 허용, 업로드 전 리사이즈됨) */
export async function uploadFeedImage(uid: string, fileOrBlob: File | Blob): Promise<string> {
  const storage = getFirebaseStorage();
  const ext = fileOrBlob instanceof File ? (fileOrBlob.name.split(".").pop() ?? "jpg") : "jpg";
  const path = `feeds/${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, fileOrBlob, { contentType: fileOrBlob.type || "image/jpeg" });
  return await getDownloadURL(fileRef);
}

/** 피드 생성 */
export async function createFeed(input: {
  authorId: string;
  authorName: string;
  authorPhoto: string | null;
  imageUrl: string;
  images?: string[];
  exif: ExifData;
  aiCopy: string;
  filter: FeedFilter;
  category: string;
  regionId?: string;
  regionName?: string;
  regionCity?: "제주시" | "서귀포시";
  gps?: { lat: number; lng: number };
  placeName?: string;
  homepageUrl?: string;
  homepageName?: string;
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

/** 내가 작성한 피드 개수 (마이페이지 통계용) */
export async function countMyFeeds(uid: string): Promise<number> {
  const db = getFirebaseDb();
  const q = query(collection(db, "feeds"), orderBy("createdAt", "desc"), limit(200));
  const snap = await getDocs(q);
  return snap.docs.filter((d) => (d.data() as { authorId?: string }).authorId === uid).length;
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
