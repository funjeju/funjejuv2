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

export async function listGuestPosts(slug: string, limit = 50, coll: string = COLLECTION): Promise<GuestPost[]> {
  const db = getAdminDb();
  const snap = await db.collection(coll).doc(slug).collection("guestbook")
    .orderBy("createdAt", "desc").limit(limit).get();
  return snap.docs.map((d) => d.data() as GuestPost);
}

export async function addGuestPost(slug: string, name: string, text: string, coll: string = COLLECTION): Promise<GuestPost> {
  const db = getAdminDb();
  const post: GuestPost = {
    name: (name || "익명").slice(0, 20),
    text: text.slice(0, 200),
    createdAt: new Date().toISOString(),
  };
  await db.collection(coll).doc(slug).collection("guestbook").add(post);
  return post;
}

/** 방문자 카운터 — {coll}/{slug} 에 누적. TODAY는 날짜 바뀌면 리셋. 로그인 방문자는 접속로그도 기록. */
export async function bumpVisit(slug: string, visitor?: { uid: string; name: string }, coll: string = COLLECTION): Promise<{ today: number; total: number }> {
  const db = getAdminDb();
  const ref = db.collection(coll).doc(slug);
  const day = new Date().toISOString().slice(0, 10);
  const res = await db.runTransaction(async (tx) => {
    const d = (await tx.get(ref)).data() ?? {};
    const total = ((d.visitTotal as number) ?? 0) + 1;
    const today = ((d.visitDay as string) === day ? ((d.visitToday as number) ?? 0) : 0) + 1;
    tx.set(ref, { visitTotal: total, visitToday: today, visitDay: day }, { merge: true });
    return { today, total };
  });
  if (visitor?.uid) {
    await ref.collection("visitors").doc(visitor.uid)
      .set({ name: (visitor.name || "여행자").slice(0, 20), lastVisit: Date.now() }, { merge: true });
  }
  return res;
}

export interface Visitor { uid: string; name: string; lastVisit: number; }
export async function listVisitors(slug: string, limit = 20, coll: string = COLLECTION): Promise<Visitor[]> {
  const snap = await getAdminDb().collection(coll).doc(slug).collection("visitors")
    .orderBy("lastVisit", "desc").limit(limit).get();
  return snap.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<Visitor, "uid">) }));
}

// ── 스크랩(주인 즐겨찾기) — 링크형 + 스팟형(카테고리별) ──
export type ScrapType = "link" | "spot";
export interface ScrapItem { id: string; type: ScrapType; category: string; title: string; url: string; address: string; createdAt: string; }
export async function listScraps(slug: string, limit = 100, coll: string = COLLECTION): Promise<ScrapItem[]> {
  const snap = await getAdminDb().collection(coll).doc(slug).collection("scraps")
    .orderBy("createdAt", "desc").limit(limit).get();
  return snap.docs.map((d) => {
    const r = d.data() as Partial<ScrapItem>;
    return {
      id: d.id,
      type: r.type ?? (r.url ? "link" : "spot"),
      category: r.category || "제주",
      title: r.title || "",
      url: r.url || "",
      address: r.address || "",
      createdAt: r.createdAt || "",
    };
  });
}
export interface NewScrap { type?: ScrapType; category?: string; title?: string; url?: string; address?: string; }
export async function addScrap(slug: string, input: NewScrap, coll: string = COLLECTION): Promise<ScrapItem> {
  const url = (input.url || "").trim();
  const type: ScrapType = input.type === "spot" ? "spot" : (url ? "link" : "spot");
  const item = {
    type,
    category: (input.category || "제주").trim().slice(0, 20),
    title: (input.title || url || input.address || "스크랩").trim().slice(0, 60),
    url: /^https?:\/\//.test(url) ? url.slice(0, 300) : "",
    address: (input.address || "").trim().slice(0, 120),
    createdAt: new Date().toISOString(),
  };
  const ref = await getAdminDb().collection(coll).doc(slug).collection("scraps").add(item);
  return { id: ref.id, ...item };
}

// ── 다이어리(달력) ──
export interface DiaryEntry { id: string; date: string; text: string; createdAt: string; }
export async function listDiary(slug: string, limit = 80, coll: string = COLLECTION): Promise<DiaryEntry[]> {
  const snap = await getAdminDb().collection(coll).doc(slug).collection("diary")
    .orderBy("date", "desc").limit(limit).get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DiaryEntry, "id">) }));
}
export async function addDiary(slug: string, date: string, text: string, coll: string = COLLECTION): Promise<DiaryEntry> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("날짜 형식 오류");
  const entry = { date, text: text.slice(0, 300), createdAt: new Date().toISOString() };
  const ref = await getAdminDb().collection(coll).doc(slug).collection("diary").add(entry);
  return { id: ref.id, ...entry };
}

/** 미니미/방컨셉 저장. 허용값만 통과. TODO: 오너 인증 게이팅(현재 무인증). */
export async function saveMiniHompyConfig(slug: string, raw: Partial<MiniHompyConfig>): Promise<MiniHompyConfig> {
  const config: MiniHompyConfig = {};
  if (raw.minimi && VALID_MINIMI.includes(raw.minimi)) config.minimi = raw.minimi;
  if (raw.roomConcept && VALID_ROOM.includes(raw.roomConcept)) config.roomConcept = raw.roomConcept;
  if (raw.bgmUrl !== undefined) {
    const u = String(raw.bgmUrl).trim();
    config.bgmUrl = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(u) ? u.slice(0, 200) : "";
  }
  const db = getAdminDb();
  await db.collection(COLLECTION).doc(slug).set(
    { miniHompy: config, updatedAt: new Date().toISOString() },
    { merge: true }
  );
  return config;
}
