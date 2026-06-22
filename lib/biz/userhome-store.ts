import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import type { MiniMiKind, RoomConcept } from "./types";
import { SHOP_ITEMS } from "@/components/biz/minihompy/shop-items";

/**
 * 유저 미니홈 저장소 — minihomes/{uid}.
 * 보말 잔액·미니미·방컨셉·보유아이템·레벨을 "내 계정"에 묶는다.
 * 구매는 서버 트랜잭션으로 잔액 검증(클라 위변조 방지).
 */

const COL = "minihomes";
const STARTER_BOMAL = 500;

const VALID_MINIMI: MiniMiKind[] = ["haenyeo", "dolharbang", "hallabong", "baram", "yuchae", "gemeunmorae"];
const VALID_ROOM: RoomConcept[] = ["oreum", "tangerine", "beach"];

export interface UserHome {
  uid: string;
  displayName: string;
  minimi: MiniMiKind;
  concept: RoomConcept;
  level: number;
  xp: number;
  bomal: number;
  ownedItems: string[];
  background?: string; // 장착한 배경 상점아이템 id ("" 또는 미설정=컨셉 기본배경)
  specialMinimi?: string; // 장착한 특별 미니미 상점아이템 id ("" 또는 미설정=기본 미니미)
  customBgUrl?: string; // bg-custom 장착 시 업로드한 내 사진 URL
  decorSavedAt?: number; // 마지막 꾸미기 변경 시각(epoch ms) — 주1회 제한
  bgmUrl?: string; // BGM 유튜브 링크
  photos?: string[]; // 사진첩 (업로드한 사진 URL들)
  createdAt: string;
  updatedAt: string;
}

export const DECOR_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 주 1회

const now = () => new Date().toISOString();

const XP_PER_LEVEL = 100;
export function levelForXp(xp: number) { return 1 + Math.floor(Math.max(0, xp) / XP_PER_LEVEL); }
export function xpProgress(xp: number) { return { inLevel: Math.max(0, xp) % XP_PER_LEVEL, perLevel: XP_PER_LEVEL }; }

export async function getOrCreateUserHome(uid: string, displayName?: string): Promise<UserHome> {
  const db = getAdminDb();
  const ref = db.collection(COL).doc(uid);
  const snap = await ref.get();
  if (snap.exists) return { uid, ...(snap.data() as Omit<UserHome, "uid">) };
  const home: Omit<UserHome, "uid"> = {
    displayName: displayName ?? "여행자",
    minimi: "hallabong", concept: "oreum", level: 1, xp: 0,
    bomal: STARTER_BOMAL, ownedItems: [],
    createdAt: now(), updatedAt: now(),
  };
  await ref.set(home);
  return { uid, ...home };
}

export interface PublicHome { uid: string; displayName: string; minimi: MiniMiKind; concept: RoomConcept; level: number; background?: string; specialMinimi?: string; customBgUrl?: string; bgmUrl?: string; photos?: string[]; }

/** 남의 미니홈 공개 조회 — 보말·보유아이템 등 민감정보 제외. */
export async function getPublicHome(uid: string): Promise<PublicHome | null> {
  const snap = await getAdminDb().collection(COL).doc(uid).get();
  if (!snap.exists) return null;
  const d = snap.data() as Partial<UserHome>;
  return { uid, displayName: d.displayName ?? "여행자", minimi: d.minimi ?? "hallabong", concept: d.concept ?? "oreum", level: d.level ?? 1, background: d.background ?? "", specialMinimi: d.specialMinimi ?? "", customBgUrl: d.customBgUrl ?? "", bgmUrl: d.bgmUrl ?? "", photos: d.photos ?? [] };
}

/** BGM 유튜브 링크 저장 (쿨다운 없음). */
export async function setBgm(uid: string, url: string): Promise<void> {
  const u = String(url || "").trim();
  const val = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(u) ? u.slice(0, 200) : "";
  await getAdminDb().collection(COL).doc(uid).set({ bgmUrl: val, updatedAt: now() }, { merge: true });
}

/** 사진첩에 사진 추가 (URL 배열, 최대 30장). */
export async function addPhoto(uid: string, url: string): Promise<string[]> {
  const ref = getAdminDb().collection(COL).doc(uid);
  const cur = ((await ref.get()).data()?.photos as string[]) ?? [];
  const next = [url, ...cur].slice(0, 30);
  await ref.set({ photos: next, updatedAt: now() }, { merge: true });
  return next;
}

/** bg-custom 사진 업로드 후 장착 — 보유 검증. */
export async function setCustomBg(uid: string, url: string): Promise<void> {
  const ref = getAdminDb().collection(COL).doc(uid);
  const owned = ((await ref.get()).data()?.ownedItems as string[]) ?? [];
  if (!owned.includes("bg-custom")) throw new Error("내 사진 배경 아이템을 먼저 구매해주세요");
  await ref.set({ customBgUrl: url, background: "bg-custom", updatedAt: now() }, { merge: true });
}

export interface DecorResult { ok: boolean; reason?: string; nextChangeAt?: number; }

/**
 * 꾸미기 저장 — 미니미/방컨셉/배경/특별미니미.
 * ⚠️ 실제로 바뀌는 게 있으면 **주 1회 제한**(decorSavedAt). 동일값 재선택은 제한 안 함.
 * TODO: 유료 무제한 변경 권한 → 그때 cooldown 우회.
 */
export async function updateUserHome(
  uid: string,
  patch: { minimi?: MiniMiKind; concept?: RoomConcept; background?: string; specialMinimi?: string }
): Promise<DecorResult> {
  const ref = getAdminDb().collection(COL).doc(uid);
  const cur = (await ref.get()).data() ?? {};
  const owned = (cur.ownedItems as string[]) ?? [];
  const clean: Record<string, unknown> = {};

  if (patch.minimi && VALID_MINIMI.includes(patch.minimi) && patch.minimi !== cur.minimi) clean.minimi = patch.minimi;
  if (patch.concept && VALID_ROOM.includes(patch.concept) && patch.concept !== cur.concept) clean.concept = patch.concept;
  if (patch.background !== undefined) {
    const bg = patch.background;
    let resolved = "";
    if (bg === "bg-custom" && owned.includes("bg-custom")) resolved = "bg-custom";
    else if (bg && owned.includes(bg) && SHOP_ITEMS.find((i) => i.id === bg)?.asset) resolved = bg;
    if (resolved !== (cur.background ?? "")) clean.background = resolved;
  }
  if (patch.specialMinimi !== undefined) {
    const it = SHOP_ITEMS.find((i) => i.id === patch.specialMinimi);
    const resolved = patch.specialMinimi && owned.includes(patch.specialMinimi) && it?.category === "minimi" && it?.asset ? patch.specialMinimi : "";
    if (resolved !== (cur.specialMinimi ?? "")) clean.specialMinimi = resolved;
  }

  if (Object.keys(clean).length === 0) return { ok: true }; // 변경 없음

  const last = (cur.decorSavedAt as number) ?? 0;
  if (Date.now() - last < DECOR_COOLDOWN_MS) {
    return { ok: false, reason: "꾸미기는 주 1회만 변경할 수 있어요", nextChangeAt: last + DECOR_COOLDOWN_MS };
  }
  clean.decorSavedAt = Date.now();
  clean.updatedAt = now();
  await ref.set(clean, { merge: true });
  return { ok: true };
}

export interface BuyResult { ok: boolean; reason?: string; home?: UserHome; }

/** 아이템 구매 — 서버 카탈로그 가격으로 트랜잭션 검증. */
export async function buyItem(uid: string, itemId: string, displayName?: string): Promise<BuyResult> {
  const item = SHOP_ITEMS.find((i) => i.id === itemId);
  if (!item) return { ok: false, reason: "없는 상품입니다" };

  const db = getAdminDb();
  const ref = db.collection(COL).doc(uid);
  try {
    const home = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      let data: Omit<UserHome, "uid">;
      if (!snap.exists) {
        data = { displayName: displayName ?? "여행자", minimi: "hallabong", concept: "oreum", level: 1, xp: 0, bomal: STARTER_BOMAL, ownedItems: [], createdAt: now(), updatedAt: now() };
      } else {
        data = snap.data() as Omit<UserHome, "uid">;
      }
      if (data.ownedItems?.includes(itemId)) throw new Error("이미 보유한 상품입니다");
      if ((data.bomal ?? 0) < item.price) throw new Error("보말이 부족합니다");
      const next = {
        ...data,
        bomal: data.bomal - item.price,
        ownedItems: [...(data.ownedItems ?? []), itemId],
        updatedAt: now(),
      };
      tx.set(ref, next);
      return { uid, ...next } as UserHome;
    });
    return { ok: true, home };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "구매 실패" };
  }
}

export interface Progress { xp: number; level: number; bomal: number; leveledUp: boolean; }

/** 행동 보상 — XP(+선택적 보말) 지급, 레벨 재계산. 성장 시스템 핵심. */
export async function awardXp(uid: string, xp: number, bomal = 0): Promise<Progress> {
  const db = getAdminDb();
  const ref = db.collection(COL).doc(uid);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const d = snap.exists ? (snap.data() as Partial<UserHome>) : {};
    const prevXp = d.xp ?? 0;
    const prevLevel = d.level ?? levelForXp(prevXp);
    const newXp = prevXp + xp;
    const newLevel = levelForXp(newXp);
    const newBomal = (d.bomal ?? 0) + bomal;
    tx.set(ref, { xp: newXp, level: newLevel, bomal: newBomal, updatedAt: now() }, { merge: true });
    return { xp: newXp, level: newLevel, bomal: newBomal, leveledUp: newLevel > prevLevel };
  });
}
