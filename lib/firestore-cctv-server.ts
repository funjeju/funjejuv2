import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import type { CctvEntry } from "@/types/cctv";
import { getDirection } from "@/constants/cctv-directions";

function docToEntry(id: string, data: Record<string, unknown>): CctvEntry {
  return {
    id,
    name: (data.name as string) ?? "",
    region: (data.region as string) ?? "",
    direction: (data.direction as CctvEntry["direction"]) ?? getDirection((data.region as string) ?? ""),
    category: (data.category as string) ?? "기타",
    originUrl: (data.originUrl as string) ?? "",
    youtubeId: (data.youtubeId as string) || undefined,
    active: !!data.active,
    description: (data.description as string) ?? "",
    lat: data.lat as number,
    lng: data.lng as number,
    addedAt: (data.addedAt as { toDate?: () => Date })?.toDate?.()?.toISOString(),
  };
}

/** 서버 사이드 단건 조회 (Admin SDK) */
export async function getCctvById(id: string): Promise<CctvEntry | null> {
  try {
    const db = getAdminDb();
    const snap = await db.collection("cctvs").doc(id).get();
    if (!snap.exists) return null;
    return docToEntry(snap.id, snap.data() as Record<string, unknown>);
  } catch {
    return null;
  }
}

/** 서버 사이드 같은 지역 N개 조회 */
export async function getNearbyCctvs(region: string, excludeId: string, limit = 3): Promise<CctvEntry[]> {
  try {
    const db = getAdminDb();
    const snap = await db.collection("cctvs")
      .where("region", "==", region)
      .where("active", "==", true)
      .limit(limit + 1)
      .get();
    return snap.docs
      .map((d) => docToEntry(d.id, d.data() as Record<string, unknown>))
      .filter((c) => c.id !== excludeId)
      .slice(0, limit);
  } catch {
    return [];
  }
}
