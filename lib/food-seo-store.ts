import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import { ruleFoodSeo, type FoodSeoData } from "@/lib/food-seo";
import type { Restaurant } from "@/types/restaurant";

/**
 * 도민맛집 SEO — AI 보강(override) 레이어 (하이브리드의 AI 부분).
 *
 * 룰 레이어(ruleFoodSeo)가 589개 토대를 비용0으로 깐다.
 * 상위 트래픽 맛집만 Gemini로 1회 고유 설명을 생성해 `food_seo/{id}`에 캐싱하고,
 * 룰 결과를 override한다 (CCTV의 SPECIAL_SEO와 동일 패턴).
 * Admin SDK 전용이라 firestore.rules 불필요.
 */

const COLLECTION = "food_seo";

export type FoodSeoOverride = {
  id: string;
  intro?: string;
  faqs?: { q: string; a: string }[];
  highlights?: string[];
  keywords?: string[];
  generatedAt?: string;
};

export async function getFoodSeoOverride(id: string): Promise<FoodSeoOverride | null> {
  try {
    const snap = await getAdminDb().collection(COLLECTION).doc(id).get();
    return snap.exists ? (snap.data() as FoodSeoOverride) : null;
  } catch {
    return null;
  }
}

export async function saveFoodSeoOverride(o: FoodSeoOverride): Promise<void> {
  await getAdminDb()
    .collection(COLLECTION)
    .doc(o.id)
    .set({ ...o, generatedAt: new Date().toISOString() }, { merge: true });
}

export async function listFoodSeoOverrides(): Promise<FoodSeoOverride[]> {
  try {
    const snap = await getAdminDb().collection(COLLECTION).get();
    return snap.docs.map((d) => d.data() as FoodSeoOverride);
  } catch {
    return [];
  }
}

/** 룰 + AI override 병합. override 필드가 있으면 그걸로 덮어쓴다. */
export async function getFoodSeo(r: Restaurant): Promise<FoodSeoData> {
  const rule = ruleFoodSeo(r);
  const ov = await getFoodSeoOverride(r.id);
  if (!ov) return rule;
  return {
    ...rule,
    ...(ov.intro ? { intro: ov.intro } : {}),
    ...(ov.faqs?.length ? { faqs: ov.faqs } : {}),
    ...(ov.highlights?.length ? { highlights: ov.highlights } : {}),
    keywords: [...rule.keywords, ...(ov.keywords ?? [])],
  };
}
