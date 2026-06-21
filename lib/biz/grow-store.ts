import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import type { CropType } from "./grow";
import { getCampaignById } from "./campaign-store";

/**
 * 키우기 인스턴스 저장소 — minihomes/{uid}/grows/{growId}.
 * 물주기: 하루 1회(24h 쿨다운, 서버 검증)로 stage++. stage==growthDays → 완성.
 * 완성 보상(보말)은 claim 시 minihomes/{uid}.bomal 에 가산(트랜잭션).
 */

const WATER_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const SUB = "grows";

export interface Grow {
  id: string;
  campaignId: string;
  advertiser: string;
  link: string;
  crop: CropType;
  growthDays: number;
  reward: number;
  stage: number;
  cheers: number;
  startedAt: string;
  lastWateredAt: number; // epoch ms (0=한번도 안 줌 → 즉시 가능)
  completed: boolean;
  rewardClaimed: boolean;
}

const now = () => Date.now();

export async function listGrows(uid: string): Promise<Grow[]> {
  const snap = await getAdminDb().collection("minihomes").doc(uid).collection(SUB).orderBy("startedAt", "desc").get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Grow, "id">) }));
}

export async function startGrow(uid: string, campaignId: string): Promise<Grow> {
  const c = await getCampaignById(campaignId);
  if (!c) throw new Error("없는 캠페인입니다");
  const ref = getAdminDb().collection("minihomes").doc(uid).collection(SUB);
  // 같은 캠페인 동시 진행 1개 제한
  const dup = await ref.where("campaignId", "==", campaignId).where("completed", "==", false).limit(1).get();
  if (!dup.empty) throw new Error("이미 기르는 중이에요");
  const data: Omit<Grow, "id"> = {
    campaignId, advertiser: c.advertiser, link: c.link, crop: c.crop, growthDays: c.growthDays, reward: c.reward,
    stage: 0, cheers: 0, startedAt: new Date().toISOString(), lastWateredAt: 0, completed: false, rewardClaimed: false,
  };
  const docRef = await ref.add(data);
  return { id: docRef.id, ...data };
}

export interface WaterResult { ok: boolean; reason?: string; grow?: Grow; nextWaterInMs?: number; }

export async function waterGrow(uid: string, growId: string): Promise<WaterResult> {
  const db = getAdminDb();
  const ref = db.collection("minihomes").doc(uid).collection(SUB).doc(growId);
  try {
    const grow = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("없는 키우기");
      const g = snap.data() as Omit<Grow, "id">;
      if (g.completed) throw new Error("이미 다 자랐어요");
      const elapsed = now() - (g.lastWateredAt || 0);
      if (elapsed < WATER_COOLDOWN_MS) {
        const err = new Error("아직 줄 수 없어요") as Error & { wait?: number };
        err.wait = WATER_COOLDOWN_MS - elapsed;
        throw err;
      }
      const stage = Math.min(g.stage + 1, g.growthDays);
      const completed = stage >= g.growthDays;
      const next = { ...g, stage, completed, lastWateredAt: now() };
      tx.set(ref, next);
      return { id: growId, ...next } as Grow;
    });
    return { ok: true, grow };
  } catch (e) {
    const we = e as Error & { wait?: number };
    return { ok: false, reason: we.message, nextWaterInMs: we.wait };
  }
}

/** 응원 — 방문객이 누른다. 자기 키우기 불가 + 응원자별 1일 1회. */
export async function cheerGrow(ownerUid: string, growId: string, cheererUid: string): Promise<number> {
  if (cheererUid === ownerUid) throw new Error("내 키우기는 응원할 수 없어요");
  const db = getAdminDb();
  const ref = db.collection("minihomes").doc(ownerUid).collection(SUB).doc(growId);
  const cheererRef = ref.collection("cheerers").doc(cheererUid);
  const day = new Date().toISOString().slice(0, 10);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("없는 키우기");
    const cs = await tx.get(cheererRef);
    if (cs.exists && (cs.data()?.date as string) === day) throw new Error("오늘은 이미 응원했어요");
    const g = snap.data() as Omit<Grow, "id">;
    const cheers = (g.cheers || 0) + 1;
    tx.update(ref, { cheers });
    tx.set(cheererRef, { date: day });
    return cheers;
  });
}

export interface ClaimResult { ok: boolean; reason?: string; reward?: number; bomal?: number; }

export async function claimReward(uid: string, growId: string): Promise<ClaimResult> {
  const db = getAdminDb();
  const homeRef = db.collection("minihomes").doc(uid);
  const growRef = homeRef.collection(SUB).doc(growId);
  try {
    const res = await db.runTransaction(async (tx) => {
      const gs = await tx.get(growRef);
      if (!gs.exists) throw new Error("없는 키우기");
      const g = gs.data() as Omit<Grow, "id">;
      if (!g.completed) throw new Error("아직 다 안 자랐어요");
      if (g.rewardClaimed) throw new Error("이미 보상을 받았어요");
      const hs = await tx.get(homeRef);
      const bomal = ((hs.data()?.bomal as number) ?? 0) + g.reward;
      tx.update(homeRef, { bomal, updatedAt: new Date().toISOString() });
      tx.update(growRef, { rewardClaimed: true });
      return { reward: g.reward, bomal };
    });
    return { ok: true, ...res };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "보상 실패" };
  }
}
