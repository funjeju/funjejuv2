"use client";

import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { coordToDirection, type MySpot, type MySpotCategory } from "@/types/my-spot";

function spotsCol(uid: string) {
  return collection(getFirebaseDb(), "users", uid, "mySpots");
}

/** 마이스팟 추가 → 문서 ID 반환 */
export async function addMySpot(
  uid: string,
  spot: {
    name: string;
    category: MySpotCategory;
    lat: number;
    lng: number;
    address?: string;
    source?: "search" | "jejutube";
  }
): Promise<string> {
  const ref = doc(spotsCol(uid));
  await setDoc(ref, {
    name: spot.name,
    category: spot.category,
    direction: coordToDirection(spot.lat, spot.lng),
    address: spot.address ?? "",
    lat: spot.lat,
    lng: spot.lng,
    source: spot.source ?? "search",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

type RawSpot = {
  name?: string;
  category?: MySpotCategory;
  direction?: MySpot["direction"];
  address?: string;
  lat?: number;
  lng?: number;
  source?: MySpot["source"];
  createdAt?: Timestamp;
};

/** 내 마이스팟 목록 (최신순) */
export async function listMySpots(uid: string, max = 100): Promise<MySpot[]> {
  const q = query(spotsCol(uid), orderBy("createdAt", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => {
      const data = d.data() as RawSpot;
      if (typeof data.lat !== "number" || typeof data.lng !== "number") return null;
      return {
        id: d.id,
        name: data.name ?? "",
        category: data.category ?? "여행지",
        direction: data.direction ?? coordToDirection(data.lat, data.lng),
        address: data.address || undefined,
        lat: data.lat,
        lng: data.lng,
        source: data.source ?? "search",
        createdAt: data.createdAt?.toMillis() ?? 0,
      } as MySpot;
    })
    .filter((s): s is MySpot => s !== null && !!s.name);
}

/** 마이스팟 삭제 */
export async function deleteMySpot(uid: string, spotId: string): Promise<void> {
  await deleteDoc(doc(getFirebaseDb(), "users", uid, "mySpots", spotId));
}
