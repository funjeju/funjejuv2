import "server-only";
import { readFile } from "fs/promises";
import path from "path";
import type { Restaurant, RestaurantSummary } from "@/types/restaurant";

let cache: Restaurant[] | null = null;

/** restaurants.json 전체 로드 (서버에서만 캐시) */
export async function loadAllRestaurants(): Promise<Restaurant[]> {
  if (cache) return cache;
  // domin_food.json: address + lat/lng 포함된 신버전 (구버전 restaurants.json은 좌표 X)
  const filePath = path.join(process.cwd(), "data", "domin_food.json");
  const raw = await readFile(filePath, "utf-8");
  cache = JSON.parse(raw) as Restaurant[];
  return cache;
}

/**
 * 콘텐츠 생성용 통합 맛집 로더 — JSON 589 + Firestore 신규(비짓제주 적재 등).
 * 웹진·카드뉴스 토픽 풀이 이걸 써야 새로 추가된 맛집이 자동으로 콘텐츠 소재가 된다.
 */
export async function loadContentRestaurants(): Promise<Restaurant[]> {
  const json = await loadAllRestaurants();
  try {
    const { getAdminDb } = await import("@/lib/firebase-admin");
    const snap = await getAdminDb().collection("restaurants").get();
    const fsList: Restaurant[] = snap.docs.map((d) => {
      const f = d.data() as Record<string, unknown>;
      const imageUrl = (f.imageUrl as string) || "";
      return {
        id: d.id,
        title: (f.title as string) ?? "",
        content: (f.description as string) ?? "",
        region: (f.region as string) ?? "",
        menu: (f.menu as string) ?? "",
        options: Array.isArray(f.options) ? (f.options as string[]).join("|") : "",
        hours: (f.hours as string) ?? "",
        prices: "",
        images: imageUrl ? [imageUrl] : [],
        address: (f.address as string) || undefined,
        lat: typeof f.lat === "number" ? (f.lat as number) : undefined,
        lng: typeof f.lng === "number" ? (f.lng as number) : undefined,
      };
    });
    return [...json, ...fsList];
  } catch {
    return json; // Firestore 실패 시 JSON만
  }
}

/** 맛집 이미지 경로 정규화 — 외부 URL(비짓제주 등)은 그대로, 파일명은 /restaurant-images/ */
export function restaurantImageUrl(imageOrName?: string): string | undefined {
  if (!imageOrName) return undefined;
  return imageOrName.startsWith("http") ? imageOrName : `/restaurant-images/${imageOrName}`;
}

/** HTML 태그 제거 후 첫 N자만 */
export function stripHtml(html: string, length = 120): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/rnrn/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, length);
}

/** 옵션 문자열 → 배열 */
export function parseOptions(opts: string): string[] {
  return opts.split("|").filter((o) => o.trim().length > 0);
}

/** 영업시간 "09|30|18|50" → "09:30 - 18:50" */
export function formatHours(hours: string): string {
  const parts = hours.split("|").map((p) => p.trim());
  if (parts.length === 4 && parts.every(Boolean)) {
    return `${parts[0]}:${parts[1]} - ${parts[2]}:${parts[3]}`;
  }
  return "";
}

/** 요약 정보 (목록용) */
export async function loadRestaurantSummaries(): Promise<RestaurantSummary[]> {
  const all = await loadAllRestaurants();
  return all.map((r) => ({
    id: r.id,
    title: r.title,
    region: r.region,
    menu: r.menu,
    options: r.options,
    thumbnail: restaurantImageUrl(r.images?.[0]) ?? null,
    shortDescription: stripHtml(r.content, 80),
  }));
}

/** 단일 조회 — JSON 589 + Firestore 신규(비짓제주 적재·어드민 추가) 폴백 */
export async function getRestaurant(id: string): Promise<Restaurant | null> {
  const all = await loadAllRestaurants();
  const found = all.find((r) => r.id === id);
  if (found) return found;
  // Firestore restaurants 폴백 (vj_*, new_* 등 신규 맛집 상세 페이지)
  try {
    const { getAdminDb } = await import("@/lib/firebase-admin");
    const snap = await getAdminDb().collection("restaurants").doc(id).get();
    if (!snap.exists) return null;
    const f = snap.data() as Record<string, unknown>;
    const imageUrl = (f.imageUrl as string) || "";
    return {
      id,
      title: (f.title as string) ?? "",
      content: (f.description as string) ?? "",
      region: (f.region as string) ?? "",
      menu: (f.menu as string) ?? "",
      options: Array.isArray(f.options) ? (f.options as string[]).join("|") : "",
      hours: (f.hours as string) ?? "",
      prices: "",
      images: imageUrl ? [imageUrl] : [],
      address: (f.address as string) || undefined,
      lat: typeof f.lat === "number" ? (f.lat as number) : undefined,
      lng: typeof f.lng === "number" ? (f.lng as number) : undefined,
    };
  } catch {
    return null;
  }
}

/** 전체 지역/메뉴 목록 (필터용) */
export async function getFilters(): Promise<{ regions: string[]; menus: string[] }> {
  const all = await loadAllRestaurants();
  const regions = [...new Set(all.map((r) => r.region).filter(Boolean))].sort();
  const menus = [...new Set(all.map((r) => r.menu).filter(Boolean))].sort();
  return { regions, menus };
}

/** 모든 ID (sitemap, generateStaticParams용) */
export async function getAllIds(): Promise<string[]> {
  const all = await loadAllRestaurants();
  return all.map((r) => r.id);
}
