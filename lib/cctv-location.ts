import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import type { CctvLocation } from "@/types/cctv-location";

/**
 * CCTV 지역 SEO 데이터 저장소 (Firestore `cctv_locations`, 문서 id = cctv id).
 * Admin SDK — 규칙 불필요. 어드민에서 편집, /cctv/[id] · 허브 페이지가 읽음.
 */
const COLLECTION = "cctv_locations";

export async function getLocation(id: string): Promise<CctvLocation | null> {
  const snap = await getAdminDb().collection(COLLECTION).doc(id).get();
  return snap.exists ? (snap.data() as CctvLocation) : null;
}

export async function listLocations(): Promise<CctvLocation[]> {
  const snap = await getAdminDb().collection(COLLECTION).get();
  return snap.docs.map((d) => d.data() as CctvLocation);
}

export async function listLocationsByGroup(group: string): Promise<CctvLocation[]> {
  const snap = await getAdminDb().collection(COLLECTION).where("group", "==", group).get();
  return snap.docs.map((d) => d.data() as CctvLocation);
}

/** 어드민 저장 — 실제 콘텐츠 변경 시에만 호출(updatedAt 갱신은 호출부 책임) */
export async function upsertLocation(loc: CctvLocation): Promise<void> {
  await getAdminDb().collection(COLLECTION).doc(loc.id).set(loc, { merge: true });
}
