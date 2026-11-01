/** Private administrator configuration parser. This module contains no source catalog.
 * Supply private server-side JSON only after authorization; never use NEXT_PUBLIC config.
 */
export type JejusiCandidate = Readonly<{
  sourceKey: string; sourceId: string; authority: "jejusi"; candidateUrl: string;
  existingId: string | null; trustedExistingDisplayName: string | null;
  candidateSourceName: null; columnsShifted: boolean; crosswalkStatus: string | null;
  identityStatus: "tentative-unconfirmed"; held: true; playbackVerified: false;
  sourceAccess: "held-prior-access-denial";
  provenance: Readonly<{ filename: string; sha256: string; line: number }>;
}>;
export type ParsedJejusiCatalog = Readonly<{
  version: 1; authority: "jejusi"; allowedOrigin: string;
  candidates: readonly JejusiCandidate[];
}>;
export const MAX_CANDIDATE_CONFIG_BYTES = 48 * 1024;
const ERROR = "Private candidate configuration is unavailable or invalid";
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const bounded = (value: unknown, max: number): value is string => typeof value === "string" && value.length > 0 && value.length <= max && !/[\u0000-\u001f\u007f]/.test(value);
const nullableText = (value: unknown, max: number) => value === null || bounded(value, max);
function exactKeys(value: Record<string, unknown>, keys: string[]) {
  return Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}

/** Fails closed with one generic error; never reflects private inputs in errors. */
export function parseJejusiCandidatesJson(raw: string): ParsedJejusiCatalog {
  try {
    if (typeof raw !== "string" || !raw || raw.length > MAX_CANDIDATE_CONFIG_BYTES || new TextEncoder().encode(raw).byteLength > MAX_CANDIDATE_CONFIG_BYTES) throw new Error();
    const value: unknown = JSON.parse(raw);
    if (!record(value) || !exactKeys(value, ["version", "authority", "allowedOrigin", "candidates"]) || value.version !== 1 || value.authority !== "jejusi" || !bounded(value.allowedOrigin, 253)) throw new Error();
    const origin = new URL(value.allowedOrigin);
    if (origin.protocol !== "https:" || origin.origin !== value.allowedOrigin || origin.username || origin.password || origin.search || origin.hash || origin.port || !origin.hostname) throw new Error();
    if (!Array.isArray(value.candidates) || value.candidates.length !== 19) throw new Error();
    const keys = new Set<string>(), urls = new Set<string>(), existingIds = new Set<string>();
    const candidates = value.candidates.map((candidate: unknown): JejusiCandidate => {
      if (!record(candidate) || !exactKeys(candidate, ["sourceKey", "sourceId", "authority", "candidateUrl", "existingId", "trustedExistingDisplayName", "candidateSourceName", "columnsShifted", "crosswalkStatus", "identityStatus", "held", "playbackVerified", "sourceAccess", "provenance"])) throw new Error();
      if (!bounded(candidate.sourceId, 12) || !/^[0-9]+$/.test(candidate.sourceId) || candidate.sourceKey !== `jejusi:${candidate.sourceId}` || candidate.authority !== "jejusi") throw new Error();
      if (!bounded(candidate.candidateUrl, 1024)) throw new Error();
      const url = new URL(candidate.candidateUrl);
      if (url.protocol !== "https:" || url.origin !== value.allowedOrigin || url.username || url.password || url.search || url.hash || candidate.candidateUrl !== `${value.allowedOrigin}/live/${candidate.sourceId}/playlist.m3u8`) throw new Error();
      if (!nullableText(candidate.existingId, 100) || (typeof candidate.existingId === "string" && !/^[a-zA-Z0-9_-]+$/.test(candidate.existingId)) || !nullableText(candidate.trustedExistingDisplayName, 200) || candidate.candidateSourceName !== null || typeof candidate.columnsShifted !== "boolean" || !nullableText(candidate.crosswalkStatus, 100)) throw new Error();
      if (candidate.identityStatus !== "tentative-unconfirmed" || candidate.held !== true || candidate.playbackVerified !== false || candidate.sourceAccess !== "held-prior-access-denial") throw new Error();
      const provenance = candidate.provenance;
      if (!record(provenance) || !exactKeys(provenance, ["filename", "sha256", "line"]) || !bounded(provenance.filename, 255) || /[\\/]/.test(provenance.filename) || typeof provenance.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(provenance.sha256) || !Number.isSafeInteger(provenance.line) || (provenance.line as number) < 1 || (provenance.line as number) > 1_000_000) throw new Error();
      if (keys.has(candidate.sourceKey as string) || urls.has(candidate.candidateUrl) || (typeof candidate.existingId === "string" && existingIds.has(candidate.existingId))) throw new Error();
      keys.add(candidate.sourceKey as string); urls.add(candidate.candidateUrl);
      if (typeof candidate.existingId === "string") existingIds.add(candidate.existingId);
      return Object.freeze({ ...candidate, provenance: Object.freeze({ ...provenance }) }) as JejusiCandidate;
    });
    return Object.freeze({ version: 1, authority: "jejusi", allowedOrigin: value.allowedOrigin, candidates: Object.freeze(candidates) });
  } catch { throw new Error(ERROR); }
}
