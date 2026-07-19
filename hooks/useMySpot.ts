"use client";

import { useState, useEffect, useCallback } from "react";
import { onSnapshot, collection } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { addMySpot, deleteMySpot } from "@/lib/my-spots";
import type { MySpotCategory, MySpot } from "@/types/my-spot";

const LOCAL_KEY = "funjeju_myspot_ids";

export type SpotInfo = {
  name: string;
  category: MySpotCategory;
  lat: number;
  lng: number;
  address?: string;
  source: MySpot["source"];
  imageUrl?: string;
  detailUrl?: string;
};

/**
 * 마이스팟 통합 hook.
 * 피드·도민맛집·검색 결과를 모두 users/{uid}/mySpots 에 저장.
 * CCTV 즐겨찾기는 useCctvFavorite 사용.
 */
export function useMySpot() {
  const { user } = useAuth();
  const [spotIds, setSpotIds] = useState<Set<string>>(new Set());

  // 로컬스토리지 초기값
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_KEY);
      if (stored) setSpotIds(new Set(JSON.parse(stored) as string[]));
    } catch { /* ignore */ }
  }, []);

  // 로그인 시 Firestore 실시간 동기화
  useEffect(() => {
    if (!user) return;
    const db = getFirebaseDb();
    const unsub = onSnapshot(collection(db, "users", user.uid, "mySpots"), (snap) => {
      const ids = new Set(snap.docs.map((d) => d.id));
      setSpotIds(ids);
      localStorage.setItem(LOCAL_KEY, JSON.stringify([...ids]));
    });
    return unsub;
  }, [user]);

  const isSpot = useCallback((id: string) => spotIds.has(id), [spotIds]);

  const toggle = useCallback(async (spotId: string, info: SpotInfo) => {
    const isSaved = spotIds.has(spotId);
    const next = new Set(spotIds);

    if (isSaved) {
      next.delete(spotId);
      setSpotIds(next);
      localStorage.setItem(LOCAL_KEY, JSON.stringify([...next]));
      if (user) await deleteMySpot(user.uid, spotId).catch(() => {});
    } else {
      next.add(spotId);
      setSpotIds(next);
      localStorage.setItem(LOCAL_KEY, JSON.stringify([...next]));
      if (user) {
        await addMySpot(user.uid, { ...info, spotId }).catch(() => {});
      }
    }
  }, [spotIds, user]);

  return { isSpot, toggle, spotIds };
}
