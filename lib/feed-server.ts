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
      const v = d.data() as { imageUrl?: string; authorId?: string; placeName?: string; regionName?: string };
      if (!v.imageUrl) continue;
      photos.push({
        imageUrl: v.imageUrl,
        placeName: v.placeName,
        regionName: v.regionName,
        _admin: !!adminUid && v.authorId === adminUid,
      });
    }

    // 관리자 사진 우선, 그 외엔 최신순(이미 정렬됨) 유지
    photos.sort((a, b) => Number(b._admin) - Number(a._admin));

    return photos.slice(0, max).map(({ imageUrl, placeName, regionName }) => ({ imageUrl, placeName, regionName }));
  } catch (err) {
    console.error("[feed-server] listFeedPhotos failed:", err);
    return [];
  }
}
