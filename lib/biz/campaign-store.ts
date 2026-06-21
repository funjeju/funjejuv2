import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import { GROW_CAMPAIGNS, getCampaign, type Campaign, type CropType } from "./grow";

/**
 * 키우기 광고 캠페인 저장소 — grow_campaigns 컬렉션(어드민 등록).
 * 컬렉션이 비어있으면 코드 시드(GROW_CAMPAIGNS)로 폴백 → 어드민 등록 전에도 동작.
 * 어드민이 1개라도 등록하면 그때부터 Firestore 캠페인만 노출.
 */

const COL = "grow_campaigns";
const VALID_CROPS: CropType[] = ["hallabong", "heukdwaeji", "galchi", "jeonbok"];

export interface StoredCampaign extends Campaign { active: boolean; createdAt: string; }

export async function listCampaigns(activeOnly = false): Promise<Campaign[]> {
  const snap = await getAdminDb().collection(COL).orderBy("createdAt", "desc").get();
  if (snap.empty) return GROW_CAMPAIGNS; // 시드 폴백
  let list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<StoredCampaign, "id">) }));
  if (activeOnly) list = list.filter((c) => (c as StoredCampaign).active !== false);
  return list;
}

/** 캠페인 단건 — Firestore 우선, 없으면 코드 시드 폴백(기존 키우기 인스턴스 호환). */
export async function getCampaignById(id: string): Promise<Campaign | undefined> {
  const doc = await getAdminDb().collection(COL).doc(id).get();
  if (doc.exists) return { id, ...(doc.data() as Omit<Campaign, "id">) };
  return getCampaign(id);
}

export interface NewCampaign {
  advertiser: string; link: string; crop: CropType;
  growthDays: number; reward: number; slogan?: string;
}

export async function addCampaign(input: NewCampaign): Promise<StoredCampaign> {
  if (!input.advertiser?.trim()) throw new Error("상호를 입력해주세요");
  if (!VALID_CROPS.includes(input.crop)) throw new Error("작물을 선택해주세요");
  const data = {
    advertiser: input.advertiser.trim().slice(0, 40),
    link: (input.link || "").trim().slice(0, 300),
    crop: input.crop,
    growthDays: Math.max(1, Math.min(Number(input.growthDays) || 5, 30)),
    reward: Math.max(0, Math.min(Number(input.reward) || 100, 10000)),
    slogan: (input.slogan || "").slice(0, 60),
    active: true,
    createdAt: new Date().toISOString(),
  };
  const ref = await getAdminDb().collection(COL).add(data);
  return { id: ref.id, ...data };
}

export async function deleteCampaign(id: string): Promise<void> {
  await getAdminDb().collection(COL).doc(id).delete();
}

export async function setCampaignActive(id: string, active: boolean): Promise<void> {
  await getAdminDb().collection(COL).doc(id).update({ active });
}
