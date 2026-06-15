"use client";

import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

export type MvPreset = { name: string; slots: (string | null)[] };

const LS_KEY = "multiview_presets";

/** 로컬 폴백 읽기 (비로그인 사용자) */
function readLocal(): MvPreset[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as MvPreset[]) : [];
  } catch {
    return [];
  }
}
function writeLocal(presets: MvPreset[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(presets)); } catch { /* ignore */ }
}

/**
 * 프리셋 로드.
 * - 로그인: Firestore `users/{uid}.multiviewPresets`. 비어있으면 기기 로컬값을 1회 마이그레이션 저장.
 * - 비로그인: localStorage.
 */
export async function loadPresets(uid: string | null): Promise<MvPreset[]> {
  if (!uid) return readLocal();
  try {
    const db = getFirebaseDb();
    const snap = await getDoc(doc(db, "users", uid));
    const remote = (snap.exists() ? (snap.data().multiviewPresets as MvPreset[] | undefined) : undefined) ?? null;
    if (remote && remote.length) return remote;
    // 원격이 비어있으면 이 기기의 로컬 프리셋을 끌어올려 저장(첫 동기화)
    const local = readLocal();
    if (local.length) {
      await savePresets(uid, local);
      return local;
    }
    return [];
  } catch {
    return readLocal();
  }
}

/** 프리셋 전체 저장 (로그인=Firestore + 로컬 캐시, 비로그인=로컬만) */
export async function savePresets(uid: string | null, presets: MvPreset[]): Promise<void> {
  writeLocal(presets); // 항상 로컬 캐시도 갱신 (오프라인/폴백 대비)
  if (!uid) return;
  try {
    const db = getFirebaseDb();
    await setDoc(doc(db, "users", uid), { multiviewPresets: presets }, { merge: true });
  } catch (e) {
    console.error("[multiview-presets] save failed", e);
  }
}
