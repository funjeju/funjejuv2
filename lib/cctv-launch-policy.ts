import type { CctvEntry } from "../types/cctv";
import { CCTV_LAUNCH_OBSERVATIONS } from "../constants/cctv-launch-observations";

export type LaunchCamera = Pick<CctvEntry, "id" | "active" | "originUrl" | "youtubeId" | "proxySyncPending">;
export type LaunchObservation = { id: string; observedAt: string; sourceRevision: string; pageUrl: string; width: number; height: number; timeAdvancedSeconds: number };

/** Public launch selection, not a claim that the upstream source was inspected or
 * that a past observation guarantees uninterrupted playback. No source URL is
 * included in the published evidence; a digest rejects subsequent source edits. */
export function launchObservation(id: string): LaunchObservation | undefined {
  return CCTV_LAUNCH_OBSERVATIONS.find(row => row.id === id);
}
export function launchSourceKey(camera: LaunchCamera): string {
  return JSON.stringify([camera.id, camera.originUrl || "", camera.youtubeId || ""]);
}
export function launchCandidate(camera: LaunchCamera): boolean {
  return camera.active === true && camera.proxySyncPending !== true &&
    typeof camera.originUrl === "string" && !!camera.originUrl.trim() && !camera.youtubeId &&
    !!launchObservation(camera.id);
}
export async function isLaunchCameraVisible(camera: LaunchCamera): Promise<boolean> {
  if (!launchCandidate(camera)) return false;
  const evidence = launchObservation(camera.id)!;
  try {
    const bytes = new TextEncoder().encode(JSON.stringify([camera.originUrl || "", camera.youtubeId || ""]));
    const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    const revision = [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, "0")).join("");
    return revision === evidence.sourceRevision;
  } catch { return false; }
}
export async function filterLaunchCameras<T extends LaunchCamera>(cameras: T[]): Promise<T[]> {
  const visible = await Promise.all(cameras.map(isLaunchCameraVisible));
  return cameras.filter((_, index) => visible[index]);
}
