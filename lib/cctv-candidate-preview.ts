import { type ParsedJejusiCatalog, type JejusiCandidate } from "./cctv-jejusi-candidates";

export type CurrentCandidateRecord = Readonly<{
  id: string; name: string; originUrl?: string; streamProxyUrl?: string | null;
  sourceRevision?: string; version?: string;
}>;
export type ExpectedCurrentVersion = Readonly<{ sourceRevision?: string; version?: string }>;

/** Exact allowlist validation; rejects normalized lookalikes, query tokens and other authorities. */
export function validatePreviewCandidate(catalog: ParsedJejusiCatalog, candidate: JejusiCandidate): boolean {
  const registered = catalog.candidates.find(item => item.sourceKey === candidate.sourceKey);
  if (!registered || candidate.authority !== "jejusi" || candidate.sourceKey !== `jejusi:${candidate.sourceId}` || candidate.sourceId !== registered.sourceId) return false;
  if (candidate.candidateUrl !== registered.candidateUrl || candidate.existingId !== registered.existingId) return false;
  try {
    const url = new URL(candidate.candidateUrl);
    return url.protocol === "https:" && url.origin === catalog.allowedOrigin
      && url.pathname === `/live/${candidate.sourceId}/playlist.m3u8`
      && !url.username && !url.password && !url.search && !url.hash
      && candidate.held === true && candidate.playbackVerified === false
      && candidate.sourceAccess === "held-prior-access-denial";
  } catch { return false; }
}

/** Comparison only, not a CctvEntry, player prop, patch, activation or write operation. */
export function previewCandidateComparison(catalog: ParsedJejusiCatalog, sourceKey: string, current: CurrentCandidateRecord | null, expected?: ExpectedCurrentVersion) {
  const candidate = catalog.candidates.find(item => item.sourceKey === sourceKey);
  if (!candidate || !validatePreviewCandidate(catalog, candidate)) throw new Error("Unknown or invalid candidate composite key");
  if (current && current.id !== candidate.existingId) throw new Error("Current camera does not match the tentative crosswalk");
  const expectedCurrentMatches = expected === undefined ? null : current !== null
    && (expected.sourceRevision === undefined || expected.sourceRevision === current.sourceRevision)
    && (expected.version === undefined || expected.version === current.version);
  const snapshot = current === null ? null : Object.freeze({
    id: current.id, name: current.name, originUrl: current.originUrl,
    streamProxyUrl: current.streamProxyUrl, sourceRevision: current.sourceRevision, version: current.version,
  });
  return Object.freeze({
    candidate,
    current: snapshot,
    plannedTarget: Object.freeze({
      kind: "future-direct-https-comparison-only" as const,
      candidateSourceKey: candidate.sourceKey,
      streamProxyUrl: candidate.candidateUrl,
      telemetryEnabled: false as const,
      telemetryConstraint: "Future reviewed direct playback must omit cctvId: the existing HlsPlayer derives /event beacons from the media origin and otherwise starts usage sessions. No player props or activation are provided here.",
    }),
    currentSourceMatchesCandidate: current === null ? null : current.originUrl === candidate.candidateUrl,
    currentPlaybackTargetMatchesCandidate: current === null ? null : current.streamProxyUrl === candidate.candidateUrl,
    expectedCurrentMatches,
    identityWarning: candidate.existingId === "gimnyeong"
      ? "기존 김녕해변과 과거 김녕포구 표기의 동일 지점 여부는 미확인입니다. 손상된 원본 이름을 복원한 것이 아니며 기존 이름을 변경하지 않습니다."
      : "기존 지점 연결은 임시 후보입니다. 손상된 원본 이름을 복원하거나 동일 지점으로 확인한 것이 아닙니다.",
    canActivate: false as const,
    playbackVerified: false as const,
    sourceAccess: "held-prior-access-denial" as const,
  });
}
