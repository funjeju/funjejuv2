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
    thumbnail: r.images?.[0]
      ? `/restaurant-images/${r.images[0]}`
      : null,
    shortDescription: stripHtml(r.content, 80),
  }));
}

/** 단일 조회 */
export async function getRestaurant(id: string): Promise<Restaurant | null> {
  const all = await loadAllRestaurants();
  return all.find((r) => r.id === id) ?? null;
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
