import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";

/**
 * 카드뉴스 설정 — 실시간 날씨 브리핑에 쓸 CCTV 카메라 목록 등.
 * Firestore `app_config/cardnews` 단일 문서.
 */
const DOC = ["app_config", "cardnews"] as const;

export type CardNewsConfig = {
  /** 실시간 날씨 브리핑용 카메라 id (동·서·남·북 2개씩 권장, 총 8) */
  weatherCameraIds: string[];
};

const DEFAULT: CardNewsConfig = { weatherCameraIds: [] };

export async function getCardNewsConfig(): Promise<CardNewsConfig> {
  const snap = await getAdminDb().collection(DOC[0]).doc(DOC[1]).get();
  if (!snap.exists) return DEFAULT;
  const d = snap.data() as Partial<CardNewsConfig>;
  return { weatherCameraIds: Array.isArray(d.weatherCameraIds) ? d.weatherCameraIds : [] };
}

export async function setWeatherCameras(ids: string[]): Promise<void> {
  await getAdminDb().collection(DOC[0]).doc(DOC[1]).set({ weatherCameraIds: ids }, { merge: true });
}
