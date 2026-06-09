"use client";

import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  type DocumentData,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import type { CctvEntry } from "@/types/cctv";
import { getDirection } from "@/constants/cctv-directions";

// 우선순위: Worker > Lightsail
const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL ?? "";
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

// ── 어드민 작업은 서버 API(/api/admin/cctv) 호출 → Admin SDK가 Firestore 쓰기
//    Firestore 보안 규칙이 잠겨있어도 작동함

async function apiCall(method: string, body?: unknown): Promise<unknown> {
  const res = await fetch("/api/admin/cctv", {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.hint || `${res.status} 오류`);
  }
  return data;
}

/** 어드민 전체 목록 (비활성 포함) */
export async function adminListCctvs(): Promise<CctvEntry[]> {
  const data = await apiCall("GET") as { entries: CctvEntry[] };
  return data.entries ?? [];
}

/** 어드민 저장/업데이트 */
export async function adminSetCctv(entry: Omit<CctvEntry, "addedAt">): Promise<void> {
  await apiCall("POST", entry);
}

/** 어드민 활성화 토글 */
export async function adminToggleCctv(id: string, active: boolean): Promise<void> {
  await apiCall("PATCH", { id, active });
}

/** 어드민 삭제 */
export async function adminDeleteCctv(id: string): Promise<void> {
  await apiCall("DELETE", { id });
}

/** 프록시 URL 계산 — Worker 우선 */
export function getStreamProxyUrl(id: string): string | null {
  if (WORKER_URL) return `${WORKER_URL}/cctv/${id}`;
  if (PROXY_BASE) return `${PROXY_BASE}/cctv/${id}`;
  return null;
}
