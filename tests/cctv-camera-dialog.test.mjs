import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { loadPlaybackTarget } from './helpers/load-playback-target.mjs';

function harness(preview = false) {
  const jsx = (type, props, key) => ({ type, props, key });
  let cleanup;
  const dialog = { showModal() {}, close() {} };
  const stubs = {
    '@/components/common/PreviewRuntimeProvider': { usePreviewRuntime: () => preview },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    react: { useEffect: cb => { cleanup = cb(); }, useId: () => 'camera-title', useRef: () => ({ current: dialog }) },
    'next/link': { default: 'Link' },
    'lucide-react': { ArrowUpRight: 'ArrowUpRight', X: 'X' },
    '@/components/cctv/HlsPlayer': { HlsPlayer: 'HlsPlayer' },
    '@/components/cctv/YoutubePlayer': { YoutubePlayer: 'YoutubePlayer' },
    '@/components/cctv/VurixLaunch': { VurixLaunch: 'VurixLaunch' },
    '@/lib/cctv-playback-target': loadPlaybackTarget(),
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
  for (const [c, type] of [[camera, 'HlsPlayer'], [{ ...camera, youtubeId: 'video' }, 'YoutubePlayer'], [{ ...camera, id: 'sinchang', originUrl: '' }, 'VurixLaunch']]) {
    const tree = CameraDialog({ camera: c, onClose() {} });
    assert.equal(tree.props.children[1].props.children.type, type);
  }
});

test('defensive dialog route never embeds HTTP dodu into HTTPS HLS player', () => {
  const { CameraDialog } = harness();
  const tree = CameraDialog({ camera: { ...camera, id: 'dodu', originUrl: 'http://example.test/a.m3u8' }, onClose() {} });
  assert.equal(tree.props.children[1].props.children.type, 'VurixLaunch');
});

test('public preview dialog never mounts inline media; watch route is sole authority', () => {
  const { CameraDialog } = harness(true);
  const nodes = v => !v || typeof v !== 'object' ? [] : Array.isArray(v) ? v.flatMap(nodes) : [v, ...nodes(v.props?.children)];
  for (const update of [{}, {youtubeId:'synthetic'}, {originUrl:'http://example.test/source'}, {originUrl:'https://example.test/source'}]) {
    const all = nodes(CameraDialog({camera:{...camera,...update},onClose(){}}));
    assert.equal(all.some(n=>['HlsPlayer','YoutubePlayer','VurixLaunch'].includes(n.type)),false);
    const link=all.find(n=>n.props?.href==='/cctv/watch/a');assert.ok(link);assert.equal(link.props.target,'_blank');assert.equal(link.props.rel,'noopener noreferrer');
  }
  assert.equal(nodes(CameraDialog({camera:{...camera,active:false},onClose(){}})).some(n=>n.props?.href==='/cctv/watch/a'),false);
});
