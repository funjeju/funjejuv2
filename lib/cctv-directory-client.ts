import type { PublicDirectoryEntry } from "@/types/cctv-directory";
import { directCameraSourceUrl } from "@/lib/cctv-direct-link";

/** Navigation only. No media fetching, proxy, login, or auto-play side effects. */
export function directoryViewerHref(entry: Pick<PublicDirectoryEntry, "visible" | "sourceUrl" | "viewerUrl" | "youtubeId">): string | null {
  if (!entry.visible) return null;
  if (entry.viewerUrl) return directCameraSourceUrl({active:true,originUrl:entry.viewerUrl});
  if (entry.youtubeId) return /^[A-Za-z0-9_-]{11}$/.test(entry.youtubeId) ? `https://www.youtube.com/watch?v=${entry.youtubeId}` : null;
  return directCameraSourceUrl({active:true,originUrl:entry.sourceUrl});
}
export function directoryStatusLabel(status: PublicDirectoryEntry["playbackStatus"]): string {
  return status === "verified" ? "관리자 재생 확인" : status === "unavailable" ? "현재 재생 불가" : "재생 확인 필요";
}
