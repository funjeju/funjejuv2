import type { CctvEntry } from "../types/cctv";

export type ExplorerFilters = { query: string; direction: string; category: string };

export function filterCctvs(entries: CctvEntry[], filters: ExplorerFilters): CctvEntry[] {
  const terms = filters.query.trim().normalize("NFKC").toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return entries.filter((entry) => {
    if (!entry.active) return false;
    if (filters.direction && entry.direction !== filters.direction) return false;
    if (filters.category && entry.category !== filters.category) return false;
    const text = `${entry.name} ${entry.region} ${entry.category} ${entry.description}`.normalize("NFKC").toLocaleLowerCase();
    return terms.every((term) => text.includes(term));
  });
}
