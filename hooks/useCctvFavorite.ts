"use client";

import { useState, useEffect, useCallback } from "react";
import { doc, setDoc, deleteDoc, onSnapshot, collection } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";

import { usePreviewRuntime } from "@/components/common/PreviewRuntimeProvider";

const LOCAL_KEY = "funjeju_cctv_favorites";

/** CCTV 즐겨찾기 — 멀티뷰 전용, mySpots와 별도 관리 */
export function useCctvFavorite() {
  const { user } = useAuth();
  const preview = usePreviewRuntime();
  const localKey = preview ? `${LOCAL_KEY}:preview` : LOCAL_KEY;
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem(localKey);
      // Restore browser-only storage after hydration, not during the server render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored) setFavoriteIds(new Set(JSON.parse(stored) as string[]));
    } catch { /* ignore */ }
  }, [localKey]);

  useEffect(() => {
    if (preview || !user) return;
    const db = getFirebaseDb();
    const ref = collection(db, "users", user.uid, "cctvFavorites");
    const unsub = onSnapshot(ref, (snap) => {
      const ids = new Set(snap.docs.map((d) => d.id));
      setFavoriteIds(ids);
      localStorage.setItem(localKey, JSON.stringify([...ids]));
    });
    return unsub;
  }, [user, preview, localKey]);

  const toggle = useCallback(async (cctvId: string) => {
    const next = new Set(favoriteIds);
    const isNowFav = !next.has(cctvId);
    isNowFav ? next.add(cctvId) : next.delete(cctvId);
    setFavoriteIds(next);
    localStorage.setItem(localKey, JSON.stringify([...next]));

    if (!preview && user) {
      const db = getFirebaseDb();
      const ref = doc(db, "users", user.uid, "cctvFavorites", cctvId);
      if (isNowFav) await setDoc(ref, { savedAt: new Date().toISOString() });
      else await deleteDoc(ref);
    }
  }, [favoriteIds, user, preview, localKey]);

  const isFavorite = useCallback((id: string) => favoriteIds.has(id), [favoriteIds]);

  return { isFavorite, toggle, favoriteIds };
}
