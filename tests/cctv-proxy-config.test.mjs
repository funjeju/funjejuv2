import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const code = ts.transpileModule(readFileSync(new URL('../app/api/proxy-config/route.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
function fixture(documents, authorized = true, responseBody = { documents }) {
  let fetches = 0;
  let fetchOptions;
  const compiledModule = { exports: {} };
  const stubs = {
    'next/server': { NextResponse: { json: (body, options) => ({ status: options?.status ?? 200, body }) } },
    'next/headers': { cookies: async () => ({ get: () => authorized ? { value: 'test-secret' } : undefined }) },
  };
  vm.runInNewContext(code, { exports: compiledModule.exports, module: compiledModule,
    require: name => { assert.ok(name in stubs); return stubs[name]; },
    process: { env: { ADMIN_SECRET: 'test-secret', NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'test-project', NEXT_PUBLIC_FIREBASE_API_KEY: 'test-public-key' } },
    fetch: async (_url, options) => { fetches++; fetchOptions = options; return { ok: true, json: async () => responseBody }; },
  });
  return { api: compiledModule.exports, get fetches() { return fetches; }, get fetchOptions() { return fetchOptions; } };
}
const doc = (id, active, originUrl, youtubeId) => ({
  name: `projects/test/databases/default/documents/cctvs/${id}`,
  fields: { active: { booleanValue: active }, originUrl: { stringValue: originUrl }, youtubeId: { stringValue: youtubeId } },
});

test('proxy config never republishes retained HLS for selected YouTube cameras', async () => {
  const f = fixture([
    doc('hls', true, 'http://example.test/current.m3u8', ''),
    doc('youtube', true, 'http://example.test/obsolete.m3u8', 'abcdefghijk'),
    doc('inactive', false, 'http://example.test/inactive.m3u8', ''),
    doc('empty', true, '', ''),
  ]);
  const response = await f.api.GET({ nextUrl: new URL('https://example.test/api/proxy-config') });
  assert.equal(response.status, 200);
  assert.equal(f.fetchOptions.cache, 'no-store');
  assert.equal(JSON.stringify(response.body), JSON.stringify({ hls: 'http://example.test/current.m3u8' }));
});
test('proxy configuration authentication remains required', async () => {
  const f = fixture([], false);
  const response = await f.api.GET({ nextUrl: new URL('https://example.test/api/proxy-config') });
  assert.equal(response.status, 401);
  assert.equal(f.fetches, 0);
});


test('malformed upstream data cannot become an authoritative empty camera list', async () => {
  for (const payload of [null, [], { error: 'upstream failed' }, { documents: {} }]) {
    const f = fixture([], true, payload);
    const response = await f.api.GET({ nextUrl: new URL('https://example.test/api/proxy-config') });
    assert.equal(response.status, 502);
  }
});
test('valid empty Firestore inventory remains a successful empty configuration', async () => {
  for (const payload of [{}, { documents: [] }]) {
    const f = fixture([], true, payload);
    const response = await f.api.GET({ nextUrl: new URL('https://example.test/api/proxy-config') });
    assert.equal(response.status, 200);
    assert.equal(JSON.stringify(response.body), '{}');
  }
});
