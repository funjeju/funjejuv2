import type { CctvDirection } from "@/types/cctv";

/** New-system editable data. Never substitute this for legacy `cctvs` writes. */
export type DirectoryFields = {
  name: string;
  region: string;
  direction: CctvDirection | "";
  category: string;
  description: string;
  lat: number | null;
  lng: number | null;
  sourceUrl: string;
  viewerUrl: string;
  youtubeId: string;
  visible: boolean;
  playbackStatus: "unverified" | "verified" | "unavailable";
  playbackNote: string;
};
export type DirectoryEntry = DirectoryFields & {
  id: string;
  revision: string;
  origin: "legacy" | "manual";
  legacyId: string | null;
  sourceRestricted: boolean;
  verifiedAt: string | null;
  updatedAt: string | null;
};
export type DirectoryList = {
  writesEnabled?: boolean;
  entries: DirectoryEntry[];
  legacyCount: number;
  storedCount: number;
  pendingImportCount: number;
  importRevision: string;
};
export type DirectorySaveRequest = {
  action: "save";
  id: string;
  expectedRevision: string;
  fields: DirectoryFields;
  observation?: { observedPlayback: true; observedAt: string };
};
export type DirectoryImportRequest = { action: "import-legacy"; expectedImportRevision: string };

export type PublicDirectoryEntry = Omit<DirectoryEntry, "revision" | "origin" | "legacyId">;
