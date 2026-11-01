import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { loadPlaybackTarget } from './helpers/load-playback-target.mjs';

function launcher() {
  const calls = [];
  const routing = loadPlaybackTarget({ screen: { availWidth: 1280, availHeight: 800 }, open: (...args) => { calls.push(args); return null; } });
  const jsx = (type, props) => ({ type, props });
  const deps = { 'react/jsx-runtime': { jsx, jsxs: jsx }, '@/lib/cctv-playback-target': routing };
  const mod = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL('../components/cctv/VurixLaunch.tsx', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { exports: mod.exports, module: mod, require: name => { assert.ok(name in deps); return deps[name]; } });
  return { render: mod.exports.VurixLaunch, calls };
}
test('launcher uses same safe HTTPS destination for explicit click and blocked-popup fallback', () => {
  const app = launcher();
  const tree = app.render({ id: 'jeju_airport', name: '공항', originUrl: 'http://existing.example.test/token/stream' });
  assert.equal(app.calls.length, 0, 'render never launches popup');
  const [button, paragraph] = tree.props.children;
  const anchor = paragraph.props.children.find(child => child?.type === 'a');
  assert.equal(anchor.props.href, 'https://funjeju.com/cctv/jeju_airport?watch=1');
  assert.equal(anchor.props.target, '_blank'); assert.equal(anchor.props.rel, 'noopener noreferrer');
  button.props.onClick();
  assert.equal(app.calls.length, 1);
  assert.equal(app.calls[0][0], anchor.props.href);
  assert.match(app.calls[0][2], /noopener,noreferrer/);
});
test('launcher keeps exact-provider legacy route and never auto-opens during source change', () => {
  const app = launcher();
  const legacy = app.render({ id: 'sinchang', name: 'Legacy' });
  legacy.props.children[0].props.onClick();
  assert.match(app.calls[0][0], /^http:\/\/141\.164\.53\.216:8080\/watch\?/);
  const changed = app.render({ id: 'sinchang', name: 'Legacy', originUrl: 'http://other.example.test/a' });
  assert.equal(app.calls.length, 1);
  changed.props.children[0].props.onClick();
  assert.equal(app.calls[1][0], 'https://funjeju.com/cctv/sinchang?watch=1');
});
