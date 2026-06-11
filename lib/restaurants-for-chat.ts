import "server-only";
import { loadAllRestaurants, stripHtml } from "@/lib/restaurants";

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!;
const API_KEY    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY!;
const FS_BASE    = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

export type ChatRestaurant = {
  id:          string;
  name:        string;
  region:      string;
  menu:        string;
  shortDesc:   string;
  options:     string;
  source:      "json" | "firestore";
  thumbnail?:  string | null;
  phone?:      string;
  hours?:      string;
  address?:    string;
  lat?:        number;
  lng?:        number;
  distanceKm?: number;  // GPS 기반 정렬 시 채움
};

type FSField = {
  stringValue?: string;
  doubleValue?: number;
  integerValue?: string;
  arrayValue?: { values?: Array<{ stringValue?: string }> };
};
type FSDoc = { name?: string; fields?: Record<string, FSField> };

let hiddenCache: { ids: Set<string>; ts: number } | null = null;
let fsCache:     { items: ChatRestaurant[]; ts: number } | null = null;
const TTL = 5 * 60 * 1000; // 5분 캐시

async function getHidden(): Promise<Set<string>> {
  if (hiddenCache && Date.now() - hiddenCache.ts < TTL) return hiddenCache.ids;
  try {
    const res = await fetch(`${FS_BASE}/restaurants_meta/hidden?key=${API_KEY}`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) { hiddenCache = { ids: new Set(), ts: Date.now() }; return new Set(); }
    const data = await res.json() as { fields?: { ids?: { arrayValue?: { values?: Array<{ stringValue?: string }> } } } };
    const ids = new Set((data.fields?.ids?.arrayValue?.values ?? []).map((v) => v.stringValue ?? "").filter(Boolean));
    hiddenCache = { ids, ts: Date.now() };
    return ids;
  } catch {
    return new Set();
  }
}

async function getFirestoreNew(): Promise<ChatRestaurant[]> {
  if (fsCache && Date.now() - fsCache.ts < TTL) return fsCache.items;
  try {
    const res = await fetch(`${FS_BASE}/restaurants?key=${API_KEY}&pageSize=500`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) { fsCache = { items: [], ts: Date.now() }; return []; }
    const data = await res.json() as { documents?: FSDoc[] };
    const items: ChatRestaurant[] = [];
    for (const doc of data.documents ?? []) {
      const f = doc.fields ?? {};
      const fsLat = f.lat?.doubleValue ?? (f.lat?.integerValue ? Number(f.lat.integerValue) : undefined);
      const fsLng = f.lng?.doubleValue ?? (f.lng?.integerValue ? Number(f.lng.integerValue) : undefined);
      items.push({
        id:        doc.name?.split("/").pop() ?? "",
        thumbnail: f.imageUrl?.stringValue || null,
        name:      f.title?.stringValue ?? "",
        region:    f.region?.stringValue ?? "",
        menu:      f.menu?.stringValue ?? "",
        shortDesc: (f.description?.stringValue ?? "").slice(0, 100),
        options:   (f.options?.arrayValue?.values ?? []).map((v) => v.stringValue).join(", "),
        phone:     f.phone?.stringValue ?? "",
        hours:     f.hours?.stringValue ?? "",
        address:   f.address?.stringValue,
        lat:       fsLat,
        lng:       fsLng,
        source:    "firestore",
      });
    }
    fsCache = { items, ts: Date.now() };
    return items;
  } catch {
    return [];
  }
}

/** 챗봇용 통합 도민맛집 (Firestore 신규 + JSON, 숨김 제외) */
export async function loadAllChatRestaurants(): Promise<ChatRestaurant[]> {
  const [jsonAll, fsNew, hidden] = await Promise.all([
    loadAllRestaurants(),
    getFirestoreNew(),
    getHidden(),
  ]);
  const jsonItems: ChatRestaurant[] = jsonAll
    .filter((r) => !hidden.has(r.id))
    .map((r) => ({
      id:        r.id,
      thumbnail: r.images?.[0] ? `/restaurant-images/${r.images[0]}` : null,
      name:      r.title,
      region:    r.region,
      menu:      r.menu,
      shortDesc: stripHtml(r.content, 100),
      options:   r.options.replace(/\|/g, " "),
      address:   r.address,
      // domin_food.json의 lat/lng는 문자열 → 숫자 변환 (GPS 거리 정렬에 필수)
      lat:       r.lat && !isNaN(Number(r.lat)) ? Number(r.lat) : undefined,
      lng:       r.lng && !isNaN(Number(r.lng)) ? Number(r.lng) : undefined,
      source:    "json",
    }));
  return [...fsNew, ...jsonItems];
}

// 거리 계산 (Haversine 근사 — 제주 규모에선 충분히 정확)
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = (lat1 - lat2) * 111;
  const dLng = (lng1 - lng2) * 111 * Math.cos(((lat1 + lat2) / 2) * Math.PI / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

/** 키워드 기반 도민맛집 매칭 (지역·메뉴·이름·GPS) */
export async function findRelevantRestaurants(
  query: {
    region?: string;
    menuKeywords?: string[];
    nameKeywords?: string[];
    userLat?: number;
    userLng?: number;
    radiusKm?: number;
  }
): Promise<ChatRestaurant[]> {
  const all = await loadAllChatRestaurants();
  let results = all;

  if (query.menuKeywords && query.menuKeywords.length > 0) {
    results = results.filter((x) =>
      query.menuKeywords!.some((kw) =>
        x.menu.includes(kw) || x.name.includes(kw) || x.shortDesc.includes(kw)
      )
    );
  }

  if (query.nameKeywords && query.nameKeywords.length > 0) {
    const before = results;
    const matched = results.filter((x) =>
      query.nameKeywords!.some((kw) => x.name.includes(kw))
    );
    results = matched.length > 0 ? matched : before;
  }

  // GPS가 있으면 거리 계산 후 가까운 순 정렬 (region 필터보다 우선)
  if (typeof query.userLat === "number" && typeof query.userLng === "number") {
    const uLat = query.userLat;
    const uLng = query.userLng;
    const radius = query.radiusKm ?? 7;
    const withDist = (list: ChatRestaurant[]): ChatRestaurant[] => {
      const out: ChatRestaurant[] = [];
      for (const x of list) {
        if (typeof x.lat !== "number" || typeof x.lng !== "number") continue;
        out.push({ ...x, distanceKm: distanceKm(uLat, uLng, x.lat, x.lng) });
      }
      return out.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    };

    results = withDist(results).filter((x) => (x.distanceKm ?? Infinity) <= radius);

    // 반경 안 결과가 너무 적으면 반경 확장
    if (results.length < 3) {
      results = withDist(all);
      if (query.menuKeywords && query.menuKeywords.length > 0) {
        results = results.filter((x) =>
          query.menuKeywords!.some((kw) =>
            x.menu.includes(kw) || x.name.includes(kw) || x.shortDesc.includes(kw)
          )
        );
      }
    }
    return results.slice(0, 8);
  }

  // GPS 없으면 region 필터 (기존 동작)
  if (query.region) {
    const r = query.region;
    results = results.filter((x) => x.region.includes(r) || r.includes(x.region));
  }

  return results.sort((a, b) => (a.source === "firestore" ? -1 : 1)).slice(0, 8);
}
