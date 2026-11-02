"use client";

import { useEffect, useState } from "react";
import { useCctvs } from "@/hooks/useCctvs";
import { isLaunchCameraVisible, launchCandidate, launchSourceKey } from "@/lib/cctv-launch-policy";

/** Public presentation only. The unfiltered inventory/admin and every record are
 * preserved. Unknown/new/changed sources stay hidden until independently reviewed. */
export function usePublicCctvs() {
  const inventory = useCctvs(true);
  const [reviewed, setReviewed] = useState<ReadonlyMap<string, boolean>>(new Map());
  useEffect(() => {
    let cancelled = false;
    Promise.all(inventory.cctvs.filter(launchCandidate).map(async camera =>
      [launchSourceKey(camera), await isLaunchCameraVisible(camera)] as const,
    )).then(entries => { if (!cancelled) setReviewed(new Map(entries)); });
    return () => { cancelled = true; };
  }, [inventory.cctvs]);
  const candidates = inventory.cctvs.filter(launchCandidate);
  // Match exact current source synchronously: no old approved frame on a source
  // edit/disable, while metadata-only updates preserve the same player selection.
  const cctvs = candidates.filter(camera => reviewed.get(launchSourceKey(camera)) === true);
  const checking = candidates.some(camera => !reviewed.has(launchSourceKey(camera)));
  return { cctvs, loading: inventory.loading || (!inventory.error && checking), error: inventory.error };
}
