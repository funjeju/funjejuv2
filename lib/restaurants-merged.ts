import "server-only";
import { loadAllRestaurants, stripHtml } from "@/lib/restaurants";
import type { RestaurantSummary } from "@/types/restaurant";

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!;
const API_KEY    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY!;
const FS_BASE    = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

/** Firestore REST로 신규 맛집 + hidden ID 조회 (서버 사이드용) */
async function fetchFirestoreData(): Promise<{
  newRestaurants: RestaurantSummary[];
  hiddenIds: Set<string>;
}> {
  const [newRes, hiddenRes] = await Promise.all([
    fetch(`${FS_BASE}/restaurants?key=${API_KEY}&pageSize=500`, {
      next: { revalidate: 60 },  // 1분 캐시
    }),
    fetch(`${FS_BASE}/restaurants_meta/hidden?key=${API_KEY}`, {
      next: { revalidate: 60 },
    }),
  ]);

  const newRestaurants: RestaurantSummary[] = [];
  if (newRes.ok) {
    const data = (await newRes.json()) as { documents?: Array<{ name?: string; fields?: Record<string, { stringValue?: string; doubleValue?: number; integerValue?: string; arrayValue?: { values?: Array<{ stringValue?: string }> } }> }> };
    for (const docu of data.documents ?? []) {
      const id = docu.name?.split("/").pop() ?? "";
      const f = docu.fields ?? {};
      const fsLat = f.lat?.doubleValue ?? (f.lat?.integerValue ? Number(f.lat.integerValue) : undefined);
      const fsLng = f.lng?.doubleValue ?? (f.lng?.integerValue ? Number(f.lng.integerValue) : undefined);
      newRestaurants.push({
        id,
        title: f.title?.stringValue ?? "",
        region: f.region?.stringValue ?? "",
        menu: f.menu?.stringValue ?? "",
        options: (f.options?.arrayValue?.values ?? [])
          .map((v) => v.stringValue ?? "")
          .join("|"),
        thumbnail: f.imageUrl?.stringValue || null,
        shortDescription: stripHtml(f.description?.stringValue ?? "", 80),
        address: f.address?.stringValue || undefined,
        lat: fsLat,
        lng: fsLng,
      });
    }
  }

  let hiddenIds = new Set<string>();
  if (hiddenRes.ok) {
    const data = (await hiddenRes.json()) as { fields?: { ids?: { arrayValue?: { values?: Array<{ stringValue?: string }> } } } };
    const ids = data.fields?.ids?.arrayValue?.values ?? [];
    hiddenIds = new Set(ids.map((v) => v.stringValue ?? "").filter(Boolean));
  }

  return { newRestaurants, hiddenIds };
}

/** JSON 맛집 (hidden 제외) + Firestore 신규 맛집 */
export async function loadMergedRestaurants(): Promise<RestaurantSummary[]> {
  const [jsonAll, { newRestaurants, hiddenIds }] = await Promise.all([
    loadAllRestaurants(),
    fetchFirestoreData().catch(() => ({ newRestaurants: [], hiddenIds: new Set<string>() })),
  ]);

  const jsonSummaries: RestaurantSummary[] = jsonAll
    .filter((r) => !hiddenIds.has(r.id))
    .map((r) => ({
      id: r.id,
      title: r.title,
      region: r.region,
      menu: r.menu,
      options: r.options,
      thumbnail: r.images?.[0] ? `/restaurant-images/${r.images[0]}` : null,
      shortDescription: stripHtml(r.content, 80),
      address: r.address,
      lat: r.lat,
      lng: r.lng,
    }));

  // 신규를 위로 (최신순)
  return [...newRestaurants, ...jsonSummaries];
}

/** 합쳐진 필터 옵션 */
export async function getMergedFilters(): Promise<{ regions: string[]; menus: string[] }> {
  const merged = await loadMergedRestaurants();
  const regions = [...new Set(merged.map((r) => r.region).filter(Boolean))].sort();
  const menus = [...new Set(merged.map((r) => r.menu).filter(Boolean))].sort();
  return { regions, menus };
}
