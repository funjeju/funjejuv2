import { createHash } from "node:crypto";

/** An approval belongs to one exact source, never just a camera ID. */
export function cctvSourceRevision(source: { originUrl?: unknown; youtubeId?: unknown }): string {
  return createHash("sha256").update(JSON.stringify([source.originUrl || "", source.youtubeId || ""])).digest("hex");
}

export function validPlaybackAttestation(value: unknown, revision: string, now = Date.now()): boolean {
  if (!value || typeof value !== "object") return false;
  const review = value as Record<string, unknown>;
  const time = typeof review.observedAt === "string" ? Date.parse(review.observedAt) : NaN;
  return review.observedPlayback === true && review.sourceRevision === revision &&
    review.method === "operator-observed" && Number.isFinite(time) && time <= now && now - time <= 15 * 60 * 1000;
}

/** New or changed sources are held; metadata-only edits preserve publication. */
export function publicationAfterSave(previous: { originUrl?: unknown; youtubeId?: unknown; active?: unknown } | undefined, next: { originUrl?: unknown; youtubeId?: unknown }): boolean {
  return !!previous?.active && cctvSourceRevision(previous) === cctvSourceRevision(next);
}
