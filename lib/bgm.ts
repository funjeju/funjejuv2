"use client";

import {
  collection, doc, addDoc, getDocs, deleteDoc, query, orderBy, serverTimestamp, type Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject, getStorage } from "firebase/storage";
import { getApps } from "firebase/app";
import { getFirebaseDb } from "@/lib/firebase";

export type BgmTrack = {
  id: string;
  name: string;
  url: string;
  storagePath: string;
  addedAt?: Timestamp | null;
};

function storageOf() {
  const app = getApps()[0];
  if (!app) throw new Error("Firebase not initialized");
  return getStorage(app);
}

/** 내 BGM 목록 (오래된 순) */
export async function listBgm(uid: string): Promise<BgmTrack[]> {
  const db = getFirebaseDb();
  const q = query(collection(db, "users", uid, "bgmTracks"), orderBy("addedAt", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<BgmTrack, "id">) }));
}

/** MP3 업로드 → Storage + Firestore 등록 */
export async function uploadBgm(uid: string, file: File): Promise<BgmTrack> {
  const storage = storageOf();
  const safe = file.name.replace(/[^\w.\-가-힣 ]/g, "_").slice(0, 60);
  const storagePath = `bgm/${uid}/${Date.now()}-${safe}`;
  const fileRef = ref(storage, storagePath);
  await uploadBytes(fileRef, file, { contentType: file.type || "audio/mpeg" });
  const url = await getDownloadURL(fileRef);
  const name = safe.replace(/\.[^.]+$/, "");
  const db = getFirebaseDb();
  const docRef = await addDoc(collection(db, "users", uid, "bgmTracks"), { name, url, storagePath, addedAt: serverTimestamp() });
  return { id: docRef.id, name, url, storagePath };
}

/** BGM 삭제 (Storage + Firestore) */
export async function deleteBgm(uid: string, track: BgmTrack): Promise<void> {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, "users", uid, "bgmTracks", track.id)).catch(() => {});
  if (track.storagePath) {
    await deleteObject(ref(storageOf(), track.storagePath)).catch(() => {});
  }
}
