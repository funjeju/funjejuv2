import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the real component with a minimal deterministic hook harness. This
// covers render/state reconciliation, not browser dialog or Kakao SDK behavior.
function mapHarness() {
  const state = [];
  const setters = [];
  let cursor = 0;
  let pending = false;
  const jsx = (type, props, key) => ({ type, props, key });
  const stubs = {
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
    '@/components/cctv/CameraDialog': { CameraDialog: () => null },
    '@/components/cctv/HlsPlayer': { HlsPlayer: () => null },
    '@/components/cctv/YoutubePlayer': { YoutubePlayer: () => null },
    '@/components/cctv/VurixLaunch': { VurixLaunch: () => null },
    '@/constants/vurix': { isVurixId: () => false },
  };
  const source = readFileSync(new URL('../components/cctv/CctvMap.tsx', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const mod = { exports: {} };
  vm.runInNewContext(code, { exports: mod.exports, module: mod, process: { env: {} },
    require: name => { assert.ok(name in stubs, `Unexpected dependency ${name}`); return stubs[name]; },
  });
  function render(cctvs) {
    let tree;
    let attempts = 0;
    do {
      assert.ok(attempts++ < 10, 'selection reconciliation must not loop');
      cursor = 0; pending = false;
      tree = mod.exports.CctvMap({ cctvs });
    } while (pending);
    return tree.props.children.find(child => child?.props?.camera) ?? null;
  }
  return { render, select: id => setters[0](id), selection: () => state[0] };
}
const a = { id: 'a', name: 'A', active: true, lat: 33.4, lng: 126.5 };
const b = { id: 'b', name: 'B', active: true, lat: 33.5, lng: 126.6 };

test('open A → filter leaves B → restore cannot reopen or remount a player', () => {
  const map = mapHarness();
  map.render([a, b]); map.select('a');
  assert.equal(map.render([a, b]).props.camera.id, 'a');
  assert.equal(map.render([b]), null);
  assert.equal(map.selection(), null);
  assert.equal(map.render([a, b]), null);
});
test('published removal and disable discard the selection permanently', () => {
  for (const unavailable of [[], [b], [{ ...a, active: false }, b]]) {
    const map = mapHarness();
    map.render([a, b]); map.select('a'); map.render([a, b]);
    assert.equal(map.render(unavailable), null);
    assert.equal(map.render([a, b]), null);
  }
});
test('ordinary rerender and metadata updates preserve selected camera without closing', () => {
  const map = mapHarness();
  map.render([a, b]); map.select('a');
  assert.equal(map.render([a, b]).props.camera.id, 'a');
  assert.equal(map.render([{ ...a, name: 'Updated A' }, b]).props.camera.name, 'Updated A');
  assert.equal(map.selection(), 'a');
});
test('close/Escape callback clears selection and a later explicit selection can reopen', () => {
  const map = mapHarness();
  map.render([a, b]); map.select('a');
  map.render([a, b]).props.onClose();
  assert.equal(map.render([a, b]), null);
  map.select('a');
  assert.equal(map.render([a, b]).props.camera.id, 'a');
});
test('map: frozen readonly inventory is never mutated', () => {
  const map = mapHarness();
  const inventory = Object.freeze([Object.freeze({ ...a }), Object.freeze({ ...b })]);
  map.render(inventory); map.select('a');
  assert.equal(map.render(inventory).props.camera.id, 'a');
});
