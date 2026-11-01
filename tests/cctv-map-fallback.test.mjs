import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { loadPlaybackTarget } from './helpers/load-playback-target.mjs';

// Execute the real component/effect with SDK-shaped doubles; no network requests.
function harness({ key = '', leafletFails = false, kakaoReady = false } = {}) {
  const navigations = [];
  const memo = []; let memoCursor = 0; let effectDeps, previousEffectDeps;
  const resizeObservers = []; let kakaoRelayouts = 0;
  const state = [], timers = new Map(), markers = [], scripts = [], popups = [], tileEvents = {};
  let cursor = 0, effect, cleanup, leafletRemoved = 0, tileUrl;
  const node = () => ({ style: {}, setAttribute(name, value) { this[name] = value; }, replaceChildren() {},
    addEventListener(name, cb) { this[name] = cb; }, removeEventListener(name) { delete this[name]; },
    remove() { this.removed = true; } });
  const container = node();
  const jsx = (type, props) => {
    if (props?.ref?.current === container) {
      const hidden = /(?:^|\s)hidden(?:\s|$)/.test(props.className ?? '');
      container.clientWidth = hidden ? 0 : 960;
      container.clientHeight = hidden ? 0 : 600;
    }
    return { type, props };
  };
  const window = { location: { assign: url => navigations.push(url) }, screen: { availWidth: 1440, availHeight: 900 }, setTimeout(fn, ms) { const id = Symbol(); timers.set(id, { fn, ms }); return id; },
    clearTimeout(id) { timers.delete(id); }, open(...args) { popups.push(args); } };
  if (kakaoReady) window.kakao = { maps: {
    load: fn => fn(), LatLng: class {}, LatLngBounds: class { extend() {} },
    Map: class { constructor(element) { assert.ok(element.clientWidth > 0 && element.clientHeight > 0); } setBounds() {} relayout() { kakaoRelayouts++; } }, CustomOverlay: class { constructor(opts) { markers.push(opts.content); } setMap() {} },
  } };
  const leaflet = {
    map: element => { assert.ok(element.clientWidth > 0 && element.clientHeight > 0); return { fitBounds() {}, invalidateSize() {}, remove() { leafletRemoved++; } }; }, latLngBounds: p => p,
    tileLayer(url, options) { tileUrl = url; assert.match(options.attribution, /openstreetmap.org\/copyright/); assert.equal(options.keepBuffer, 0); return {
      on(name, cb) { tileEvents[name] = cb; return this; }, addTo() {},
    }; },
    divIcon: opts => opts,
    marker(position, options) { markers.push(options.icon.html); return { addTo() {} }; },
  };
  const stubs = {
    'leaflet/dist/leaflet.css': {},
    '@/lib/cctv-playback-target': loadPlaybackTarget(window),
    '@/components/cctv/CameraDialog': { CameraDialog: () => null },
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
    react: {
      useState(value) { const i = cursor++; if (!(i in state)) state[i] = value; return [state[i], next => { state[i] = typeof next === 'function' ? next(state[i]) : next; }]; },
      useRef: () => ({ current: container }), useMemo: (fn, deps) => {
        const i = memoCursor++;
        if (!memo[i] || deps.some((v, n) => !Object.is(v, memo[i].deps[n]))) memo[i] = { deps, value: fn() };
        return memo[i].value;
      }, useEffect: (fn, deps) => { effect = fn; effectDeps = deps; },
    },
  };
  const source = readFileSync(new URL('../components/cctv/CctvMap.tsx', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const mod = { exports: {} };
  vm.runInNewContext(code, { exports: mod.exports, module: mod, process: { env: { NEXT_PUBLIC_KAKAO_MAP_KEY: key } }, window, queueMicrotask,
    ResizeObserver: class { constructor(callback) { this.callback = callback; resizeObservers.push(this); } observe() {} disconnect() { this.disconnected = true; } },
    document: { createElement: node, getElementById: () => scripts.find(s => !s.removed) ?? null, head: { appendChild: s => scripts.push(s) } },
    require(name) { if (name === 'leaflet') { if (leafletFails) throw new Error('Unavailable'); return leaflet; } assert.ok(name in stubs, name); return stubs[name]; },
  });
  return {
    render(cctvs, compact = false, onCameraOpen) { cursor = 0; memoCursor = 0; return mod.exports.CctvMap({ cctvs, compact, onCameraOpen }); },
    mount() { cleanup = effect(); previousEffectDeps = effectDeps; },
    commit() {
      if (!previousEffectDeps || effectDeps.some((v, i) => !Object.is(v, previousEffectDeps[i]))) {
        cleanup?.(); cleanup = effect(); previousEffectDeps = effectDeps;
      }
    }, unmount() { cleanup(); },
    async flush() { await new Promise(resolve => setImmediate(resolve)); },
    fireTimer(ms) { for (const [id, timer] of [...timers]) if (timer.ms === ms) { timers.delete(id); timer.fn(); } },
    state, markers, scripts, popups, tileEvents, navigations, resizeObservers, get kakaoRelayouts() { return kakaoRelayouts; }, get tileUrl() { return tileUrl; }, get leafletRemoved() { return leafletRemoved; },
  };
}
const https = { id: 'secure', name: '<b>Safe name</b>', lat: 33.4, lng: 126.5, originUrl: 'https://example.test/stream' };
const http = { ...https, id: 'http', name: 'HTTP camera', originUrl: 'http://example.test/stream?token=never-forward' };

test('missing Kakao key starts keyless OSM; markers synchronously route HTTP and HTTPS', async () => {
  const h = harness(); h.render([https, http]); h.mount(); await h.flush();
  assert.equal(h.scripts.length, 0);
  assert.equal(h.tileUrl, 'https://tile.openstreetmap.org/{z}/{x}/{y}.png');
  h.tileEvents.tileload(); assert.equal(h.state[1], 'osm');
  assert.equal(h.markers[0].textContent, '📷 <b>Safe name</b>');
  h.markers[0].onclick(); assert.equal(h.state[0], 'secure');
  h.markers[1].onclick(); assert.equal(h.state[0], null); assert.equal(h.popups.length, 1);
  assert.equal(h.popups[0][0], '/cctv/watch/http');
  assert.doesNotMatch(h.popups[0][0], /token|example.test/);
  h.unmount(); assert.equal(h.leafletRemoved, 1);
});
test('Kakao error and timeout remove failed SDK and start OSM independently', async () => {
  for (const event of ['error', 'timeout']) {
    const h = harness({ key: 'public-key' }); h.render([https]); h.mount();
    assert.equal(h.scripts.length, 1);
    if (event === 'error') h.scripts[0].error(); else h.fireTimer(8000);
    await h.flush(); assert.equal(h.scripts[0].removed, true); assert.ok(h.tileUrl);
    h.unmount();
  }
});
test('Kakao successful markers use identical top-level HTTP routing', async () => {
  const h = harness({ key: 'public-key', kakaoReady: true }); h.render([http]); h.mount(); await h.flush();
  h.markers[0].onclick(); assert.equal(h.popups.length, 1); assert.equal(h.state[0], null);
  assert.equal(h.tileUrl, undefined); h.unmount();
});
test('Leaflet import failure and tile timeout leave local diagram and accessible inventory', async () => {
  for (const leafletFails of [true, false]) {
    const h = harness({ leafletFails }); h.render([https]); h.mount(); await h.flush();
    if (!leafletFails) h.fireTimer(12000);
    assert.equal(h.state[1], 'static');
    const tree = h.render([https]);
    assert.ok(tree.props.children.find(c => c?.props?.['aria-label'] === 'CCTV 위치 관계도'));
    assert.ok(tree.props.children.find(c => c?.props?.['aria-label'] === '지도 CCTV 목록'));
    h.unmount();
  }
});
test('unmount during dynamic import prevents late map initialization', async () => {
  const h = harness(); h.render([https]); h.mount(); h.unmount(); await h.flush();
  assert.equal(h.tileUrl, undefined); assert.equal(h.markers.length, 0);
});
test('invalid coordinates and inactive cameras never create map markers', async () => {
  const h = harness(); h.render([https, { ...http, lat: NaN }, { ...https, id: 'off', active: false }]); h.mount(); await h.flush();
  assert.equal(h.markers.length, 1); h.unmount();
});

test('late Kakao load and tile callback cannot revive failed or unmounted maps', async () => {
  const h = harness({ key: 'public-key' }); h.render([https]); h.mount();
  const lateLoad = h.scripts[0].load;
  h.fireTimer(8000); await h.flush();
  lateLoad(); assert.equal(h.markers.length, 1);
  h.fireTimer(12000); assert.equal(h.state[1], 'static');
  h.tileEvents.tileload(); assert.equal(h.state[1], 'static');
  h.unmount(); lateLoad(); h.tileEvents.tileload();
  assert.equal(h.state[1], 'static');
});
test('unmount removes SDK listeners and pending fallback timers', async () => {
  const h = harness({ key: 'public-key' }); h.render([https]); h.mount(); h.unmount();
  assert.equal(h.scripts[0].load, undefined); assert.equal(h.scripts[0].error, undefined);
  h.fireTimer(8000); h.fireTimer(12000); await h.flush();
  assert.equal(h.tileUrl, undefined);
});

test('legacy dodu without source metadata navigates encoded detail, never modal/popup', async () => {
  const dodu = { id: 'dodu', name: '도두항', lat: 33.505, lng: 126.466 };
  const h = harness(); h.render([dodu]); h.mount(); await h.flush();
  h.markers[0].onclick();
  assert.deepEqual(h.navigations, ['/cctv/dodu']);
  assert.equal(h.popups.length, 0); assert.equal(h.state[0], null);
  h.unmount();
});

test('static fallback stays measurable for inventory refresh and retry resets loading', async () => {
  const h = harness(); h.render([https]); h.mount(); await h.flush(); h.fireTimer(12000);
  assert.equal(h.state[1], 'static');
  const tree = h.render([https]);
  const mapWrapper = tree.props.children.find(c => c?.type === 'div' && c?.props?.className === 'relative');
  assert.match(mapWrapper.props.children.props.className, /absolute/);
  assert.doesNotMatch(mapWrapper.props.children.props.className, /(?:^|\s)(?:relative|hidden)(?:\s|$)/);
  const diagram = tree.props.children.find(c => c?.props?.['aria-label'] === 'CCTV 위치 관계도');
  const retry = diagram.props.children.find(c => c?.type === 'button');
  h.unmount(); h.render([{ ...https, name: 'Updated' }]); h.mount(); await h.flush();
  assert.equal(h.markers.length, 2, 'inventory refresh initializes map with nonzero dimensions');
  h.fireTimer(12000); retry.props.onClick(); assert.equal(h.state[1], 'loading');
  h.unmount();
});

test('compact map keeps bounded canvas, numbered accessible pins and synchronous HTTP launch', async () => {
  const h = harness();
  const tree = h.render([https, http], true);
  const wrapper = tree.props.children.find(c => c?.type === 'div' && c?.props?.className === 'relative');
  assert.match(wrapper.props.children.props.className, /wind-map-canvas/);
  assert.match(wrapper.props.children.props.className, /h-\[420px\]/);
  assert.doesNotMatch(wrapper.props.children.props.className, /60vh/);
  const index = tree.props.children.find(c => c?.type === 'details');
  assert.equal(index.props.open, false);
  assert.equal(index.props.children[0].type, 'summary');
  assert.equal(tree.props.children.some(c => c?.props?.['aria-label'] === '지도 CCTV 목록'), false);
  h.mount(); await h.flush();
  assert.equal(h.markers[1].textContent, '2');
  assert.equal(h.markers[1].title, 'HTTP camera');
  assert.match(h.markers[1]['aria-label'], /HTTP camera.*새 창/);
  h.markers[1].onclick();
  assert.equal(h.popups[0][0], '/cctv/watch/http');
  assert.equal(h.state[0], null);
  h.unmount();
});

test('compact static fallback opens real camera index and keeps nonzero map geometry', async () => {
  const h = harness({ leafletFails: true }); h.render([https], true); h.mount(); await h.flush();
  const tree = h.render([https], true);
  const index = tree.props.children.find(c => c?.type === 'details');
  assert.equal(index.props.open, true);
  assert.equal(index.props.children[1].props['aria-label'], '지도 CCTV 목록');
  const diagram = tree.props.children.find(c => c?.props?.['aria-label'] === 'CCTV 위치 관계도');
  assert.match(diagram.props.className, /wind-map-diagram/);
  const wrapper = tree.props.children.find(c => c?.type === 'div' && c?.props?.className === 'relative');
  assert.match(wrapper.props.children.props.className, /absolute/);
  assert.doesNotMatch(wrapper.props.children.props.className, /(?:^|\s)hidden(?:\s|$)/);
  h.unmount();
});

test('compact empty-coordinate inventory exposes names rather than a blank collapsed panel', () => {
  const h = harness(); const tree = h.render([{ ...https, lat: undefined }], true);
  const index = tree.props.children.find(c => c?.type === 'details');
  assert.equal(index.props.open, true);
  assert.equal(index.props.children[1].props['aria-label'], '지도 CCTV 목록');
});

test('compact selection callback only fires on active gesture before HTTP window launch', async () => {
  const h = harness(); const selected = [];
  const callback = id => { assert.equal(h.popups.length, 0); selected.push(id); };
  h.render([http, { ...https, active: false }], true, callback); h.mount(); await h.flush();
  assert.deepEqual(selected, [], 'mount must never select or launch a camera');
  assert.equal(h.markers.length, 1, 'disabled cameras cannot emit selection callbacks');
  h.markers[0].onclick();
  assert.deepEqual(selected, ['http']); assert.equal(h.popups.length, 1);
  h.unmount();
});

test('accessible index and static diagram forward active explicit camera selection', async () => {
  const h = harness({ leafletFails: true }); const selected = [];
  const camera = { ...https }; const callback = id => selected.push(id);
  h.render([camera], true, callback); h.mount(); await h.flush();
  const tree = h.render([camera], true, callback);
  const details = tree.props.children.find(c => c?.type === 'details');
  const index = details.props.children[1];
  const list = index.props.children[1];
  const button = list.props.children[0].props.children[0];
  button.props.onClick(); assert.deepEqual(selected, ['secure']);
  const diagram = tree.props.children.find(c => c?.props?.['aria-label'] === 'CCTV 위치 관계도');
  diagram.props.children[1].props.children[0].props.onClick();
  assert.deepEqual(selected, ['secure', 'secure']);
  camera.active = false; button.props.onClick();
  assert.deepEqual(selected, ['secure', 'secure'], 'disabled stale index gesture must not notify');
  h.unmount();
});

test('fresh same-content inventory and unrelated rerenders preserve map instance', async () => {
  const h = harness(); const callback = () => {};
  h.render([https, http], true, callback); h.mount(); await h.flush();
  h.tileEvents.tileload();
  for (let i = 0; i < 3; i++) {
    h.render([{ ...https }, { ...http }], true, callback); h.commit(); await h.flush();
  }
  assert.equal(h.markers.length, 2); assert.equal(h.leafletRemoved, 0);
  h.markers[0].onclick(); // Own dialog selection is also not a map-data change.
  h.render([{ ...https }, { ...http }], true, callback); h.commit(); await h.flush();
  assert.equal(h.leafletRemoved, 0);
  h.render([{ ...https, originUrl: 'https://example.test/updated' }, http], true, callback); h.commit(); await h.flush();
  assert.equal(h.leafletRemoved, 1, 'source edits must rebuild closures');
  h.render([{ ...https, lat: 33.6, name: 'New name' }], true, callback); h.commit(); await h.flush();
  assert.equal(h.leafletRemoved, 2, 'filters, positions and labels remain reactive');
  h.unmount();
});

test('replacement callback stays current and Kakao observes column resize with cleanup', async () => {
  const h = harness({ key: 'key', kakaoReady: true }); const selected = [];
  h.render([http], true, id => selected.push(`old:${id}`)); h.mount(); await h.flush();
  const observer = h.resizeObservers[0]; observer.callback();
  assert.equal(h.kakaoRelayouts, 1);
  h.render([{ ...http }], true, id => selected.push(`new:${id}`)); h.commit(); await h.flush();
  assert.equal(observer.disconnected, true);
  h.markers.at(-1).onclick(); assert.deepEqual(selected, ['new:http']);
  h.unmount(); assert.equal(h.resizeObservers.at(-1).disconnected, true);
});
