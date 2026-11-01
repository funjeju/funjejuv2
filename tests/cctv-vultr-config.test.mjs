import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../vultr-proxy/server.js', import.meta.url), 'utf8');
const origin = 'http://camera.example/live/a/playlist.m3u8';
async function harness(secret = "test-only") {
  const routes = new Map();
  const calls = [];
  const captures = [];
  let now = Date.now();
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
  let respond = async () => ({ ok: false, status: 503 });
  const app = { use() {}, get(path, fn) { routes.set(path, fn); }, post() {}, listen() {} };
  const express = Object.assign(() => app, { json: () => {}, text: () => {} });
  const context = vm.createContext({
    require(name) {
      if (name === 'express') return express;
      if (name === 'stream') return {};
      if (name === 'child_process') return { execFile: (...args) => captures.push(args.at(-1)) };
      throw new Error(`Unexpected require: ${name}`);
    },
    process: { env: { ADMIN_SECRET: secret }, on() {}, memoryUsage: () => ({ rss: 0 }) },
    console: { log() {}, error() {}, warn() {} }, Buffer, URL, AbortController, Date: Clock,
    AbortSignal: { timeout: () => undefined },
    setTimeout: () => 1, clearTimeout() {}, setInterval() {},
    fetch: (...args) => { calls.push(args); return respond(...args); },
  });
  vm.runInContext(source + '\nglobalThis.inspect = { refreshCctvs, applyConfig, cameraOrigin, m3u8Cache, tsCache, inflight, relays, sourceVersions, allowedSegments, playlistReferences, isSegmentAllowed, rememberSegments, snapshot: () => ({...CCTVS}) };', context);
  await Promise.resolve(); await Promise.resolve();
  const api = context.inspect;
  async function refresh(value, status = 200) {
    respond = async () => ({ ok: status >= 200 && status < 300, status, json: async () => value });
    await api.refreshCctvs();
  }
  function request(path, extras = {}) {
    const req = { params: { id: 'cam', file: '1.ts' }, query: { path: 'http://camera.example/live/a/seg_1.ts', id: 'cam', cctv: 'cam' }, headers: {}, protocol: 'https', get: () => 'proxy.example', ...extras };
    const res = { code: 200, headersSent: false, destroyed: false, body: undefined, status(n) { this.code = n; return this; }, json(body) { this.body = body; return this; }, send(body) { this.body = body; return this; }, set() { return this; }, setHeader() {}, on() {}, destroy() { this.destroyed = true; } };
    return { res, done: Promise.resolve(routes.get(path)(req, res)) };
  }
  return { api, calls, captures, refresh, request, advance(ms) { now += ms; }, setFetch(fn) { respond = fn; } };
}

test('valid empty is authoritative; later failure does not resurrect seed cameras', async () => {
  const h = await harness();
  await h.refresh({ cam: origin });
  assert.equal(h.api.cameraOrigin('cam'), origin);
  await h.refresh({});
  assert.equal(Object.keys(h.api.snapshot()).length, 0);
  await h.refresh({ error: 'unavailable' }, 503);
  assert.equal(Object.keys(h.api.snapshot()).length, 0);
});

test('invalid config and HTTP failure retain last valid map', async () => {
  const h = await harness();
  await h.refresh({ cam: origin });
  for (const invalid of [null, [], '', { error: 'down' }, { ok: true }, { cam: 'file:///etc/passwd' }, { cam: 'invalid' }, { cam: 'http://user:pass@camera.example/x' }, { cam: 123 }, { cam: origin, other: 'invalid' }]) {
    await h.refresh(invalid);
    assert.equal(h.api.cameraOrigin('cam'), origin);
  }
  await h.refresh({}, 403);
  assert.equal(h.api.cameraOrigin('cam'), origin);
  h.setFetch(async () => ({ ok: true, json: async () => { throw new Error('bad JSON'); } }));
  await h.api.refreshCctvs();
  assert.equal(h.api.cameraOrigin('cam'), origin);
  h.setFetch(async () => { throw new Error('timeout'); });
  await h.api.refreshCctvs();
  assert.equal(h.api.cameraOrigin('cam'), origin);
});

test('removed cameras are refused before all caches, fetches and ffmpeg', async () => {
  const h = await harness();
  await h.refresh({ cam: origin });
  h.api.m3u8Cache.set('cam', { data: 'old manifest', ts: Date.now() });
  h.api.tsCache.set('ts:cam:1', { data: Buffer.from('old segment'), ts: Date.now() });
  h.api.relays.cam = { segments: [{ seq: 1, data: Buffer.from('relay') }] };
  await h.refresh({});
  assert.equal(h.api.m3u8Cache.size, 0); assert.equal(h.api.tsCache.size, 0); assert.equal(h.api.relays.cam, undefined);
  // Even a stale buffer accidentally retained/reinserted cannot bypass ID publication.
  h.api.m3u8Cache.set('cam', { data: 'stale manifest', ts: Date.now() });
  h.api.m3u8Cache.set('chunklist:cam', { data: 'stale chunklist', ts: Date.now() });
  h.api.tsCache.set('ts:cam:1', { data: Buffer.from('stale segment'), ts: Date.now() });
  h.api.relays.cam = { segments: [{ seq: 1, data: Buffer.from('stale relay') }] };
  const count = h.calls.length;
  for (const route of ['/cctv/:id', '/cctv/:id/seg', '/cctv/:id/relayseg/:file', '/watch', '/snapshot']) {
    const { res, done } = h.request(route); await done;
    assert.equal(res.code, 404, route);
  }
  assert.equal(h.calls.length, count); assert.equal(h.captures.length, 0);
});

test('source edit clears only affected buffers; old source paths are refused', async () => {
  const h = await harness();
  await h.refresh({ cam: origin, keep: origin });
  h.api.m3u8Cache.set('cam', { data: 'old', ts: Date.now() });
  h.api.m3u8Cache.set('keep', { data: 'keep', ts: Date.now() });
  h.api.m3u8Cache.set('chunklist:cam', { data: 'old', ts: Date.now() });
  h.api.tsCache.set('ts:cam:any', { data: 'old', ts: Date.now() });
  h.api.relays.cam = { segments: [] };
  await h.refresh({ cam: 'http://camera.example/live/b/playlist.m3u8', keep: origin });
  assert.equal(h.api.m3u8Cache.has('cam'), false); assert.equal(h.api.m3u8Cache.has('chunklist:cam'), false);
  assert.equal(h.api.m3u8Cache.has('keep'), true); assert.equal(h.api.tsCache.size, 0); assert.equal(h.api.relays.cam, undefined);
  const count = h.calls.length;
  const { res, done } = h.request('/cctv/:id/seg'); await done;
  assert.equal(res.code, 400); assert.equal(h.calls.length, count);
});

for (const route of ['/cctv/:id', '/cctv/:id/seg']) {
  test(`${route} discards an in-flight response after disable and re-enable`, async () => {
    const h = await harness(); await h.refresh({ cam: origin });
    h.api.rememberSegments('cam', ['http://camera.example/live/a/seg_1.ts']);
    let complete;
    h.setFetch(() => new Promise(resolve => { complete = resolve; }));
    const { res, done } = h.request(route);
    await h.refresh({}); await h.refresh({ cam: origin });
    complete({ ok: true, status: 200, text: async () => '#EXTM3U\nseg_1.ts', arrayBuffer: async () => Buffer.from('old segment'), headers: { get: () => 'video/MP2T' } });
    await done;
    assert.equal(res.code, 404); assert.equal(h.api.m3u8Cache.size, 0); assert.equal(h.api.tsCache.size, 0);
  });
}

test('snapshot callback discards capture after source removal', async () => {
  const h = await harness(); await h.refresh({ cam: origin });
  const { res } = h.request('/snapshot');
  assert.equal(h.captures.length, 1);
  await h.refresh({});
  h.captures[0](null, Buffer.from('old jpeg'));
  assert.equal(res.code, 404);
});

test('prototype keys cannot resolve into a camera', async () => {
  const h = await harness();
  assert.equal(h.api.cameraOrigin('constructor'), undefined);
  await h.refresh(JSON.parse('{"__proto__":"http://camera.example/p.m3u8"}'));
  assert.equal(h.api.cameraOrigin('__proto__'), undefined);
});


test('config-managed startup fails closed while no-secret static mode is preserved', async () => {
  const configured = await harness();
  assert.equal(Object.keys(configured.api.snapshot()).length, 0);
  const manual = await harness('');
  assert.ok(Object.keys(manual.api.snapshot()).length > 30);
  assert.equal(manual.calls.length, 0);
});

test('current manifests permit advertised CDN paths but not arbitrary or stale URLs', async () => {
  const h = await harness(); await h.refresh({ cam: origin });
  h.setFetch(async () => ({ ok: true, status: 200, text: async () => '#EXTM3U\nhttps://cdn.example/video/chunk.m3u8' }));
  const main = h.request('/cctv/:id'); await main.done;
  assert.equal(main.res.code, 200);
  assert.ok(h.api.isSegmentAllowed('cam', 'https://cdn.example/video/chunk.m3u8'));
  h.setFetch(async () => ({ ok: true, status: 200, text: async () => '#EXTM3U\nhttps://other-cdn.example/seg_123.ts' }));
  const chunk = h.request('/cctv/:id/seg', { query: { path: 'https://cdn.example/video/chunk.m3u8' } }); await chunk.done;
  assert.equal(chunk.res.code, 200);
  assert.ok(h.api.allowedSegments.get('cam').has('https://other-cdn.example/seg_123.ts'));
  const count = h.calls.length;
  const arbitrary = h.request('/cctv/:id/seg', { query: { path: 'https://unrelated.example/private' } }); await arbitrary.done;
  assert.equal(arbitrary.res.code, 400); assert.equal(h.calls.length, count);
  await h.refresh({ cam: 'https://new.example/playlist.m3u8' });
  assert.equal(h.api.allowedSegments.has('cam'), false);
  const old = h.request('/cctv/:id/seg', { query: { path: 'https://cdn.example/video/chunk.m3u8' } }); await old.done;
  assert.equal(old.res.code, 400);
});

async function popupHarness() {
  const h = await harness(); await h.refresh({ cam: origin });
  const { res, done } = h.request('/watch'); await done;
  const inline = res.body.match(/<script>\n([\s\S]*?)<\/script>/)[1];
  let now = 0;
  const intervals = new Map(); let nextId = 0;
  const windowEvents = new Map();
  const nodes = new Map();
  const instances = [];
  function node(id) {
    if (!nodes.has(id)) nodes.set(id, { textContent: '', hidden: false, style: {}, listeners: new Map(), addEventListener(type, cb) { this.listeners.set(type, cb); } });
    return nodes.get(id);
  }
  const video = Object.assign(node('v'), {
    readyState: 0, videoWidth: 0, videoHeight: 0, currentTime: 0, paused: true,
    play() { this.paused = false; return Promise.resolve(); }, pause() { this.paused = true; },
    removeAttribute() {}, load() { this.readyState = 0; }, canPlayType: () => '',
  });
  class Hls {
    static Events = { MANIFEST_PARSED: 'manifest', ERROR: 'error' };
    static isSupported() { return true; }
    constructor() { this.events = new Map(); this.destroyed = false; instances.push(this); }
    on(type, cb) { this.events.set(type, cb); }
    loadSource() {} attachMedia() {} destroy() { this.destroyed = true; }
  }
  const document = { hidden: false, getElementById: node, addEventListener() {} };
  const window = { Hls, addEventListener: (type, cb) => windowEvents.set(type, cb), close() {} };
  class Clock extends Date { constructor() { super(now); } static now() { return now; } }
  vm.runInNewContext(inline, {
    window, document, Hls, Date: Clock, URLSearchParams, location: { search: '' },
    setInterval(fn) { const id = ++nextId; intervals.set(id, fn); return id; },
    clearInterval: id => intervals.delete(id),
  });
  function tick(ms) { now += ms; for (const fn of intervals.values()) fn(); }
  return { node, video, instances, tick, intervals, windowEvents, document };
}

test('/watch manifest success alone never claims playback and times out after 20 seconds', async () => {
  const p = await popupHarness();
  p.instances[0].events.get('manifest')();
  assert.equal(p.node('playback-status').textContent, '연결 확인 중');
  assert.equal(p.node('ld').style.display, 'flex');
  p.tick(20000);
  assert.equal(p.node('playback-status').textContent, '임시 오류');
  assert.equal(p.node('retry').hidden, false);
  assert.equal(p.instances[0].destroyed, true);
});

test('/watch decoded dimensions plus progressing media time verify playback; stalls require manual retry', async () => {
  const p = await popupHarness(); p.instances[0].events.get('manifest')();
  Object.assign(p.video, { readyState: 4, videoWidth: 1280, videoHeight: 720, currentTime: 1 });
  p.tick(1000);
  assert.equal(p.node('playback-status').textContent, '재생 확인됨');
  assert.equal(p.node('ld').style.display, 'none');
  p.tick(20000);
  assert.equal(p.node('playback-status').textContent, '임시 오류');
  assert.equal(p.instances.length, 1); // no endless automatic retry
  p.node('retry').listeners.get('click')();
  assert.equal(p.instances.length, 2);
  p.instances[0].events.get('error')(null, { fatal: true }); // destroyed attempt must not poison retry
  assert.equal(p.node('playback-status').textContent, '연결 확인 중');
});

test('/watch fatal errors show temporary error and unload cleans timers and media', async () => {
  const p = await popupHarness();
  p.instances[0].events.get('error')(null, { fatal: true });
  assert.equal(p.node('playback-status').textContent, '임시 오류');
  p.node('retry').listeners.get('click')();
  p.windowEvents.get('pagehide')();
  assert.equal(p.intervals.size, 0);
  assert.equal(p.instances[1].destroyed, true);
  assert.equal(p.video.paused, true);
});

test('/watch background tab time alone is not reported as a playback outage', async () => {
  const p = await popupHarness();
  p.document.hidden = true; p.tick(60000);
  assert.equal(p.node('playback-status').textContent, '연결 확인 중');
  p.document.hidden = false; p.tick(20000);
  assert.equal(p.node('playback-status').textContent, '임시 오류');
});


test('stable child playlists remain authorized after more than 1000 live segments rotate', async () => {
  const h = await harness(); await h.refresh({ cam: origin });
  const child = 'https://cdn.example/video/child.m3u8';
  let segment = 0;
  h.setFetch(async url => ({ ok: true, status: 200, text: async () => url === origin
    ? '#EXTM3U\n' + child
    : '#EXTM3U\n' + Array.from({ length: 12 }, () => 'https://cdn.example/video/seg_' + (++segment) + '.ts').join('\n') }));
  const main = h.request('/cctv/:id'); await main.done;
  assert.equal(main.res.code, 200);
  for (let i = 0; i < 100; i++) {
    h.api.m3u8Cache.delete('chunklist:cam:' + child); // simulate playlist TTL expiry
    const chunk = h.request('/cctv/:id/seg', { query: { path: child } }); await chunk.done;
    assert.equal(chunk.res.code, 200, 'child reload ' + i);
  }
  assert.ok(segment > 1000);
  assert.equal(h.api.allowedSegments.get('cam').size, 1000);
  assert.equal(h.api.isSegmentAllowed('cam', child), true);
  assert.equal(h.api.isSegmentAllowed('cam', 'https://cdn.example/video/seg_1.ts'), false);
  const arbitrary = h.request('/cctv/:id/seg', { query: { path: 'https://arbitrary.example/x.m3u8' } }); await arbitrary.done;
  assert.equal(arbitrary.res.code, 400);
  await h.refresh({ cam: 'https://new.example/playlist.m3u8' });
  assert.equal(h.api.playlistReferences.has('cam'), false);
  const stale = h.request('/cctv/:id/seg', { query: { path: child } }); await stale.done;
  assert.equal(stale.res.code, 400);
});

test('routine origin session rotation preserves active viewers and expires only idle authorizations', async () => {
  const h = await harness(); await h.refresh({ cam: origin });
  const a = 'https://cdn.example/session-A/child.m3u8', b = 'https://cdn.example/session-B/child.m3u8';
  let root = a;
  const requested = [];
  h.setFetch(async url => { requested.push(url); return { ok: true, status: 200, text: async () => url === origin
    ? '#EXTM3U\n' + root : '#EXTM3U\n' + url.replace('child.m3u8', 'seg_1.ts') }; });
  const mainA = h.request('/cctv/:id'); await mainA.done;
  const childA = h.request('/cctv/:id/seg', { query: { path: a } }); await childA.done;
  assert.equal(childA.res.code, 200); assert.ok(childA.res.body.includes('session-A'));
  root = b; h.advance(7000); // root cache expires and new origin session is advertised
  const mainB = h.request('/cctv/:id'); await mainB.done;
  const childB = h.request('/cctv/:id/seg', { query: { path: b } }); await childB.done;
  assert.equal(childB.res.code, 200); assert.ok(childB.res.body.includes('session-B'));
  assert.ok(requested.includes(a)); assert.ok(requested.includes(b));
  const againA = h.request('/cctv/:id/seg', { query: { path: a } }); await againA.done;
  assert.equal(againA.res.code, 200); assert.ok(againA.res.body.includes('session-A'));
  // A keeps polling beyond B's idle expiry. Active use renews authorization.
  h.advance(30000);
  const activeA = h.request('/cctv/:id/seg', { query: { path: a } }); await activeA.done;
  assert.equal(activeA.res.code, 200);
  h.advance(31000);
  const expiredB = h.request('/cctv/:id/seg', { query: { path: b } }); await expiredB.done;
  assert.equal(expiredB.res.code, 400);
  const stillA = h.request('/cctv/:id/seg', { query: { path: a } }); await stillA.done;
  assert.equal(stillA.res.code, 200);
  await h.refresh({});
  const disabledA = h.request('/cctv/:id/seg', { query: { path: a } }); await disabledA.done;
  assert.equal(disabledA.res.code, 404);
  assert.equal(h.api.playlistReferences.has('cam'), false);
  assert.equal([...h.api.m3u8Cache.keys()].some(key => key.startsWith('chunklist:cam:')), false);
});

test('active playlist capacity is bounded without evicting existing sessions', async () => {
  const h = await harness(); await h.refresh({ cam: origin });
  const urls = Array.from({ length: 256 }, (_, i) => 'https://cdn.example/session-' + i + '.m3u8');
  h.api.rememberSegments('cam', urls);
  assert.throws(() => h.api.rememberSegments('cam', ['https://cdn.example/new.m3u8']), /limit exceeded/);
  assert.equal(h.api.playlistReferences.get('cam').size, 256);
  assert.equal(h.api.isSegmentAllowed('cam', urls[0]), true);
  h.advance(60000);
  h.api.rememberSegments('cam', ['https://cdn.example/new.m3u8']);
  assert.equal(h.api.playlistReferences.get('cam').size, 1);
});
