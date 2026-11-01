import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadPlaybackTarget } from './helpers/load-playback-target.mjs';
const target = loadPlaybackTarget();

test('HTTP origin routing is metadata driven including dodu, not limited to nine legacy IDs', () => {
  assert.equal(target.requiresExternalPlayback({ id: 'dodu', originUrl: 'http://example.test/live.m3u8' }), true);
  assert.equal(target.requiresExternalPlayback({ id: 'anything', originUrl: 'HTTP://example.test/live.m3u8' }), true);
  assert.equal(target.requiresExternalPlayback({ id: 'dodu', originUrl: 'https://example.test/live.m3u8' }), false);
  assert.equal(target.requiresExternalPlayback({ id: 'sinchang', originUrl: 'https://example.test/live.m3u8' }), false);
  assert.equal(target.requiresExternalPlayback({ id: 'dodu', originUrl: 'http://example.test/live.m3u8', youtubeId: 'video' }), false);
});
test('only known legacy IDs fall back when origin unavailable; invalid metadata is not interpreted as URL to open', () => {
  assert.equal(target.requiresExternalPlayback({ id: 'sinchang' }), true);
  assert.equal(target.requiresExternalPlayback({ id: 'dodu' }), false);
  for (const originUrl of ['javascript:alert(1)', '//evil.test/a', 'bad']) assert.equal(target.requiresExternalPlayback({ id: 'sinchang', originUrl }), false);
});
test('normal HTTP opens same-origin dedicated window with safe id encoding and no source tokens', () => {
  const url = new URL(target.cameraWatchUrl({ id: 'dodu&url=evil', name: '도두 / <a>', originUrl: 'http://secret.example.test/token' }), 'https://preview.example.test');
  assert.equal(url.origin, 'https://preview.example.test');
  assert.equal(url.pathname, '/cctv/watch/dodu%26url%3Devil');
  assert.deepEqual([...url.searchParams.keys()], []);
  assert.ok(!url.href.includes('secret'));
});
test('airport Hallasan and dodu HTTP metadata select dedicated route without claiming health', () => {
  for (const id of ['jeju_airport', 'halla_baengnokdam', 'dodu']) {
    const camera = { id, name: id, originUrl: 'http://existing.example.test/live.m3u8' };
    assert.equal(target.requiresExternalPlayback(camera), true);
    assert.equal(target.requiresHttpsProxyWindow(camera), true);
    assert.equal(target.requiresDirectHttpViewer(camera), false);
    assert.equal(target.cameraWatchUrl(camera), `/cctv/watch/${id}`);
  }
});
test('only exact legacy HTTP provider or absent metadata known Vurix uses legacy viewer', () => {
  for (const camera of [{ id: 'sinchang', name: 'Legacy' }, { id: 'other', name: 'Other', originUrl: 'http://59.8.86.94:8080/live/token' }]) {
    assert.equal(target.requiresDirectHttpViewer(camera), true);
    assert.equal(target.requiresHttpsProxyWindow(camera), false);
    const url = new URL(target.cameraWatchUrl(camera));
    assert.equal(url.origin, 'http://141.164.53.216:8080');
    assert.equal(url.pathname, '/watch');
    assert.deepEqual([...url.searchParams.keys()], ['id', 'name']);
    assert.equal(url.searchParams.get('id'), camera.id);
  }
  for (const originUrl of ['http://59.8.86.94:8081/live/a', 'http://59.8.86.94:8080.evil.test/live/a', 'https://59.8.86.94:8080/live/a', 'http://other.example.test/live/a']) assert.equal(target.requiresDirectHttpViewer({ id: 'sinchang', originUrl }), false);
  for (const camera of [{ id: 'sinchang', youtubeId: 'video', originUrl: 'http://59.8.86.94:8080/a' }, { id: 'dodu', originUrl: 'https://example.test/a' }]) {
    assert.equal(target.requiresExternalPlayback(camera), false);
    assert.equal(target.requiresDirectHttpViewer(camera), false);
    assert.equal(target.requiresHttpsProxyWindow(camera), false);
  }
});
test('blocked/noopener-null popup has persistent accessible safe anchor fallback', () => {
  const card = readFileSync(new URL('../components/cctv/CctvCard.tsx', import.meta.url), 'utf8');
  assert.match(card, /href=\{cameraWatchUrl\(cctv\)\} target="_blank" rel="noopener noreferrer"/);
  assert.match(card, /팝업이 열리지 않으면 새 탭으로 보기/);
  let calls = 0;
  const playback = loadPlaybackTarget({ screen: {}, open: () => { calls++; return null; } });
  playback.openCameraWatch({ id: 'dodu', name: '도두', originUrl: 'http://example.test/video' });
  assert.equal(calls, 1);
  playback.openCameraWatch({ id: 'dodu', name: '도두', active: false, originUrl: 'http://example.test/video' });
  assert.equal(calls, 1);
});

test('unknown non-YouTube legacy source requires authoritative detail without guessing HTTP', () => {
  assert.equal(target.requiresPlaybackDetail({ id: 'dodu' }), true);
  assert.equal(target.requiresPlaybackDetail({ id: 'dodu', originUrl: '' }), true);
  assert.equal(target.requiresPlaybackDetail({ id: 'dodu', youtubeId: 'video' }), false);
  assert.equal(target.requiresPlaybackDetail({ id: 'sinchang' }), false);
  assert.equal(target.requiresPlaybackDetail({ id: 'dodu', originUrl: 'https://example.test/live.m3u8' }), false);
  assert.equal(target.requiresPlaybackDetail({ id: 'dodu', originUrl: 'http://example.test/live.m3u8' }), false);
});

test('malformed non-string source metadata does not crash the explorer or invent inline transport', () => {
  for (const originUrl of [null, 123, {}, []]) {
    assert.equal(target.requiresExternalPlayback({ id: 'dodu', originUrl }), false);
    assert.equal(target.requiresPlaybackDetail({ id: 'dodu', originUrl }), true);
  }
});
