"use client";

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  updateDoc,
  type DocumentData,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import type { CctvEntry } from "@/types/cctv";
import { getDirection } from "@/constants/cctv-directions";

const PROXY_BASE = process.env.NEXT_PUBLIC_PROXY_URL ?? "";

function toEntry(id: string, data: DocumentData): CctvEntry {
  return {
    id,
    name: data.name ?? "",
    region: data.region ?? "",
    direction: data.direction ?? getDirection(data.region ?? ""),
    category: data.category ?? "기타",
    originUrl: data.originUrl ?? "",
    youtubeId: data.youtubeId || undefined,
    active: !!data.active,
    description: data.description ?? "",
    lat: data.lat,
    lng: data.lng,
    addedAt: data.addedAt?.toDate?.()?.toISOString(),
  };
}

/** 활성 CCTV 실시간 구독 (공개) */
export function subscribeCctvs(callback: (entries: CctvEntry[]) => void) {
  const db = getFirebaseDb();
  const q = query(
    collection(db, "cctvs"),
    where("active", "==", true),
    orderBy("name")
  );
  return onSnapshot(q, (snap) => {
    const entries = snap.docs.map((d) => toEntry(d.id, d.data()));
    // YouTube 항목 최상단 정렬
    entries.sort((a, b) => {
      if (a.youtubeId && !b.youtubeId) return -1;
      if (!a.youtubeId && b.youtubeId) return 1;
      return 0;
    });
    callback(entries);
  });
}

/** 어드민 전체 목록 (비활성 포함) */
export async function adminListCctvs(): Promise<CctvEntry[]> {
  const db = getFirebaseDb();
  const snap = await getDocs(
    query(collection(db, "cctvs"), orderBy("name"))
  );
  return snap.docs.map((d) => toEntry(d.id, d.data()));
}

/** 어드민 저장/업데이트 */
export async function adminSetCctv(entry: Omit<CctvEntry, "addedAt">): Promise<void> {
  const db = getFirebaseDb();
  const ref = doc(db, "cctvs", entry.id);
  await setDoc(
    ref,
    {
      name: entry.name,
      region: entry.region,
      direction: entry.direction,
      category: entry.category,
      originUrl: entry.originUrl,
      youtubeId: entry.youtubeId ?? null,
      active: entry.active,
      description: entry.description,
      lat: entry.lat ?? null,
      lng: entry.lng ?? null,
      addedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/** 어드민 활성화 토글 */
export async function adminToggleCctv(id: string, active: boolean): Promise<void> {
  const db = getFirebaseDb();
  await updateDoc(doc(db, "cctvs", id), { active });
}

/** 어드민 삭제 */
export async function adminDeleteCctv(id: string): Promise<void> {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, "cctvs", id));
}

/** 프록시 URL 계산 */
export function getStreamProxyUrl(id: string): string | null {
  if (!PROXY_BASE) return null;
  return `${PROXY_BASE}/cctv/${id}`;
}
