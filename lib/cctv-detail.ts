import type { Cctv, CctvEntry } from "../types/cctv";

export type CctvLookupResult =
  | { state: "found"; entry: CctvEntry }
  | { state: "missing" }
  | { state: "unavailable" };

export class CctvInventoryUnavailableError extends Error {
  constructor() {
    super("CCTV inventory is temporarily unavailable. Retry the request.");
    this.name = "CctvInventoryUnavailableError";
  }
}

/** An infrastructure failure is NOT a successful inactive/missing-camera response.
 * Throw through the route so ISR retains its last successful result and retries,
 * rather than permanently caching a fabricated inactive fallback.
 */
export function resolveCctvDetail(result: CctvLookupResult, legacy?: Cctv): CctvEntry | null {
  if (result.state === "unavailable") throw new CctvInventoryUnavailableError();
  if (result.state === "found") return result.entry;
  if (!legacy) return null;
  // Only an authoritative absent document may use preserved metadata without playback.
  return {
    id: legacy.id, name: legacy.name, region: legacy.region,
    direction: legacy.direction, category: legacy.category,
    originUrl: "", youtubeId: legacy.youtubeId,
    active: false, description: legacy.description,
    lat: legacy.latitude, lng: legacy.longitude,
  };
}
