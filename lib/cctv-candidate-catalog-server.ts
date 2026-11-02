import "server-only";
import { parseJejusiCandidatesJson, type ParsedJejusiCatalog } from "./cctv-jejusi-candidates";

export type CandidateCatalogResult =
  | { state: "ready"; catalog: ParsedJejusiCatalog }
  | { state: "missing" | "invalid" };

/** Private reference DATA, not a credential. Never NEXT_PUBLIC or a client import.
 * Call only after admin authorization; errors deliberately never reflect input.
 */
export function loadJejusiCandidateCatalog(): CandidateCatalogResult {
  const raw = process.env.CCTV_JEJUSI_CANDIDATES_JSON;
  if (!raw?.trim()) return { state: "missing" };
  try { return { state: "ready", catalog: parseJejusiCandidatesJson(raw) }; }
  catch { return { state: "invalid" }; }
}
