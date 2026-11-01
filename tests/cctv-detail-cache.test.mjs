import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { CctvInventoryUnavailableError, resolveCctvDetail } from '../lib/cctv-detail.ts';

const require = createRequire(import.meta.url);
const ResponseCache = require('next/dist/server/response-cache').default;
const RenderResult = require('next/dist/server/render-result').default;
const entry = { id: 'known', name: 'Known camera', region: 'Jeju', direction: '북', category: '해변', description: '', originUrl: 'https://example.test/live.m3u8', active: true };
const legacy = { ...entry, latitude: 33.4, longitude: 126.4, status: '실시간', isSaved: false, streamProxyUrl: null };
function compile(relativePath, stubs) {
  const code = ts.transpileModule(readFileSync(new URL(relativePath, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const compiledModule = { exports: {} };
  vm.runInNewContext(code, { exports: compiledModule.exports, module: compiledModule,
    require: (name) => { assert.ok(name in stubs, `Unexpected dependency: ${name}`); return stubs[name]; },
    process: { env: {} }, Date, console,
  });
  return compiledModule.exports;
}
function firestoreReader(get) {
  return compile('../lib/firestore-cctv-server.ts', {
    'server-only': {},
    '@/lib/firebase-admin': { getAdminDb: () => ({ collection: () => ({ doc: () => ({ get }) }) }) },
    '@/constants/cctv-directions': { getDirection: () => '북' },
  });
}

test('Firestore failure is unavailable, never missing or inactive', async () => {
  const reader = firestoreReader(async () => { throw new Error('temporary connection failure'); });
  assert.equal((await reader.lookupCctvById('known')).state, 'unavailable');
});
test('authoritative absent and inactive documents remain distinguishable', async () => {
  const missing = firestoreReader(async () => ({ exists: false }));
  assert.equal((await missing.lookupCctvById('known')).state, 'missing');
  const inactive = firestoreReader(async () => ({ exists: true, id: 'known', data: () => ({ ...entry, active: false }) }));
  const result = await inactive.lookupCctvById('known');
  assert.equal(result.state, 'found');
  assert.equal(result.entry.active, false);
});
test('only authoritative absence uses preserved metadata without playback', () => {
  assert.equal(resolveCctvDetail({ state: 'missing' }, legacy).active, false);
  assert.equal(resolveCctvDetail({ state: 'missing' }), null);
  assert.throws(() => resolveCctvDetail({ state: 'unavailable' }, legacy), CctvInventoryUnavailableError);
  assert.throws(() => resolveCctvDetail({ state: 'unavailable' }), CctvInventoryUnavailableError);
  assert.equal(resolveCctvDetail({ state: 'found', entry }, legacy), entry);
});
test('a transient read failure does not persist in the lookup helper', async () => {
  let fail = true;
  const reader = firestoreReader(async () => {
    if (fail) throw new Error('temporary');
    return { exists: true, id: entry.id, data: () => entry };
  });
  assert.equal((await reader.lookupCctvById(entry.id)).state, 'unavailable');
  fail = false;
  assert.equal((await reader.lookupCctvById(entry.id)).entry.active, true);
});

test('real detail page AND metadata propagate unavailable instead of creating inactive HTML', async () => {
  const noop = () => null;
  const component = new Proxy({}, { get: () => noop });
  const imports = [
    '@/components/cctv/PublicPlaybackBoundary', '@/components/cctv/HlsPlayer', '@/components/cctv/VurixLaunch', '@/components/cctv/HttpsCameraWindow', '@/lib/cctv-playback-target',
    '@/components/cctv/YoutubePlayer', '@/components/common/BetaPlanNotice', '@/components/cctv/LiveChat',
    '@/components/common/DolmangyiIcon', '@/constants/cctv-seo', '@/lib/cctv-location', '@/types/cctv-location',
    '@/components/cctv/CctvDetailActions', '@/components/cctv/RecentGameBanner', '@/components/cctv/CctvLiveInfo',
    '@/lib/spot', '@/lib/i18n',
  ];
  const stubs = Object.fromEntries(imports.map(name => [name, component]));
  Object.assign(stubs, {
    react: { cache: fn => fn },
    'react/jsx-runtime': require('react/jsx-runtime'),
    'next/link': noop,
    'next/navigation': { notFound: () => { throw new Error('should not return 404 for unavailable'); } },
    '@/lib/firestore-cctv-server': { lookupCctvById: async () => ({ state: 'unavailable' }) },
    '@/lib/cctv-detail': { resolveCctvDetail },
    '@/lib/cctv-review': { cctvSourceRevision: () => 'synthetic-revision' },
    '@/lib/cctv-launch-policy': { isLaunchCameraVisible: async camera => camera.active, filterLaunchCameras: async rows => rows },
    '@/constants/mock-cctvs': { mockCctvs: [legacy] },
    '@/constants/public-features': { CCTV_FOCUSED_PUBLIC: true },
  });
  const page = compile('../app/cctv/[id]/page.tsx', stubs);
  assert.equal(page.revalidate, false);
  for (const render of [page.default, page.generateMetadata]) {
    await assert.rejects(render({ params: Promise.resolve({ id: 'known' }) }), CctvInventoryUnavailableError);
  }
});

test('installed Next response cache does not store an outage as a successful cold response', async () => {
  const cache = new ResponseCache(false);
  const writes = [];
  const storage = { set: async (...args) => writes.push(args) };
  await assert.rejects(cache.revalidate('/cctv/cold', storage, false, false,
    async () => resolveCctvDetail({ state: 'unavailable' }, legacy), null, false), CctvInventoryUnavailableError);
  assert.equal(writes.length, 0);
});

test('installed Next ISR keeps last successful value with bounded retry, then recovers', async () => {
  const cache = new ResponseCache(false);
  const writes = [];
  const storage = { set: async (...args) => writes.push(args) };
  const previous = { cacheControl: { revalidate: false }, value: {
    kind: 'APP_PAGE', html: '<article>previous active camera</article>', rscData: undefined,
    headers: undefined, postponed: undefined, status: 200, segmentData: undefined,
  } };
  await assert.rejects(cache.revalidate('/cctv/known', storage, false, false,
    async () => resolveCctvDetail({ state: 'unavailable' }, legacy), previous, false), CctvInventoryUnavailableError);
  assert.equal(writes.length, 1);
  assert.equal(writes[0][1], previous.value);
  assert.ok(writes[0][2].cacheControl.revalidate >= 3 && writes[0][2].cacheControl.revalidate <= 30);
  // A later successful read can replace the old result; the failure was not memoized forever.
  await cache.revalidate('/cctv/known', storage, false, false, async () => {
    const camera = resolveCctvDetail({ state: 'found', entry }, legacy);
    return { cacheControl: { revalidate: false }, value: {
      ...previous.value, html: RenderResult.fromStatic(`<article>${camera.active ? 'recovered active camera' : 'inactive'}</article>`),
    } };
  }, previous, false);
  assert.equal(writes.length, 2);
  assert.match(writes[1][1].html, /recovered active camera/);
});

test('real detail page sends HTTP metadata to separate viewer, never embedded HLS', async () => {
  const { loadPlaybackTarget } = await import('./helpers/load-playback-target.mjs');
  const imports = [
    '@/components/cctv/PublicPlaybackBoundary', '@/components/cctv/HlsPlayer', '@/components/cctv/VurixLaunch', '@/components/cctv/HttpsCameraWindow', '@/components/cctv/YoutubePlayer',
    '@/components/common/BetaPlanNotice', '@/components/cctv/LiveChat', '@/components/common/DolmangyiIcon',
    '@/components/cctv/CctvDetailActions', '@/components/cctv/RecentGameBanner', '@/components/cctv/CctvLiveInfo',
    '@/lib/i18n',
  ];
  const stubs = Object.fromEntries(imports.map(name => [name, new Proxy({}, { get: (_, key) => key })]));
  let camera = { ...entry, id: 'dodu', originUrl: 'http://example.test/live.m3u8' };
  Object.assign(stubs, {
    react: { cache: fn => fn }, 'react/jsx-runtime': require('react/jsx-runtime'), 'next/link': 'Link',
    'next/navigation': { notFound: () => { throw new Error('notFound'); } },
    '@/lib/firestore-cctv-server': { lookupCctvById: async () => ({ state: 'found', entry: camera }), getNearbyCctvs: async () => [] },
    '@/lib/cctv-detail': { resolveCctvDetail },
    '@/lib/cctv-review': { cctvSourceRevision: () => 'synthetic-revision' },
    '@/lib/cctv-launch-policy': { isLaunchCameraVisible: async camera => camera.active, filterLaunchCameras: async rows => rows }, '@/lib/cctv-playback-target': loadPlaybackTarget(),
    '@/constants/mock-cctvs': { mockCctvs: [] }, '@/constants/public-features': { CCTV_FOCUSED_PUBLIC: true },
    '@/constants/cctv-seo': { getCctvSeo: () => ({ intro: '', tips: [], nearby: [] }) },
    '@/lib/cctv-location': { getLocation: async () => null }, '@/types/cctv-location': {}, '@/lib/spot': {},
  });
  const page = compile('../app/cctv/[id]/page.tsx', stubs);
  const nodes = value => !value || typeof value !== 'object' ? [] : Array.isArray(value) ? value.flatMap(nodes) : [value, ...nodes(value.props?.children)];
  for (const [update, expected] of [
    [{ originUrl: 'http://example.test/live.m3u8' }, 'HttpsCameraWindow'],
    [{ originUrl: 'https://example.test/live.m3u8' }, 'HlsPlayer'],
    [{ originUrl: 'http://example.test/live.m3u8', youtubeId: 'video' }, 'YoutubePlayer'],
    [{ active: false }, null],
  ]) {
    camera = { ...entry, id: 'dodu', ...update };
    const players = nodes(await page.default({ params: Promise.resolve({ id: 'dodu' }) })).filter(n => ['HlsPlayer', 'VurixLaunch', 'YoutubePlayer', 'HttpsCameraWindow'].includes(n.type));
    assert.deepEqual(players.map(n => n.type), expected ? [expected] : []);
  }
});
