import "server-only";
import { loadAllRestaurants, stripHtml } from "@/lib/restaurants";

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!;
const API_KEY    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY!;
const FS_BASE    = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

export type ChatRestaurant = {
  name:        string;
  region:      string;
  menu:        string;
  shortDesc:   string;
  options:     string;
  source:      "json" | "firestore";
  phone?:      string;
  hours?:      string;
};

type FSField = {
  stringValue?: string;
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
      items.push({
        name:      f.title?.stringValue ?? "",
        region:    f.region?.stringValue ?? "",
        menu:      f.menu?.stringValue ?? "",
        shortDesc: (f.description?.stringValue ?? "").slice(0, 100),
        options:   (f.options?.arrayValue?.values ?? []).map((v) => v.stringValue).join(", "),
        phone:     f.phone?.stringValue ?? "",
        hours:     f.hours?.stringValue ?? "",
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
      name:      r.title,
      region:    r.region,
      menu:      r.menu,
      shortDesc: stripHtml(r.content, 100),
      options:   r.options.replace(/\|/g, " "),
      source:    "json",
    }));
  return [...fsNew, ...jsonItems];
}

/** 키워드 기반 도민맛집 매칭 (지역·메뉴·이름) */
export async function findRelevantRestaurants(
  query: { region?: string; menuKeywords?: string[]; nameKeywords?: string[] }
): Promise<ChatRestaurant[]> {
  const all = await loadAllChatRestaurants();
  let results = all;

  if (query.region) {
    const r = query.region;
    results = results.filter((x) => x.region.includes(r) || r.includes(x.region));
  }

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

  // 신규(firestore) 우선
  return results.sort((a, b) => (a.source === "firestore" ? -1 : 1)).slice(0, 8);
}
