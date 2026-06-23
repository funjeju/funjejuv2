import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import type { RegionKey, ThemeKey } from "@/lib/spot-guide";

/**
 * 가볼만한곳(비짓제주 관광지) 읽기 전용 스토어.
 * ⚠️ sharp(이미지 처리)는 적재(spot-ingest)에만 두고, 읽기는 여기로 분리 —
 * 카드뉴스·웹진 등 읽기 경로가 sharp 네이티브 모듈에 묶이지 않게 한다.
 */

export const ATTRACTIONS_COLL = "attractions";

export type Attraction = {
  contentsid: string;
  title: string;
  address: string;
  lat: number | null;
  lng: number | null;
  intro: string;
  region: RegionKey;
  themes: ThemeKey[];
  image: string;      // 우리 스토리지 URL
  imageUrl: string;   // 비짓제주 원본 URL (폴백)
  source: "visitjeju";
  createdAt: Date;
};

/** 적재된 관광지 전체 로드 (생성 토픽 선정용) */
export async function loadAttractions(): Promise<(Attraction & { id: string })[]> {
  const snap = await getAdminDb().collection(ATTRACTIONS_COLL).get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Attraction) }));
}
