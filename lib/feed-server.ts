import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";

/**
 * 모닝브리핑 매거진 표지/카드용 — 제주피드 사진을 서버(Admin SDK)에서 읽는다.
 * 관리자 계정이 올린 사진을 우선하되, 부족하면 최신 피드 사진으로 채운다.
 */

const ADMIN_EMAIL = "naggu1999@gmail.com";

export type FeedPhoto = {
  imageUrl: string;
  placeName?: string;
  regionName?: string;
};

/** users 컬렉션에서 관리자 uid 해석 (email 필드 기반). 못 찾으면 null. */
async function resolveAdminUid(): Promise<string | null> {
  try {
    const snap = await getAdminDb().collection("users").where("email", "==", ADMIN_EMAIL).limit(1).get();
    return snap.empty ? null : snap.docs[0].id;
  } catch {
    return null;
  }
}

/**
 * 최신 피드 사진 N장. 관리자 사진 우선 정렬.
 * 복합 인덱스 회피를 위해 단순 createdAt desc 조회 후 메모리 정렬.
 */
export async function listFeedPhotos(max = 12): Promise<FeedPhoto[]> {
  try {
    const adminUid = await resolveAdminUid();
    const snap = await getAdminDb()
      .collection("feeds")
      .orderBy("createdAt", "desc")
      .limit(80)
      .get();

    type Row = FeedPhoto & { _admin: boolean };
    const photos: Row[] = [];
    for (const d of snap.docs) {
      const v = d.data() as { imageUrl?: string; images?: string[]; authorId?: string; placeName?: string; regionName?: string };
      // 한 피드에 사진이 여러 장이면 전부 후보로 사용 (images[]가 있으면 그대로, 없으면 대표 1장)
      const imgs = (Array.isArray(v.images) && v.images.length > 0) ? v.images : (v.imageUrl ? [v.imageUrl] : []);
      const isAdmin = !!adminUid && v.authorId === adminUid;
      for (const url of imgs) {
        if (!url) continue;
        photos.push({ imageUrl: url, placeName: v.placeName, regionName: v.regionName, _admin: isAdmin });
      }
    }

    // 관리자 사진 우선, 그 외엔 최신순(이미 정렬됨) 유지
    photos.sort((a, b) => Number(b._admin) - Number(a._admin));

    return photos.slice(0, max).map(({ imageUrl, placeName, regionName }) => ({ imageUrl, placeName, regionName }));
  } catch (err) {
    console.error("[feed-server] listFeedPhotos failed:", err);
    return [];
  }
}

export type FeedRich = {
  imageUrl: string;
  placeName?: string;
  regionName?: string;
  regionCity?: string;
  category?: string;
  aiCopy?: string;
  exif?: { camera?: string; lens?: string; focalLength?: string; fStop?: string; iso?: number; date?: string };
  gps?: { lat: number; lng: number };
};

/** 웹진(피드 기반)용 — 최신 피드의 사진+EXIF+장소 상세를 읽는다. */
export async function listRecentFeedsRich(max = 8): Promise<FeedRich[]> {
  try {
    const snap = await getAdminDb().collection("feeds").orderBy("createdAt", "desc").limit(40).get();
    const rows: FeedRich[] = [];
    for (const d of snap.docs) {
      const v = d.data() as Record<string, unknown>;
      const imageUrl = (v.images as string[] | undefined)?.[0] ?? (v.imageUrl as string | undefined);
      if (!imageUrl) continue;
      rows.push({
        imageUrl,
        placeName: v.placeName as string | undefined,
        regionName: v.regionName as string | undefined,
        regionCity: v.regionCity as string | undefined,
        category: v.category as string | undefined,
        aiCopy: v.aiCopy as string | undefined,
        exif: v.exif as FeedRich["exif"],
        gps: v.gps as FeedRich["gps"],
      });
    }
    return rows.slice(0, max);
  } catch (err) {
    console.error("[feed-server] listRecentFeedsRich failed:", err);
    return [];
  }
}
