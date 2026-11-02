import { directCameraViewerUrl } from "@/lib/cctv-direct-link";
import { isVurixId, vurixWatchUrl } from "@/constants/vurix";

type PlaybackCamera = {
  id: string;
  name?: string;
  originUrl?: string;
  youtubeId?: string;
  active?: boolean;
};

/** HTTP sources open a separate top-level viewer, not the explorer dialog.
 * YouTube takes precedence. Legacy fallback applies only when origin metadata is absent.
 */
export function requiresExternalPlayback(camera: PlaybackCamera): boolean {
  if (camera.youtubeId) return false;
  const origin = typeof camera.originUrl === "string" ? camera.originUrl.trim() : "";
  if (!origin) return isVurixId(camera.id);
  try { return new URL(origin).protocol === "http:"; }
  catch { return false; }
}

/** Only the exact legacy provider requires the old direct HTTP viewer.
 * Known legacy IDs are a fallback only when source metadata is absent.
 */
export function requiresDirectHttpViewer(camera: PlaybackCamera): boolean {
  if (!requiresExternalPlayback(camera)) return false;
  const origin = typeof camera.originUrl === "string" ? camera.originUrl.trim() : "";
  if (!origin) return isVurixId(camera.id);
  try { const url = new URL(origin); return url.protocol === "http:" && url.host === "59.8.86.94:8080"; }
  catch { return false; }
}

export function requiresHttpsProxyWindow(camera: PlaybackCamera): boolean {
  return requiresExternalPlayback(camera) && !requiresDirectHttpViewer(camera);
}

/** Fixed viewer destinations only; never forwards the source URL or its tokens. */
export function cameraWatchUrl(camera: PlaybackCamera & { name: string }, direct = false): string {
  if (direct) return directCameraViewerUrl(camera) ?? `/cctv/watch/${encodeURIComponent(camera.id)}`;
  return requiresDirectHttpViewer(camera)
    ? vurixWatchUrl(camera.id, camera.name)
    : `/cctv/watch/${encodeURIComponent(camera.id)}`;
}

/** Synchronous user gesture only. The always-visible anchor is the popup fallback;
 * noopener may return null even if the window opened, so never infer failure from it.
 */
export function openCameraWatch(camera: PlaybackCamera & { name: string }, direct = false): void {
  if (typeof window === "undefined") return;
  const directUrl = direct ? directCameraViewerUrl(camera) : null;
  if (direct ? !directUrl : camera.active === false || !requiresExternalPlayback(camera)) return;
  const aw = window.screen.availWidth || 1280;
  const ah = window.screen.availHeight || 800;
  const width = Math.min(1100, Math.round(aw * 0.72));
  const height = Math.round(width * 9 / 16) + 120;
  const left = Math.round((aw - width) / 2), top = Math.max(0, Math.round((ah - height) / 2));
  window.open(directUrl ?? cameraWatchUrl(camera), `funjeju_cctv_${encodeURIComponent(camera.id)}`,
    `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,noopener,noreferrer`);
}

/** Legacy summaries do not contain enough source metadata to choose a player.
 * Resolve through the existing authoritative detail route rather than guessing HTTP/HTTPS.
 */
export function requiresPlaybackDetail(camera: PlaybackCamera): boolean {
  const origin = typeof camera.originUrl === "string" ? camera.originUrl.trim() : "";
  return !camera.youtubeId && !origin && !requiresExternalPlayback(camera);
}
