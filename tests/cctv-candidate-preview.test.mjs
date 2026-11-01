import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { syntheticCandidatePayload } from './helpers/cctv-candidate-fixture.mjs';
function load(path, dependencies = {}) {
  const mod = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports: mod.exports, module: mod, URL, TextEncoder, require: name => { assert.ok(name in dependencies, `Unexpected dependency ${name}`); return dependencies[name]; }, fetch: () => { throw new Error('No network permitted'); } });
  return mod.exports;
}
const parser = load('../lib/cctv-jejusi-candidates.ts');
const { parseJejusiCandidatesJson: parse } = parser;
const { validatePreviewCandidate: validate, previewCandidateComparison: comparison } = load('../lib/cctv-candidate-preview.ts', { './cctv-jejusi-candidates': parser });
const catalog = parse(JSON.stringify(syntheticCandidatePayload()));
const candidates = catalog.candidates;
const candidate = candidates[9];
const compare = (key, current, expected) => comparison(catalog, key, current, expected);
const valid = value => validate(catalog, value);
const errorMessage = 'Private candidate configuration is unavailable or invalid';
function rejected(mutator) {
  const payload = syntheticCandidatePayload(); mutator(payload);
  assert.throws(() => parse(JSON.stringify(payload)), error => error.message === errorMessage);
}

test('private config accepts exactly 19 synthetic identities, bounded metadata and frozen held references', () => {
  assert.equal(candidates.length, 19); assert.ok(Object.isFrozen(catalog));
  assert.ok(Object.isFrozen(candidates));
  for (const c of candidates) {
    assert.equal(valid(c), true); assert.equal(c.held, true); assert.equal(c.playbackVerified, false);
    assert.equal(c.sourceAccess, 'held-prior-access-denial'); assert.equal('active' in c, false);
    assert.equal(c.candidateSourceName, null); assert.ok(Object.isFrozen(c) && Object.isFrozen(c.provenance));
  }
});
test('missing malformed and over-48KiB input fail closed without reflecting private data', () => {
  for (const raw of [undefined, '', '{private-sensitive', ' '.repeat(49153), JSON.stringify({ private: 'sentinel' }), '한'.repeat(20000)]) assert.throws(() => parse(raw), error => error.message === errorMessage);
  rejected(p => { p.version = 2; }); rejected(p => { p.candidates.pop(); });
  rejected(p => { p.candidates.push(p.candidates[0]); });
});
test('composite identity, unique current IDs and authority prevent cross-source collisions', () => {
  assert.throws(() => compare(candidate.sourceId, null));
  assert.throws(() => compare(`seogwipo:${candidate.sourceId}`, null));
  assert.throws(() => compare(candidate.sourceKey, { id: 'other', name: 'Other' }));
  rejected(p => { p.candidates[1] = p.candidates[0]; });
  rejected(p => { p.candidates[1].existingId = p.candidates[0].existingId; });
  rejected(p => { p.candidates[0].authority = 'seogwipo'; });
  rejected(p => { p.candidates[0].sourceKey = 'seogwipo:30001'; });
  rejected(p => { p.candidates[0].sourceId = '30002'; });
  const nullable = syntheticCandidatePayload(); nullable.candidates[0].existingId = null; nullable.candidates[1].existingId = null;
  assert.equal(parse(JSON.stringify(nullable)).candidates.length, 19);
});
test('canonical HTTPS origin/path only; query tokens credentials fragments or arbitrary URLs rejected', () => {
  for (const transform of [url => url + '?uid=secret', url => url + '?', url => url + '#x', url => url.replace('https://', 'https://user:pass@'), url => url.replace('example.test', 'example.test.evil.test'), url => url.replace('https:', 'http:'), url => url.replace('/live/', '/other/../live/'), url => url.replace('30001', '30002')]) rejected(p => { p.candidates[0].candidateUrl = transform(p.candidates[0].candidateUrl); });
  for (const origin of ['http://cameras.example.test', 'https://user@cameras.example.test', 'https://cameras.example.test/', 'https://cameras.example.test:444', 'https://cameras.example.test?token=x']) rejected(p => { p.allowedOrigin = origin; });
  assert.equal(valid({ ...candidate, candidateUrl: candidate.candidateUrl + '?uid=secret' }), false);
});
test('metadata bounds and all held flags enforced; no active field or repaired label accepted', () => {
  for (const field of ['held', 'playbackVerified', 'sourceAccess', 'identityStatus', 'columnsShifted']) rejected(p => { p.candidates[0][field] = 'invalid'; });
  rejected(p => { p.candidates[0].active = true; });
  rejected(p => { p.candidates[0].candidateSourceName = 'repaired'; });
  rejected(p => { p.candidates[0].trustedExistingDisplayName = 'x'.repeat(201); });
  rejected(p => { p.candidates[0].provenance.filename = '../private.csv'; });
  rejected(p => { p.candidates[0].provenance.sha256 = 'not-a-hash'; });
  rejected(p => { p.candidates[0].provenance.line = 0; });
});
test('Gimnyeong comparison remains immutable, tentative, and separate from current proxy target', () => {
  const current = Object.freeze({ id: 'gimnyeong', name: '김녕해변', originUrl: 'http://old.example.test/live.m3u8', streamProxyUrl: 'https://proxy.example.test/cctv/gimnyeong', sourceRevision: 'synthetic-hash', version: 'synthetic-v1' });
  const before = JSON.stringify(current); const result = compare(candidate.sourceKey, current, { sourceRevision: 'synthetic-hash', version: 'synthetic-v1' });
  assert.equal(JSON.stringify(current), before); assert.equal(result.current.name, current.name);
  assert.equal(result.plannedTarget.streamProxyUrl, candidate.candidateUrl);
  assert.notEqual(result.plannedTarget.streamProxyUrl, current.streamProxyUrl);
  assert.equal(result.plannedTarget.telemetryEnabled, false); assert.equal('cctvId' in result.plannedTarget, false);
  assert.equal(result.currentSourceMatchesCandidate, false); assert.equal(result.expectedCurrentMatches, true);
  assert.equal(result.canActivate, false); assert.equal(result.playbackVerified, false);
  assert.match(result.identityWarning, /김녕포구/); assert.match(result.identityWarning, /미확인/);
  assert.ok(Object.isFrozen(result) && Object.isFrozen(result.current) && Object.isFrozen(result.plannedTarget));
  assert.equal(compare(candidate.sourceKey, current).expectedCurrentMatches, null);
  assert.equal(compare(candidate.sourceKey, current, { version: 'changed' }).expectedCurrentMatches, false);
  assert.equal(compare(candidate.sourceKey, null, { version: 'v1' }).expectedCurrentMatches, false);
});
test('production parser/helper contain no static catalog, network, write, player or activation hooks', () => {
  for (const path of ['../lib/cctv-candidate-preview.ts', '../lib/cctv-jejusi-candidates.ts']) {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|import.*HlsPlayer|setDoc|updateDoc|writeBatch|window\.open|createElement/);
    assert.doesNotMatch(source, /https:\/\/[^"\s]+\/live\/\d+\/playlist\.m3u8/);
  }
});
