import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import type { MiniHompyConfig, MiniMiKind, RoomConcept } from "./types";

/**
 * 미니홈피 영속화 — 방명록(서브컬렉션) + 미니미/방컨셉 설정(site doc 병합).
 * 컬렉션: biz_sites/{slug}/guestbook, biz_sites/{slug}.miniHompy
 */

const COLLECTION = "biz_sites";

export interface GuestPost {
  name: string;
  text: string;
  createdAt: string;
}

const VALID_MINIMI: MiniMiKind[] = ["haenyeo", "dolharbang", "hallabong", "baram", "yuchae", "gemeunmorae"];
const VALID_ROOM: RoomConcept[] = ["oreum", "tangerine", "beach"];

export async function listGuestPosts(slug: string, limit = 50): Promise<GuestPost[]> {
  const db = getAdminDb();
  const snap = await db.collection(COLLECTION).doc(slug).collection("guestbook")
    .orderBy("createdAt", "desc").limit(limit).get();
  return snap.docs.map((d) => d.data() as GuestPost);
}

export async function addGuestPost(slug: string, name: string, text: string): Promise<GuestPost> {
  const db = getAdminDb();
  const post: GuestPost = {
    name: (name || "익명").slice(0, 20),
    text: text.slice(0, 200),
    createdAt: new Date().toISOString(),
  };
  await db.collection(COLLECTION).doc(slug).collection("guestbook").add(post);
  return post;
}

/** 미니미/방컨셉 저장. 허용값만 통과. TODO: 오너 인증 게이팅(현재 무인증). */
export async function saveMiniHompyConfig(slug: string, raw: Partial<MiniHompyConfig>): Promise<MiniHompyConfig> {
  const config: MiniHompyConfig = {};
  if (raw.minimi && VALID_MINIMI.includes(raw.minimi)) config.minimi = raw.minimi;
  if (raw.roomConcept && VALID_ROOM.includes(raw.roomConcept)) config.roomConcept = raw.roomConcept;
  const db = getAdminDb();
  await db.collection(COLLECTION).doc(slug).set(
    { miniHompy: config, updatedAt: new Date().toISOString() },
    { merge: true }
  );
  return config;
}
