import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as direct from '../lib/cctv-direct-link.ts';
const jsx = (type, props, key) => ({ type, props, key });
const nodes = v => !v || typeof v !== 'object' ? [] : Array.isArray(v) ? v.flatMap(nodes) : [v, ...nodes(v.props?.children)];
function setup() {
  const calls = [];
  const mod = { exports: {} };
  const source = readFileSync(new URL('../components/cctv/DirectCameraLaunch.tsx', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const deps = {'react/jsx-runtime': {jsx,jsxs:jsx}, '@/lib/cctv-direct-link': direct, '@/lib/cctv-playback-target': {openCameraWatch: (...args) => calls.push(args)}};
  vm.runInNewContext(code,{module:mod,exports:mod.exports,URL,require:name=>{assert.ok(name in deps,name);return deps[name]}});
  return {...mod.exports,calls};
}
test('official direct launch has no auto-open, embedded player or proxy dependency', () => {
  const { DirectCameraLaunch, calls } = setup();
  const all = nodes(DirectCameraLaunch({id:'halla_baengnokdam',name:'백록담',originUrl:'http://media.jeju.go.kr/live/playlist.m3u8'}));
  assert.equal(calls.length,0);
  assert.equal(all.some(n=>['video','iframe','HlsPlayer','HttpsCameraWindow'].includes(n.type)),false);
  const link = all.find(n=>n.type==='a');
  assert.equal(link.props.href,'https://www.jeju.go.kr/tool/halla/cctv_01.html');
  assert.equal(link.props.target,'_blank'); assert.equal(link.props.rel,'noopener noreferrer'); assert.equal(link.props.referrerPolicy,'no-referrer');
  all.find(n=>n.type==='button').props.onClick();
  assert.equal(calls.length,1); assert.equal(calls[0][1],true);
});
test('raw manifest launch makes format and unverified playback explicit', () => {
  const { DirectCameraLaunch } = setup();
  const all = nodes(DirectCameraLaunch({id:'test',name:'Test',originUrl:'http://media.jeju.go.kr/live/playlist.m3u8'}));
  assert.equal(all.find(n=>n.type==='a').props.href,'http://media.jeju.go.kr/live/playlist.m3u8');
  assert.match(JSON.stringify(all),/새 창이 열렸다는 것만으로 영상 재생이 확인된 것은 아닙니다/);
});
test('unsafe source produces neither navigation nor media', () => {
  const { DirectCameraLaunch, calls } = setup();
  for(const originUrl of ['', 'http://127.0.0.1/video', 'https://media.jeju.go.kr/live?token=secret']) {
    const all=nodes(DirectCameraLaunch({id:'halla_baengnokdam',name:'Test',originUrl}));
    assert.equal(all.some(n=>['a','button','video','iframe'].includes(n.type)),false);
    assert.doesNotMatch(JSON.stringify(all),/token=secret/);
  }
  assert.equal(calls.length,0);
});
