import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function harness() {
  const jsx = (type, props, key) => ({ type, props, key });
  let cleanup;
  const dialog = { showModal() {}, close() {} };
  const stubs = {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    react: { useEffect: cb => { cleanup = cb(); }, useId: () => 'camera-title', useRef: () => ({ current: dialog }) },
    'next/link': { default: 'Link' },
    'lucide-react': { ArrowUpRight: 'ArrowUpRight', X: 'X' },
    '@/components/cctv/HlsPlayer': { HlsPlayer: 'HlsPlayer' },
    '@/components/cctv/YoutubePlayer': { YoutubePlayer: 'YoutubePlayer' },
    '@/components/cctv/VurixLaunch': { VurixLaunch: 'VurixLaunch' },
    '@/constants/vurix': { isVurixId: id => id === 'vurix' },
  };
  const source = readFileSync(new URL('../components/cctv/CameraDialog.tsx', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const mod = { exports: {} };
  vm.runInNewContext(code, { exports: mod.exports, module: mod, process: { env: {} }, document: { activeElement: null }, require: name => { assert.ok(name in stubs, name); return stubs[name]; } });
  return { ...mod.exports, cleanup: () => cleanup?.() };
}
const camera = Object.freeze({ id: 'a', name: 'Camera', active: true, originUrl: 'source-a', sourceRevision: 'r1' });
test('dialog player identity changes only for source fields, not display metadata', () => {
  const { cameraPlaybackKey: key } = harness();
  assert.equal(key(camera), key({ ...camera, name: 'New name', category: 'Beach', region: 'Jeju' }));
  for (const update of [{ sourceRevision: 'r2' }, { originUrl: 'source-b' }, { youtubeId: 'video' }, { streamProxyUrl: 'proxy' }]) assert.notEqual(key(camera), key({ ...camera, ...update }));
});
test('dialog Escape and backdrop close while content click stays open', () => {
  const { CameraDialog, cleanup } = harness();
  let closed = 0, prevented = false;
  const tree = CameraDialog({ camera, onClose: () => closed++ });
  tree.props.onCancel({ preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true); assert.equal(closed, 1);
  const backdrop = {};
  tree.props.onClick({ target: backdrop, currentTarget: backdrop });
  assert.equal(closed, 2);
  tree.props.onClick({ target: {}, currentTarget: backdrop });
  assert.equal(closed, 2);
  cleanup();
});
test('dialog retains HLS, YouTube and Vurix playback routes', () => {
  const { CameraDialog } = harness();
  for (const [c, type] of [[camera, 'HlsPlayer'], [{ ...camera, youtubeId: 'video' }, 'YoutubePlayer'], [{ ...camera, id: 'vurix' }, 'VurixLaunch']]) {
    const tree = CameraDialog({ camera: c, onClose() {} });
    assert.equal(tree.props.children[1].props.children.type, type);
  }
});
