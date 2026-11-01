import { isVurixId, openVurixWatch, vurixWatchUrl } from "@/constants/vurix";

type PlaybackCamera = {
  id: string;
  name?: string;
  originUrl?: string;
  youtubeId?: string;
  active?: boolean;
};

/** HTTP media needs a top-level HTTP viewer, never an HTTPS embedded player.
 * YouTube takes precedence. Legacy fallback applies only when origin metadata is absent.
 */
export function requiresExternalPlayback(camera: PlaybackCamera): boolean {
  if (camera.youtubeId) return false;
  const origin = typeof camera.originUrl === "string" ? camera.originUrl.trim() : "";
  if (!origin) return isVurixId(camera.id);
  try { return new URL(origin).protocol === "http:"; }
  catch { return false; }
}

/** Never forwards an origin URL, credentials, or tokens to the external viewer. */
export function cameraWatchUrl(camera: { id: string; name: string }): string {
  return vurixWatchUrl(camera.id, camera.name);
}

/** Call synchronously from a user gesture; a persistent anchor provides popup fallback.
 * Do not infer blocking from window.open's return value: noopener may also return null.
 */
export function openCameraWatch(camera: PlaybackCamera & { name: string }): void {
  if (camera.active === false || !requiresExternalPlayback(camera)) return;
  openVurixWatch(camera.id, camera.name);
}

/** Legacy summaries do not contain enough source metadata to choose a player.
 * Resolve through the existing authoritative detail route rather than guessing HTTP/HTTPS.
 */
export function requiresPlaybackDetail(camera: PlaybackCamera): boolean {
  const origin = typeof camera.originUrl === "string" ? camera.originUrl.trim() : "";
  return !camera.youtubeId && !origin && !requiresExternalPlayback(camera);
}
