"use client";

import {
  collection,
  doc,
  getDoc,
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
import type { TripPlan, SavedTripPlan } from "@/types/trip";

function plansCol(uid: string) {
  return collection(getFirebaseDb(), "users", uid, "tripPlans");
}

/** 일정 저장 → 문서 ID 반환 */
export async function saveTripPlan(
  uid: string,
  meta: { nights: number; days: number; transportation: string },
  plan: TripPlan
): Promise<string> {
  const ref = doc(plansCol(uid));
  await setDoc(ref, {
    title: plan.title,
    nights: meta.nights,
    days: meta.days,
    transportation: meta.transportation,
    createdAt: serverTimestamp(),
    plan: JSON.parse(JSON.stringify(plan)), // undefined 필드 제거 (Firestore 미지원)
  });
  return ref.id;
}

type RawDoc = {
  title?: string;
  nights?: number;
  days?: number;
  transportation?: string;
  createdAt?: Timestamp;
  plan?: TripPlan;
};

function toSaved(id: string, data: RawDoc): SavedTripPlan {
  return {
    id,
    title: data.title ?? "제주 여행 일정",
    nights: data.nights ?? 0,
    days: data.days ?? 1,
    transportation: data.transportation ?? "렌터카",
    createdAt: data.createdAt?.toMillis() ?? 0,
    plan: data.plan as TripPlan,
  };
}

/** 내 일정 목록 (최신순) */
export async function listTripPlans(uid: string, max = 20): Promise<SavedTripPlan[]> {
  const q = query(plansCol(uid), orderBy("createdAt", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toSaved(d.id, d.data() as RawDoc)).filter((p) => p.plan);
}

/** 단일 일정 조회 */
export async function getTripPlan(uid: string, planId: string): Promise<SavedTripPlan | null> {
  const snap = await getDoc(doc(getFirebaseDb(), "users", uid, "tripPlans", planId));
  if (!snap.exists()) return null;
  const saved = toSaved(snap.id, snap.data() as RawDoc);
  return saved.plan ? saved : null;
}

/** 일정 삭제 */
export async function deleteTripPlan(uid: string, planId: string): Promise<void> {
  await deleteDoc(doc(getFirebaseDb(), "users", uid, "tripPlans", planId));
}
