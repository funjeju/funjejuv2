import "server-only";
import type { CctvLocation } from "@/types/cctv-location";
import seed from "@/locations.json";

/**
 * 카메라별 검색용 글(지역 소개·날씨 특징·확인 포인트·FAQ·가는 길·주변 명소·근처 카메라).
 *
 * 예전 /cctv/{id} 페이지가 쓰던 Firestore `cctv_locations` 를 그대로 쓴다(어드민에서 고친 최신본).
 * Firestore 를 못 읽는 환경(로컬 등)에서는 같은 내용의 시드 locations.json 으로 대신한다.
 * 이미 색인된 글을 이어받는 것이 목적이라 문구를 새로 짓지 않는다.
 */
const SEED = seed as CctvLocation[];

export async function getSkyLocation(id: string): Promise<CctvLocation | null> {
  try {
    const { getLocation } = await import("@/lib/cctv-location");
    const fresh = await getLocation(id);
    if (fresh) return fresh;
  } catch {
    // Firestore 자격 증명이 없거나 일시 오류 → 시드 사용
  }
  return SEED.find((l) => l.id === id) ?? null;
}
