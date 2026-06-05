/** Firestore places 컬렉션 REST 클라이언트 (서버 전용) */
import "server-only";

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!;
const API_KEY    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY!;
const FS_BASE    = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

export type Place = {
  id: string;
  place_name: string;
  description: string;
  expert_tip: string;
  region: string;
  address: string;
  categories: string[];
  categories_kr: string[];
  tags: string[];
  withPets: boolean;
  withKids: boolean;
  admissionFee: string;
  recommendedSeasons: string[];
  targetAudience: string[];
  lat: number;
  lng: number;
  imageUrl: string;
  phone: string;
  website: string;
  hours: string;
  distKm?: number;
};

// ── Firestore typed-value → JS ────────────────────────────
function fv(v: Record<string, unknown> | undefined): unknown {
  if (!v) return null;
  if ("stringValue"  in v) return v.stringValue;
  if ("doubleValue"  in v) return v.doubleValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("booleanValue" in v) return v.booleanValue;
  if ("arrayValue"   in v) {
    const arr = v.arrayValue as { values?: Record<string, unknown>[] };
    return (arr.values ?? []).map(fv);
  }
  return null;
}

function docToPlace(doc: { name?: string; fields?: Record<string, Record<string, unknown>> }): Place | null {
  if (!doc.fields) return null;
  const f = doc.fields;
  const id = doc.name?.split("/").pop() ?? "";
  return {
    id,
    place_name:         fv(f.place_name) as string ?? "",
    description:        fv(f.description) as string ?? "",
    expert_tip:         fv(f.expert_tip) as string ?? "",
    region:             fv(f.region) as string ?? "",
    address:            fv(f.address) as string ?? "",
    categories:         (fv(f.categories) as string[]) ?? [],
    categories_kr:      (fv(f.categories_kr) as string[]) ?? [],
    tags:               (fv(f.tags) as string[]) ?? [],
    withPets:           !!fv(f.withPets),
    withKids:           !!fv(f.withKids),
    admissionFee:       fv(f.admissionFee) as string ?? "",
    recommendedSeasons: (fv(f.recommendedSeasons) as string[]) ?? [],
    targetAudience:     (fv(f.targetAudience) as string[]) ?? [],
    lat:                fv(f.lat) as number ?? 0,
    lng:                fv(f.lng) as number ?? 0,
    imageUrl:           fv(f.imageUrl) as string ?? "",
    phone:              fv(f.phone) as string ?? "",
    website:            fv(f.website) as string ?? "",
    hours:              fv(f.hours) as string ?? "",
  };
}

// ── 캐시 ──────────────────────────────────────────────────
type CacheEntry<T> = { data: T; ts: number };
const cache = new Map<string, CacheEntry<unknown>>();
const TTL_MS = 5 * 60 * 1000; // 5분

function getCache<T>(key: string): T | null {
  const e = cache.get(key) as CacheEntry<T> | undefined;
  if (e && Date.now() - e.ts < TTL_MS) return e.data;
  return null;
}
function setCache<T>(key: string, data: T) {
  cache.set(key, { data, ts: Date.now() });
}

// ── 1) 단건 조회 ──────────────────────────────────────────
export async function getPlaceById(id: string): Promise<Place | null> {
  const cached = getCache<Place>(`get_${id}`);
  if (cached) return cached;

  const res = await fetch(
    `${FS_BASE}/places/${encodeURIComponent(id)}?key=${API_KEY}`,
    { signal: AbortSignal.timeout(5000) }
  );
  if (!res.ok) return null;
  const doc = await res.json();
  const place = docToPlace(doc);
  if (place) setCache(`get_${id}`, place);
  return place;
}

// ── 2) 검색·필터·페이징 ───────────────────────────────────
export type SearchParams = {
  category?: string;
  region?: string;
  q?: string;
  withPets?: boolean;
  withKids?: boolean;
  pageSize?: number;
  pageToken?: string;
};

export type SearchResult = {
  places: Place[];
  nextPageToken?: string;
  total?: number;
};

export async function searchPlaces(params: SearchParams): Promise<SearchResult> {
  const cacheKey = `search_${JSON.stringify(params)}`;
  const cached = getCache<SearchResult>(cacheKey);
  if (cached) return cached;

  const pageSize = Math.min(params.pageSize ?? 30, 100);
  const filters: Array<Record<string, unknown>> = [];

  // category: arrayContains
  if (params.category) {
    filters.push({
      fieldFilter: {
        field: { fieldPath: "categories" },
        op: "ARRAY_CONTAINS",
        value: { stringValue: params.category },
      },
    });
  }
  // region: equal
  if (params.region) {
    filters.push({
      fieldFilter: {
        field: { fieldPath: "region" },
        op: "EQUAL",
        value: { stringValue: params.region },
      },
    });
  }
  // withPets
  if (params.withPets) {
    filters.push({
      fieldFilter: {
        field: { fieldPath: "withPets" },
        op: "EQUAL",
        value: { booleanValue: true },
      },
    });
  }
  // withKids
  if (params.withKids) {
    filters.push({
      fieldFilter: {
        field: { fieldPath: "withKids" },
        op: "EQUAL",
        value: { booleanValue: true },
      },
    });
  }

  // 빈 필터면 전체 (orderBy로 첫 page만)
  const query: Record<string, unknown> = {
    structuredQuery: {
      from: [{ collectionId: "places" }],
      limit: pageSize,
      ...(filters.length > 0 && {
        where: filters.length === 1
          ? filters[0]
          : { compositeFilter: { op: "AND", filters } },
      }),
    },
  };

  const res = await fetch(`${FS_BASE}:runQuery?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(query),
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Firestore ${res.status}: ${err.slice(0, 200)}`);
  }

  const rows = (await res.json()) as Array<{ document?: { name?: string; fields?: Record<string, Record<string, unknown>> } }>;
  let places: Place[] = [];
  for (const row of rows) {
    if (!row.document) continue;
    const p = docToPlace(row.document);
    if (p) places.push(p);
  }

  // 클라이언트 사이드 텍스트 검색 (q 파라미터)
  if (params.q) {
    const q = params.q.toLowerCase();
    places = places.filter((p) =>
      p.place_name.toLowerCase().includes(q)
      || p.description.toLowerCase().includes(q)
      || p.region.toLowerCase().includes(q)
      || p.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  const result: SearchResult = { places };
  setCache(cacheKey, result);
  return result;
}

// ── 3) 지도 영역 쿼리 (lat/lng 범위) ───────────────────────
export async function queryPlacesInBounds(
  swLat: number, swLng: number,
  neLat: number, neLng: number,
  category?: string,
  maxResults = 200
): Promise<Place[]> {
  const cacheKey = `bounds_${swLat.toFixed(2)}_${swLng.toFixed(2)}_${neLat.toFixed(2)}_${neLng.toFixed(2)}_${category ?? "all"}`;
  const cached = getCache<Place[]>(cacheKey);
  if (cached) return cached;

  const filters: Array<Record<string, unknown>> = [
    { fieldFilter: { field: { fieldPath: "lat" }, op: "GREATER_THAN_OR_EQUAL", value: { doubleValue: swLat } } },
    { fieldFilter: { field: { fieldPath: "lat" }, op: "LESS_THAN_OR_EQUAL",    value: { doubleValue: neLat } } },
  ];
  if (category) {
    filters.push({
      fieldFilter: {
        field: { fieldPath: "categories" },
        op: "ARRAY_CONTAINS",
        value: { stringValue: category },
      },
    });
  }

  const query = {
    structuredQuery: {
      from: [{ collectionId: "places" }],
      where: { compositeFilter: { op: "AND", filters } },
      limit: maxResults,
    },
  };

  const res = await fetch(`${FS_BASE}:runQuery?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(query),
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) return [];

  const rows = (await res.json()) as Array<{ document?: { name?: string; fields?: Record<string, Record<string, unknown>> } }>;
  const places: Place[] = [];
  for (const row of rows) {
    if (!row.document) continue;
    const p = docToPlace(row.document);
    if (!p) continue;
    // lng 후처리 필터
    if (p.lng < swLng || p.lng > neLng) continue;
    places.push(p);
  }

  setCache(cacheKey, places);
  return places;
}

// ── 4) 근처 추천 (같은 지역 N개) ────────────────────────────
export async function getNearbyPlaces(place: Place, limit = 6): Promise<Place[]> {
  const result = await searchPlaces({ region: place.region, pageSize: limit + 10 });
  return result.places
    .filter((p) => p.id !== place.id)
    .slice(0, limit);
}
