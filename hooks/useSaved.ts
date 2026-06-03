"use client";

import { useState, useEffect, useCallback } from "react";
import {
  doc, setDoc, deleteDoc, onSnapshot, collection,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";

const LOCAL_KEY = "funjeju_saved_spots";

export function useSaved() {
  const { user } = useAuth();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  // 로컬스토리지 초기값
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_KEY);
      if (stored) setSavedIds(new Set(JSON.parse(stored) as string[]));
    } catch { /* ignore */ }
  }, []);

  // 로그인 시 Firestore 실시간 동기화
  useEffect(() => {
    if (!user) return;

    const db = getFirebaseDb();
    const ref = collection(db, "users", user.uid, "saved");

    const unsub = onSnapshot(ref, (snap) => {
      const ids = new Set(snap.docs.map((d) => d.id));
      setSavedIds(ids);
      localStorage.setItem(LOCAL_KEY, JSON.stringify([...ids]));
    });

    return unsub;
  }, [user]);

  const toggle = useCallback(async (id: string) => {
    const next = new Set(savedIds);
    const isNowSaved = !next.has(id);
    isNowSaved ? next.add(id) : next.delete(id);

    // 로컬 즉시 반영
    setSavedIds(next);
    localStorage.setItem(LOCAL_KEY, JSON.stringify([...next]));

    // 로그인 상태면 Firestore에도 반영
    if (user) {
      const db = getFirebaseDb();
      const ref = doc(db, "users", user.uid, "saved", id);
      if (isNowSaved) {
        await setDoc(ref, { savedAt: new Date().toISOString() });
      } else {
        await deleteDoc(ref);
      }
    }
  }, [savedIds, user]);

  const isSaved = useCallback((id: string) => savedIds.has(id), [savedIds]);

  return { isSaved, toggle, savedIds };
}
