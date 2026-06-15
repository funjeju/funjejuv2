import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";

/**
 * 카드뉴스 설정 — 실시간 날씨 브리핑용 CCTV 카메라(오전/오후 세트).
 * Firestore `app_config/cardnews` 단일 문서.
 */
const DOC = ["app_config", "cardnews"] as const;

export type CardNewsConfig = {
  weatherAm: string[]; // 오전 세트
  weatherPm: string[]; // 오후 세트
};

const DEFAULT: CardNewsConfig = { weatherAm: [], weatherPm: [] };

export async function getCardNewsConfig(): Promise<CardNewsConfig> {
  const snap = await getAdminDb().collection(DOC[0]).doc(DOC[1]).get();
  if (!snap.exists) return DEFAULT;
  const d = snap.data() as Partial<CardNewsConfig> & { weatherCameraIds?: string[] };
  const legacy = Array.isArray(d.weatherCameraIds) ? d.weatherCameraIds : [];
  return {
    weatherAm: Array.isArray(d.weatherAm) ? d.weatherAm : legacy,
    weatherPm: Array.isArray(d.weatherPm) ? d.weatherPm : legacy,
  };
}

/** 현재 시각(KST) 기준 오전/오후 세트 선택. slot 강제 가능. */
export async function getWeatherCamerasForNow(slot?: "am" | "pm"): Promise<string[]> {
  const cfg = await getCardNewsConfig();
  const kstHour = (new Date().getUTCHours() + 9) % 24;
  const use = slot ?? (kstHour < 12 ? "am" : "pm");
  const list = use === "am" ? cfg.weatherAm : cfg.weatherPm;
  return list.length ? list : (cfg.weatherAm.length ? cfg.weatherAm : cfg.weatherPm);
}

export async function setWeatherCameras(am: string[], pm: string[]): Promise<void> {
  await getAdminDb().collection(DOC[0]).doc(DOC[1]).set({ weatherAm: am, weatherPm: pm }, { merge: true });
}
