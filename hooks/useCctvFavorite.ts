"use client";

import { useState, useEffect, useCallback } from "react";
import { doc, setDoc, deleteDoc, onSnapshot, collection } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";

const LOCAL_KEY = "funjeju_cctv_favorites";

/** CCTV 즐겨찾기 — 멀티뷰 전용, mySpots와 별도 관리 */
export function useCctvFavorite() {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_KEY);
      if (stored) setFavoriteIds(new Set(JSON.parse(stored) as string[]));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!user) return;
    const db = getFirebaseDb();
    const ref = collection(db, "users", user.uid, "cctvFavorites");
    const unsub = onSnapshot(ref, (snap) => {
      const ids = new Set(snap.docs.map((d) => d.id));
      setFavoriteIds(ids);
      localStorage.setItem(LOCAL_KEY, JSON.stringify([...ids]));
    });
    return unsub;
  }, [user]);

  const toggle = useCallback(async (cctvId: string) => {
    const next = new Set(favoriteIds);
    const isNowFav = !next.has(cctvId);
    isNowFav ? next.add(cctvId) : next.delete(cctvId);
    setFavoriteIds(next);
    localStorage.setItem(LOCAL_KEY, JSON.stringify([...next]));

    if (user) {
      const db = getFirebaseDb();
      const ref = doc(db, "users", user.uid, "cctvFavorites", cctvId);
      if (isNowFav) await setDoc(ref, { savedAt: new Date().toISOString() });
      else await deleteDoc(ref);
    }
  }, [favoriteIds, user]);

  const isFavorite = useCallback((id: string) => favoriteIds.has(id), [favoriteIds]);

  return { isFavorite, toggle, favoriteIds };
}
