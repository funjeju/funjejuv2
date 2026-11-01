/** Entirely synthetic data: not a source inventory or an assertion of real playback. */
export function syntheticCandidatePayload() {
  const allowedOrigin = 'https://cameras.example.test';
  return {
    version: 1, authority: 'jejusi', allowedOrigin,
    candidates: Array.from({ length: 19 }, (_, index) => {
      const sourceId = String(30001 + index);
      return {
        sourceKey: `jejusi:${sourceId}`, sourceId, authority: 'jejusi',
        candidateUrl: `${allowedOrigin}/live/${sourceId}/playlist.m3u8`,
        existingId: index === 9 ? 'gimnyeong' : `synthetic_${index}`,
        trustedExistingDisplayName: `Synthetic camera ${index}`, candidateSourceName: null,
        columnsShifted: index < 8, crosswalkStatus: 'synthetic-unconfirmed',
        identityStatus: 'tentative-unconfirmed', held: true, playbackVerified: false,
        sourceAccess: 'held-prior-access-denial',
        provenance: { filename: 'synthetic-fixture.csv', sha256: 'a'.repeat(64), line: index + 2 },
      };
    }),
  };
}
