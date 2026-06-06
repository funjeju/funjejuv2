"use client";

import {
  collection, doc, setDoc, deleteDoc, getDoc, getDocs,
  serverTimestamp, query, orderBy, limit, type DocumentData,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

/** Firestore에 신규 등록된 맛집 */
export type NewRestaurant = {
  id: string;
  title: string;
  region: string;
  menu: string;
  address: string;
  phone: string;
  hours: string;          // "09:30 - 18:50"
  description: string;
  imageUrl: string;       // 단일 이미지 URL (옵션)
  options: string[];      // ["주차", "혼밥OK"] 등
  createdAt?: Date;
};

const HIDDEN_DOC = "hidden";  // restaurants_meta/hidden 단일 문서

// ── 신규 맛집 CRUD ─────────────────────────────────────────
export async function addRestaurant(data: Omit<NewRestaurant, "id" | "createdAt">): Promise<string> {
  const db = getFirebaseDb();
  const id = `new_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  await setDoc(doc(db, "restaurants", id), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return id;
}

export async function updateRestaurant(id: string, data: Partial<Omit<NewRestaurant, "id">>): Promise<void> {
  const db = getFirebaseDb();
  await setDoc(doc(db, "restaurants", id), data, { merge: true });
}

export async function deleteNewRestaurant(id: string): Promise<void> {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, "restaurants", id));
}

export async function listNewRestaurants(): Promise<NewRestaurant[]> {
  const db = getFirebaseDb();
  const snap = await getDocs(
    query(collection(db, "restaurants"), orderBy("createdAt", "desc"), limit(500))
  );
  return snap.docs.map((d) => {
    const data = d.data() as DocumentData;
    return {
      id: d.id,
      title: data.title ?? "",
      region: data.region ?? "",
      menu: data.menu ?? "",
      address: data.address ?? "",
      phone: data.phone ?? "",
      hours: data.hours ?? "",
      description: data.description ?? "",
      imageUrl: data.imageUrl ?? "",
      options: data.options ?? [],
      createdAt: data.createdAt?.toDate?.(),
    };
  });
}

export async function getNewRestaurant(id: string): Promise<NewRestaurant | null> {
  const db = getFirebaseDb();
  const snap = await getDoc(doc(db, "restaurants", id));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    title: data.title ?? "",
    region: data.region ?? "",
    menu: data.menu ?? "",
    address: data.address ?? "",
    phone: data.phone ?? "",
    hours: data.hours ?? "",
    description: data.description ?? "",
    imageUrl: data.imageUrl ?? "",
    options: data.options ?? [],
    createdAt: data.createdAt?.toDate?.(),
  };
}

// ── 기존 JSON 맛집 숨김 관리 ─────────────────────────────────
/** 숨김 처리된 기존 JSON ID 목록 */
export async function getHiddenIds(): Promise<string[]> {
  const db = getFirebaseDb();
  const snap = await getDoc(doc(db, "restaurants_meta", HIDDEN_DOC));
  if (!snap.exists()) return [];
  const data = snap.data();
  return Array.isArray(data.ids) ? data.ids : [];
}

export async function hideRestaurant(id: string): Promise<void> {
  const db = getFirebaseDb();
  const ref = doc(db, "restaurants_meta", HIDDEN_DOC);
  const snap = await getDoc(ref);
  const ids: string[] = snap.exists() ? (snap.data().ids ?? []) : [];
  if (!ids.includes(id)) ids.push(id);
  await setDoc(ref, { ids, updatedAt: serverTimestamp() });
}

export async function unhideRestaurant(id: string): Promise<void> {
  const db = getFirebaseDb();
  const ref = doc(db, "restaurants_meta", HIDDEN_DOC);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const ids: string[] = (snap.data().ids ?? []).filter((x: string) => x !== id);
  await setDoc(ref, { ids, updatedAt: serverTimestamp() });
}
