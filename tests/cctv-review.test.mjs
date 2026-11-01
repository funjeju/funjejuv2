import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cctvSourceRevision, validPlaybackAttestation, publicationAfterSave } from '../lib/cctv-review.ts';
const source = { originUrl: 'http://example.test/live.m3u8', youtubeId: null };
const revision = cctvSourceRevision(source);
const now = Date.parse('2026-11-01T12:00:00Z');
const review = { sourceRevision: revision, observedPlayback: true, observedAt: new Date(now - 1000).toISOString(), method: 'operator-observed' };
test('approval matches exact source and recent explicit operator observation', () => assert.equal(validPlaybackAttestation(review, revision, now), true));
test('HTTP success cannot approve playback', () => assert.equal(validPlaybackAttestation({ ...review, method: 'http', ok: true }, revision, now), false));
test('changed source invalidates approval', () => assert.equal(validPlaybackAttestation(review, cctvSourceRevision({ ...source, originUrl: source.originUrl + '?v=2' }), now), false));
test('expired, future, missing and unchecked observations are rejected', () => {
  for (const value of [null, {}, { ...review, observedPlayback: false }, { ...review, observedAt: new Date(now + 1).toISOString() }, { ...review, observedAt: new Date(now - 16*60*1000).toISOString() }]) assert.equal(validPlaybackAttestation(value, revision, now), false);
});

test('new cameras cannot be published merely by saving', () => assert.equal(publicationAfterSave(undefined, source), false));
test('metadata saves preserve existing publication while changed sources are held', () => {
  assert.equal(publicationAfterSave({ ...source, active: true }, source), true);
  assert.equal(publicationAfterSave({ ...source, active: false }, source), false);
  assert.equal(publicationAfterSave({ ...source, active: true }, { ...source, youtubeId: 'abcdefghijk' }), false);
});
