import { createHash } from "node:crypto";
import type { DirectoryEntry, DirectoryFields, DirectoryList } from "@/types/cctv-directory";
import { directCameraSourceUrl, directCameraViewerUrl } from "@/lib/cctv-direct-link";

export const DIRECTORY_COLLECTION = "cctv_directory_v1";
export const validDirectoryId = (id: unknown): id is string => typeof id === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(id);
export type DirectorySnapshot = { id: string; data: Record<string, unknown>; version: string };
export class DirectoryError extends Error {
  constructor(public status: 400 | 409) { super(status === 409 ? "Directory changed; refresh before saving." : "Invalid directory request."); }
}
const text = (v: unknown, max: number, fallback = "") => typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, max) : fallback;
const safeUrl = (v: unknown) => typeof v === "string" && v.length <= 2048 ? directCameraSourceUrl({ active: true, originUrl: v }) ?? "" : "";
const safeDate = (v: unknown): string | null => typeof v === "string" && Number.isFinite(Date.parse(v)) && new Date(Date.parse(v)).toISOString() === v ? v : null;
const youtube = (v: unknown) => typeof v === "string" && /^[A-Za-z0-9_-]{11}$/.test(v) ? v : "";
function coordinatePair(lat: unknown, lng: unknown): { lat: number | null; lng: number | null } {
  return typeof lat === "number" && Number.isFinite(lat) && Math.abs(lat) <= 90 &&
    typeof lng === "number" && Number.isFinite(lng) && Math.abs(lng) <= 180 ? { lat, lng } : { lat: null, lng: null };
}
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical((value as Record<string, unknown>)[key])]));
  }
  return value;
}
export const directoryHash = (value: unknown) => createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
export const legacyRevision = (snapshot: DirectorySnapshot) => `legacy:${directoryHash(snapshot)}`;
export const directorySourceHash = (fields: Pick<DirectoryFields, "sourceUrl" | "viewerUrl" | "youtubeId">) => directoryHash([fields.sourceUrl, fields.viewerUrl, fields.youtubeId]);

export function normalizeLegacy(snapshot: DirectorySnapshot): DirectoryEntry {
  const d = snapshot.data;
  const sourceUrl = safeUrl(d.originUrl);
  const selectedYoutube = youtube(d.youtubeId);
  const viewer = sourceUrl ? directCameraViewerUrl({ id: snapshot.id, active: true, originUrl: sourceUrl }) : null;
  return {
    id: snapshot.id, name: text(d.name, 120, snapshot.id), region: text(d.region, 120),
    direction: ["북", "동", "남", "서"].includes(String(d.direction)) ? d.direction as DirectoryFields["direction"] : "",
    category: text(d.category, 80, "기타"), description: text(d.description, 4000),
    ...coordinatePair(d.lat, d.lng), sourceUrl, viewerUrl: viewer && viewer !== sourceUrl ? viewer : "", youtubeId: selectedYoutube,
    visible: true, playbackStatus: "unverified", playbackNote: "",
    revision: legacyRevision(snapshot), origin: "legacy", legacyId: snapshot.id,
    sourceRestricted: (!!d.originUrl && !sourceUrl) || (!!d.youtubeId && !selectedYoutube),
    verifiedAt: null, updatedAt: null,
  };
}

/** Explicit projection only: no snapshot, history, unknown fields or unsafe URL leaves the server. */
export function projectStored(snapshot: DirectorySnapshot): DirectoryEntry {
  const d = snapshot.data;
  const sourceUrl = safeUrl(d.sourceUrl), viewerUrl = safeUrl(d.viewerUrl), youtubeId = youtube(d.youtubeId);
  const restricted = d.sourceRestricted === true || (!!d.sourceUrl && !sourceUrl) || (!!d.viewerUrl && !viewerUrl) || (!!d.youtubeId && !youtubeId);
  return {
    id: snapshot.id, name: text(d.name, 120, snapshot.id), region: text(d.region, 120),
    direction: ["북", "동", "남", "서"].includes(String(d.direction)) ? d.direction as DirectoryFields["direction"] : "",
    category: text(d.category, 80, "기타"), description: text(d.description, 4000), ...coordinatePair(d.lat, d.lng),
    sourceUrl, viewerUrl, youtubeId, visible: d.visible === true,
    playbackStatus: ["unverified", "verified", "unavailable"].includes(String(d.playbackStatus)) && !restricted ? d.playbackStatus as DirectoryFields["playbackStatus"] : "unverified",
    playbackNote: text(d.playbackNote, 1000), revision: `stored:${Number.isSafeInteger(d.revision) ? d.revision : 0}`,
    origin: d.origin === "manual" ? "manual" : "legacy", legacyId: validDirectoryId(d.legacyId) ? d.legacyId : null,
    sourceRestricted: restricted, verifiedAt: safeDate(d.verifiedAt),
    updatedAt: safeDate(d.updatedAt),
  };
}
export function mergeDirectory(legacy: DirectorySnapshot[], stored: DirectorySnapshot[]): DirectoryList {
  const map = new Map(legacy.map(row => [row.id, normalizeLegacy(row)]));
  for (const row of stored) map.set(row.id, projectStored(row));
  const storedIds = new Set(stored.map(row => row.id));
  return {
    entries: [...map.values()].sort((a, b) => a.id.localeCompare(b.id)), legacyCount: legacy.length, storedCount: stored.length,
    pendingImportCount: legacy.filter(row => !storedIds.has(row.id)).length,
    importRevision: directoryHash({ legacy: [...legacy].sort((a,b)=>a.id.localeCompare(b.id)), stored: stored.map(row => ({ id: row.id, version: row.version, revision: row.data.revision })).sort((a,b)=>a.id.localeCompare(b.id)) }),
  };
}
const fieldNames = ["name", "region", "direction", "category", "description", "lat", "lng", "sourceUrl", "viewerUrl", "youtubeId", "visible", "playbackStatus", "playbackNote"] as const;
export function validateDirectoryFields(value: unknown): DirectoryFields {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new DirectoryError(400);
  const d = value as Record<string, unknown>;
  if (Object.keys(d).some(key => !(fieldNames as readonly string[]).includes(key)) || fieldNames.some(key => !(key in d))) throw new DirectoryError(400);
  for (const [key,max] of [["name",120],["region",120],["category",80],["description",4000],["playbackNote",1000],["sourceUrl",2048],["viewerUrl",2048],["youtubeId",11]] as const) {
    if (typeof d[key] !== "string" || d[key].length > max || /[\u0000-\u001f\u007f]/.test(d[key])) throw new DirectoryError(400);
  }
  if (!(d.name as string).trim() || !["","북","동","남","서"].includes(String(d.direction)) || typeof d.visible !== "boolean" || !["unverified","verified","unavailable"].includes(String(d.playbackStatus))) throw new DirectoryError(400);
  for (const key of ["sourceUrl","viewerUrl"] as const) if (d[key] && !safeUrl(d[key])) throw new DirectoryError(400);
  if (d.youtubeId && !youtube(d.youtubeId)) throw new DirectoryError(400);
  const pair = coordinatePair(d.lat,d.lng);
  if (!(d.lat === null && d.lng === null) && pair.lat === null) throw new DirectoryError(400);
  return Object.fromEntries(fieldNames.map(key => [key,d[key]])) as DirectoryFields;
}
export function playbackAfterSave(fields: DirectoryFields, previous: DirectoryEntry | null, observation: unknown, now: number): { playbackStatus: DirectoryFields["playbackStatus"]; verifiedAt: string | null } {
  const changed = !previous || directorySourceHash(fields) !== directorySourceHash(previous);
  if (fields.playbackStatus !== "verified") return { playbackStatus: fields.playbackStatus, verifiedAt: null };
  if (!fields.sourceUrl && !fields.viewerUrl && !fields.youtubeId) throw new DirectoryError(400);
  if (!changed && previous?.playbackStatus === "verified") return { playbackStatus: "verified", verifiedAt: previous.verifiedAt };
  const o = observation as { observedPlayback?: unknown; observedAt?: unknown } | null;
  const timestamp = typeof o?.observedAt === "string" ? Date.parse(o.observedAt) : NaN;
  if (o?.observedPlayback !== true || !Number.isFinite(timestamp) || timestamp > now || now - timestamp > 15*60*1000) {
    // Changing a source cannot carry a stale verified badge forward.
    if (changed && previous?.playbackStatus === "verified") return { playbackStatus: "unverified", verifiedAt: null };
    throw new DirectoryError(400);
  }
  return { playbackStatus: "verified", verifiedAt: new Date(timestamp).toISOString() };
}
export function fieldsFromEntry(entry: DirectoryEntry): DirectoryFields {
  return Object.fromEntries(fieldNames.map(key => [key,entry[key]])) as DirectoryFields;
}

/** Public contract excludes internal revision/origin/import provenance. */
export function projectPublicDirectoryEntry(entry: DirectoryEntry) {
  return { id: entry.id, ...fieldsFromEntry(entry), sourceRestricted: entry.sourceRestricted, verifiedAt: entry.verifiedAt, updatedAt: entry.updatedAt };
}

/** Selected source identity only: never infer identity from a shared viewer page.
 * Vurix quality/session tails identify variants of the same provider camera. */
export function directorySourceIdentity(fields: Pick<DirectoryFields, "sourceUrl" | "youtubeId">): string | null {
  const selected = youtube(fields.youtubeId);
  if (selected) return `youtube:${selected}`;
  const source = safeUrl(fields.sourceUrl);
  if (!source) return null;
  const url = new URL(source);
  const match = /^\/media\/api\/v1\/hls\/vurix\/([^/]+)\/([^/]+)(?:\/|$)/.exec(url.pathname);
  if (match) {
    try {
      const system = decodeURIComponent(match[1]), camera = decodeURIComponent(match[2]);
      if (/^[A-Za-z0-9_-]+$/.test(system) && /^[A-Za-z0-9_-]+$/.test(camera))
        return `vurix:${JSON.stringify([url.host.toLowerCase(), system, camera])}`;
    } catch { /* Fall back to the validated exact source URL, never raw input. */ }
  }
  return `url:${source}`;
}
