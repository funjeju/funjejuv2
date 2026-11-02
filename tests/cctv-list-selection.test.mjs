import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { loadPlaybackTarget } from './helpers/load-playback-target.mjs';

// Execute the real component with a minimal deterministic hook harness. This
// covers render/state reconciliation, not browser dialog or Kakao SDK behavior.
function listHarness(preview = false) {
  const state = [];
  const opened = [];
  const navigated = [];
  let lastTree;
  const playback = loadPlaybackTarget({ screen: { availWidth: 1280, availHeight: 800 }, open: (...args) => { opened.push(args); return null; } });
  const setters = [];
  let cursor = 0;
  let pending = false;
  const jsx = (type, props, key) => ({ type, props, key });
  const stubs = {
    '@/components/common/PreviewRuntimeProvider': { usePreviewRuntime: () => preview },
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: Symbol('Fragment') },
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in state)) state[index] = initial;
        setters[index] = (next) => {
          const value = typeof next === 'function' ? next(state[index]) : next;
          if (!Object.is(value, state[index])) { state[index] = value; pending = true; }
        };
        return [state[index], setters[index]];
      },
      useRef: () => ({ current: null }),
      useMemo: fn => fn(),
      useEffect: () => {},
    },
    'next/link': { default: () => null },
    '@/components/cctv/CctvCard': { CctvCard: () => null },
    '@/components/cctv/CameraDialog': { CameraDialog: () => null },
    '@/components/cctv/HlsPlayer': { HlsPlayer: () => null },
    '@/components/cctv/YoutubePlayer': { YoutubePlayer: () => null },
    '@/components/cctv/VurixLaunch': { VurixLaunch: () => null },
    '@/lib/cctv-playback-target': playback,
    '@/constants/vurix': { isVurixId: () => false },
  };
  const source = readFileSync(new URL('../components/cctv/CctvList.tsx', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const mod = { exports: {} };
  vm.runInNewContext(code, { exports: mod.exports, module: mod, window: { location: { assign: url => navigated.push(url) } }, process: { env: {} },
    require: name => { assert.ok(name in stubs, `Unexpected dependency ${name}`); return stubs[name]; },
  });
  function render(cctvs) {
    let tree;
    let attempts = 0;
    do {
      assert.ok(attempts++ < 10, 'selection reconciliation must not loop');
      cursor = 0; pending = false;
      tree = mod.exports.CctvList({ cctvs });
    } while (pending);
    lastTree = tree;
    return tree.props.children.find(child => child?.props?.camera) ?? null;
  }
  return { render, opened, navigated, click: id => lastTree.props.children[0].props.children.find(card => card.props.cctv.id === id).props.onOpen(), select: id => setters[0](id), selection: () => state[0] };
}
const a = { id: 'a', name: 'A', active: true, originUrl: 'https://example.test/live.m3u8', lat: 33.4, lng: 126.5 };
const b = { id: 'b', name: 'B', active: true, originUrl: 'https://example.test/live.m3u8', lat: 33.5, lng: 126.6 };

test('list: open A → filter leaves B → restore cannot reopen or remount a player', () => {
  const map = listHarness();
  map.render([a, b]); map.select('a');
  assert.equal(map.render([a, b]).props.camera.id, 'a');
  assert.equal(map.render([b]), null);
  assert.equal(map.selection(), null);
  assert.equal(map.render([a, b]), null);
});
test('list: published removal and disable discard the selection permanently', () => {
  for (const unavailable of [[], [b], [{ ...a, active: false }, b]]) {
    const map = listHarness();
    map.render([a, b]); map.select('a'); map.render([a, b]);
    assert.equal(map.render(unavailable), null);
    assert.equal(map.render([a, b]), null);
  }
});
test('list: ordinary rerender and metadata updates preserve selected camera without closing', () => {
  const map = listHarness();
  map.render([a, b]); map.select('a');
  assert.equal(map.render([a, b]).props.camera.id, 'a');
  assert.equal(map.render([{ ...a, name: 'Updated A' }, b]).props.camera.name, 'Updated A');
  assert.equal(map.selection(), 'a');
});
test('list: close/Escape callback clears selection and a later explicit selection can reopen', () => {
  const map = listHarness();
  map.render([a, b]); map.select('a');
  map.render([a, b]).props.onClose();
  assert.equal(map.render([a, b]), null);
  map.select('a');
  assert.equal(map.render([a, b]).props.camera.id, 'a');
});
test('list: frozen readonly inventory is never mutated', () => {
  const map = listHarness();
  const inventory = Object.freeze([Object.freeze({ ...a }), Object.freeze({ ...b })]);
  map.render(inventory); map.select('a');
  assert.equal(map.render(inventory).props.camera.id, 'a');
  assert.equal(inventory.length, 2);
});

test('list: HTTP dodu click opens synchronously and never mounts modal, even if popup returns null', () => {
  const list = listHarness();
  const dodu = { ...a, id: 'dodu', originUrl: 'http://example.test/token/secret.m3u8' };
  list.render([dodu]); list.click('dodu');
  assert.equal(list.opened.length, 1);
  assert.equal(list.render([dodu]), null);
  assert.equal(list.opened[0][0], '/cctv/watch/dodu');
  assert.ok(!list.opened[0][0].includes('secret'));
});
test('list: HTTPS and YouTube retain modal; transition to HTTP closes without unsolicited popup', () => {
  for (const extra of [{ originUrl: 'https://example.test/video.m3u8' }, { originUrl: 'http://example.test/video.m3u8', youtubeId: 'video' }]) {
    const list = listHarness(), c = { ...a, ...extra };
    list.render([c]); list.click(c.id);
    assert.equal(list.render([c]).props.camera.id, c.id);
    assert.equal(list.opened.length, 0);
    assert.equal(list.render([{ ...c, youtubeId: undefined, originUrl: 'http://example.test/new.m3u8' }]), null);
    assert.equal(list.render([c]), null);
    assert.equal(list.opened.length, 0);
  }
});
test('list: inactive HTTP cannot launch', () => {
  const list = listHarness(), c = { ...a, active: false, originUrl: 'http://example.test/video.m3u8' };
  list.render([c]); list.click(c.id);
  assert.equal(list.opened.length, 0); assert.equal(list.render([c]), null);
});

test('list: actual-shaped legacy dodu summary routes to authoritative detail, never guesses playback', () => {
  const list = listHarness();
  const dodu = { id: 'dodu', name: '도두항', region: '제주시', direction: '북', category: '항구', status: '실시간', description: '', latitude: 33.5, longitude: 126.4, isSaved: false, streamProxyUrl: '/api/cctv/dodu' };
  list.render([dodu]); list.click('dodu');
  assert.deepEqual(list.navigated, ['/cctv/dodu']);
  assert.equal(list.opened.length, 0);
  assert.equal(list.render([dodu]), null);
});
test('list: unknown legacy detail target encodes the camera id', () => {
  const list = listHarness();
  const c = { ...a, id: 'a/b?x=1', originUrl: '' };
  list.render([c]); list.click(c.id);
  assert.deepEqual(list.navigated, ['/cctv/a%2Fb%3Fx%3D1']);
  assert.equal(list.render([c]), null);
});

test('preview list opens safe sources and official Hallasan pages synchronously, without modal or relay', () => {
  for (const [c, destination] of [
    [{ ...a, originUrl: 'http://cctv.example.kr/live.m3u8' }, 'http://cctv.example.kr/live.m3u8'],
    [{ ...a, originUrl: 'https://cctv.example.kr/live.m3u8' }, 'https://cctv.example.kr/live.m3u8'],
    [{ ...a, id: 'halla_baengnokdam', originUrl: 'http://cctv.example.kr/live.m3u8' }, 'https://www.jeju.go.kr/tool/halla/cctv_01.html'],
  ]) {
    const list=listHarness(true);list.render([c]);assert.equal(list.opened.length,0);
    list.click(c.id);assert.equal(list.opened[0][0],destination);assert.equal(list.render([c]),null);
    assert.deepEqual(list.navigated,[]);assert.match(list.opened[0][2],/noopener,noreferrer/);
  }
  for(const update of [{active:false},{originUrl:'http://127.0.0.1/a'},{originUrl:'http://cctv.example.kr/a?token=secret'},{originUrl:''},{youtubeId:'unverified'}]){
    const list=listHarness(true),c={...a,...update};list.render([c]);list.click(c.id);
    assert.equal(list.opened.length,0);assert.equal(list.render([c]),null);
  }
});
