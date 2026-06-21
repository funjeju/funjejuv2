import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import type { MiniMiKind, RoomConcept } from "./types";

/**
 * 제주 미니홈피 깃발(지도 핀) 저장소.
 * 컬렉션 minihome_flags — 유저가 제주 지도에 꽂은 미니홈피 위치.
 * Phase: 무인증 꽂기(프리런치). 추후 유저 계정과 연결(1인 1깃발 등).
 */

const COLLECTION = "minihome_flags";

export interface MiniHomeFlag {
  id: string;
  name: string;
  lat: number;
  lng: number;
  minimi: MiniMiKind;
  concept: RoomConcept;
  level: number;
  message?: string;
  link?: string;
  createdAt: string;
}

const VALID_MINIMI: MiniMiKind[] = ["haenyeo", "dolharbang", "hallabong", "baram", "yuchae", "gemeunmorae"];
const VALID_ROOM: RoomConcept[] = ["oreum", "tangerine", "beach"];

// 제주도 대략 경계 — 밖이면 거부(스푸핑·장난 방지)
const JEJU = { latMin: 32.9, latMax: 33.75, lngMin: 126.0, lngMax: 127.05 };
export function inJeju(lat: number, lng: number) {
  return lat >= JEJU.latMin && lat <= JEJU.latMax && lng >= JEJU.lngMin && lng <= JEJU.lngMax;
}

export async function listFlags(limit = 500): Promise<MiniHomeFlag[]> {
  const db = getAdminDb();
  const snap = await db.collection(COLLECTION).orderBy("createdAt", "desc").limit(limit).get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MiniHomeFlag, "id">) }));
}

export interface NewFlag {
  name: string; lat: number; lng: number;
  minimi?: MiniMiKind; concept?: RoomConcept; level?: number; message?: string; link?: string;
}

/** 유저 1인 1깃발 — 문서ID=uid. 다시 꽂으면 위치/내용 갱신. */
export async function upsertUserFlag(uid: string, input: NewFlag): Promise<MiniHomeFlag> {
  const lat = Number(input.lat), lng = Number(input.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !inJeju(lat, lng)) {
    throw new Error("제주 안에만 꽂을 수 있어요");
  }
  const flag: Omit<MiniHomeFlag, "id"> = {
    name: (input.name || "익명").slice(0, 20),
    lat, lng,
    minimi: input.minimi && VALID_MINIMI.includes(input.minimi) ? input.minimi : "baram",
    concept: input.concept && VALID_ROOM.includes(input.concept) ? input.concept : "oreum",
    level: Math.max(1, Math.min(Number(input.level) || 1, 99)),
    message: input.message ? String(input.message).slice(0, 60) : "",
    link: `/minihome/u/${uid}`,
    createdAt: new Date().toISOString(),
  };
  await getAdminDb().collection(COLLECTION).doc(uid).set(flag, { merge: true });
  return { id: uid, ...flag };
}

export async function addFlag(input: NewFlag): Promise<MiniHomeFlag> {
  const lat = Number(input.lat), lng = Number(input.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !inJeju(lat, lng)) {
    throw new Error("제주 안에만 꽂을 수 있어요");
  }
  const flag: Omit<MiniHomeFlag, "id"> = {
    name: (input.name || "익명").slice(0, 20),
    lat, lng,
    minimi: input.minimi && VALID_MINIMI.includes(input.minimi) ? input.minimi : "baram",
    concept: input.concept && VALID_ROOM.includes(input.concept) ? input.concept : "oreum",
    level: Math.max(1, Math.min(Number(input.level) || 1, 99)),
    message: input.message ? String(input.message).slice(0, 60) : "",
    ...(input.link ? { link: String(input.link).slice(0, 200) } : {}),
    createdAt: new Date().toISOString(),
  };
  const db = getAdminDb();
  const ref = await db.collection(COLLECTION).add(flag);
  return { id: ref.id, ...flag };
}
