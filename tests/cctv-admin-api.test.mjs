import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as reviewHelpers from '../lib/cctv-review.ts';

// Compile the real Route Handler; only platform and persistence boundaries are mocked.
// No credentials, requests to cameras, Firebase or Cloudflare are used by this suite.
const compiled = ts.transpileModule(readFileSync(new URL('../app/api/admin/cctv/route.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const source = { name: 'Test camera', region: 'Jeju', category: '해변', originUrl: 'http://example.test/live.m3u8', youtubeId: null, active: false };
const request = (body) => ({ json: async () => body });
function attestation(record = source) {
  return { sourceRevision: reviewHelpers.cctvSourceRevision(record), observedPlayback: true, method: 'operator-observed', observedAt: new Date().toISOString() };
}

function setup({ initial = source, authorized = true, kvResults = [true], deleteResults = [true], onSync, onDelete, failCommit = false, kvConfigured = true, workerConfigured = false } = {}) {
  let record = initial === null ? undefined : structuredClone(initial);
  let version = 1;
  let dbCalls = 0;
  let commitAttempts = 0;
  const writes = [], syncs = [], deletedKv = [], revalidated = [];
  const snapshot = () => {
    const copy = record && structuredClone(record);
    const stamp = version;
    return { exists: !!copy, data: () => copy, updateTime: { stamp, isEqual: (other) => other?.stamp === stamp } };
  };
  function mutate(data) { record = data === null ? undefined : { ...record, ...data }; version++; }
  function commit(data) { writes.push(structuredClone(data)); mutate(data); }
  const ref = { get: async () => snapshot(), update: async (data) => commit(data) };
  const db = {
    collection: () => ({ doc: () => ref }),
    runTransaction: async (callback) => {
      const pending = [];
      const result = await callback({ get: async () => snapshot(), set: (_ref, data) => pending.push(data), update: (_ref, data) => pending.push(data) });
      if (failCommit && ++commitAttempts === 1) throw new Error('simulated transaction commit failure');
      for (const update of pending) commit(update);
      return result;
    },
  };
  const stubs = {
    'next/server': { NextResponse: { json: (body, options) => ({ status: options?.status ?? 200, body }) } },
    'next/headers': { cookies: async () => ({ get: () => authorized ? { value: 'test-only-secret' } : undefined }) },
    'next/cache': { revalidatePath: (...args) => revalidated.push(args) },
    '@/lib/firebase-admin': { getAdminDb: () => { dbCalls++; return db; } },
    '@/lib/cloudflare-kv-sync': {
      isKVSyncEnabled: () => kvConfigured,
      syncCctvToKV: async (id, data) => {
        syncs.push({ id, ...structuredClone(data) });
        onSync?.({ call: syncs.length, mutate });
        return kvResults[Math.min(syncs.length - 1, kvResults.length - 1)];
      },
      deleteCctvFromKV: async (id) => { deletedKv.push(id); onDelete?.({ call: deletedKv.length, mutate }); return deleteResults[Math.min(deletedKv.length - 1, deleteResults.length - 1)]; },
    },
    '@/lib/cctv-review': reviewHelpers,
  };
  const compiledModule = { exports: {} };
  vm.runInNewContext(compiled, {
    exports: compiledModule.exports, module: compiledModule,
    require: (name) => { assert.ok(name in stubs, `Unexpected dependency: ${name}`); return stubs[name]; },
    process: { env: { ADMIN_SECRET: 'test-only-secret', ...(workerConfigured ? { NEXT_PUBLIC_WORKER_URL: 'https://worker.example.test' } : {}) } },
    Date, console,
  }, { filename: 'cctv-admin-route-under-test.cjs' });
  return { api: compiledModule.exports, get record() { return record; }, get dbCalls() { return dbCalls; }, writes, syncs, deletedKv, revalidated };
}

test('unauthorized GET/POST/PATCH/DELETE stop before persistence or body parsing', async () => {
  const fixture = setup({ authorized: false });
  for (const method of ['GET', 'POST', 'PATCH', 'DELETE']) {
    const result = await fixture.api[method]({ json: () => { throw new Error('must not parse unauthorized body'); } });
    assert.equal(result.status, 401);
  }
  assert.equal(fixture.dbCalls, 0);
  assert.equal(fixture.syncs.length, 0);
});

test('POST cannot publish a new source even with active/review metadata injection', async () => {
  const fixture = setup({ initial: null });
  const result = await fixture.api.POST(request({ id: 'test', ...source, active: true, reviewedAt: 'forged', reviewMethod: 'operator-observed' }));
  assert.equal(result.status, 200);
  assert.equal(fixture.record.active, false);
  assert.equal(fixture.record.reviewedAt, null);
  assert.equal(fixture.record.reviewMethod, null);
  assert.equal(fixture.syncs[0].active, false);
});

test('POST changing a source unpublishes it; metadata-only save preserves existing approval', async () => {
  const fixture = setup({ initial: { ...source, active: true } });
  await fixture.api.POST(request({ id: 'test', ...source, name: 'Renamed' }));
  assert.equal(fixture.record.active, true);
  await fixture.api.POST(request({ id: 'test', ...source, originUrl: 'http://example.test/replacement.m3u8', active: true }));
  assert.equal(fixture.record.active, false);
});

test('PATCH activation rejects missing, source-mismatched and HTTP-only evidence before KV', async () => {
  for (const review of [undefined, { ...attestation(), sourceRevision: 'wrong' }, { ...attestation(), method: 'http' }]) {
    const fixture = setup();
    const result = await fixture.api.PATCH(request({ id: 'test', active: true, review }));
    assert.equal(result.status, 409);
    assert.equal(fixture.record.active, false);
    assert.equal(fixture.writes.length, 0);
    assert.equal(fixture.syncs.length, 0);
  }
});

test('required KV failure prevents activation and marks synchronization pending', async () => {
  const fixture = setup({ kvResults: [false] });
  const result = await fixture.api.PATCH(request({ id: 'test', active: true, review: attestation() }));
  assert.equal(result.status, 503);
  assert.equal(fixture.record.active, false);
  assert.equal(fixture.record.proxySyncPending, true);
  assert.ok(fixture.writes.every((write) => write.active !== true));
});

test('configured Worker with unavailable KV credentials still cannot silently publish', async () => {
  const fixture = setup({ kvConfigured: false, workerConfigured: true, kvResults: [false] });
  const result = await fixture.api.PATCH(request({ id: 'test', active: true, review: attestation() }));
  assert.equal(result.status, 503);
  assert.equal(fixture.syncs.length, 1);
  assert.equal(fixture.record.active, false);
});

test('post-KV concurrent source change restores latest inactive source and rejects publication', async () => {
  const nextUrl = 'http://example.test/concurrently-edited.m3u8';
  const fixture = setup({ onSync: ({ call, mutate }) => { if (call === 1) mutate({ originUrl: nextUrl, active: false }); } });
  const result = await fixture.api.PATCH(request({ id: 'test', active: true, review: attestation() }));
  assert.equal(result.status, 409);
  assert.equal(result.body.publicationPending, true);
  assert.equal(fixture.syncs.length, 2);
  assert.equal(fixture.syncs[0].active, true);
  assert.equal(fixture.syncs[1].originUrl, nextUrl);
  assert.equal(fixture.syncs[1].active, false);
  assert.equal(fixture.record.active, false);
  assert.equal(fixture.record.proxySyncPending, false);
});

test('post-KV concurrent metadata/disable change also invalidates approval by document version', async () => {
  const fixture = setup({ onSync: ({ call, mutate }) => { if (call === 1) mutate({ name: 'Changed concurrently', active: false }); } });
  const result = await fixture.api.PATCH(request({ id: 'test', active: true, review: attestation() }));
  assert.equal(result.status, 409);
  assert.equal(fixture.syncs[1].name, 'Changed concurrently');
  assert.equal(fixture.syncs[1].active, false);
});

test('post-KV transaction failure compensates and does not commit activation', async () => {
  const fixture = setup({ failCommit: true });
  const result = await fixture.api.PATCH(request({ id: 'test', active: true, review: attestation() }));
  assert.equal(result.status, 409);
  assert.equal(fixture.syncs.length, 2);
  assert.equal(fixture.syncs[1].active, false);
  assert.equal(fixture.record.active, false);
});

test('failed compensation remains pending, never reports approved', async () => {
  const fixture = setup({ failCommit: true, kvResults: [true, false] });
  const result = await fixture.api.PATCH(request({ id: 'test', active: true, review: attestation() }));
  assert.equal(result.status, 503);
  assert.equal(result.body.publicationPending, true);
  assert.equal(fixture.record.proxySyncPending, true);
  assert.equal(fixture.record.active, false);
});

test('concurrent switch to YouTube removes obsolete HLS KV configuration', async () => {
  const fixture = setup({ onSync: ({ call, mutate }) => { if (call === 1) mutate({ youtubeId: 'abcdefghijk', originUrl: '', active: false }); } });
  const result = await fixture.api.PATCH(request({ id: 'test', active: true, review: attestation() }));
  assert.equal(result.status, 409);
  assert.deepEqual(fixture.deletedKv, ['test']);
});

test('valid observation plus successful sync publishes and records human review', async () => {
  const fixture = setup();
  const result = await fixture.api.PATCH(request({ id: 'test', active: true, review: attestation() }));
  assert.equal(result.status, 200);
  assert.equal(fixture.record.active, true);
  assert.equal(fixture.record.reviewMethod, 'operator-observed');
  assert.equal(fixture.record.proxySyncPending, false);
});

test('disabling stays disabled even if downstream sync fails; deletion preserves records', async () => {
  const fixture = setup({ initial: { ...source, active: true }, kvResults: [false] });
  const result = await fixture.api.PATCH(request({ id: 'test', active: false }));
  assert.equal(result.status, 200);
  assert.ok(result.body.warning);
  assert.equal(fixture.record.active, false);
  const deletion = await fixture.api.DELETE();
  assert.equal(deletion.status, 405);
  assert.equal(fixture.record.originUrl, source.originUrl);
});


test('HLS to YouTube save, approve, metadata rename and deactivate never revive retained HLS', async () => {
  const fixture = setup({ initial: { ...source, active: true } });
  const youtube = { ...source, youtubeId: 'abcdefghijk' };
  assert.equal((await fixture.api.POST(request({ id: 'test', ...youtube, active: true }))).status, 200);
  assert.equal(fixture.record.originUrl, source.originUrl);
  assert.equal(fixture.record.active, false);
  assert.equal(fixture.deletedKv.length, 1);
  assert.equal((await fixture.api.PATCH(request({ id: 'test', active: true, review: attestation(youtube) }))).status, 200);
  assert.equal(fixture.record.active, true);
  assert.equal((await fixture.api.POST(request({ id: 'test', ...youtube, name: 'Renamed YouTube', active: true }))).status, 200);
  assert.equal(fixture.record.active, true);
  assert.equal((await fixture.api.PATCH(request({ id: 'test', active: false }))).status, 200);
  assert.equal(fixture.record.active, false);
  assert.equal(fixture.record.originUrl, source.originUrl);
  assert.equal(fixture.deletedKv.length, 4);
  assert.equal(fixture.syncs.length, 0);
});

test('YouTube with no retained HLS URL still reconciles obsolete KV on save and disable', async () => {
  const youtube = { ...source, originUrl: '', youtubeId: 'abcdefghijk', active: true };
  const fixture = setup({ initial: youtube });
  await fixture.api.POST(request({ id: 'test', ...youtube, name: 'Renamed' }));
  await fixture.api.PATCH(request({ id: 'test', active: false }));
  assert.equal(fixture.deletedKv.length, 2);
  assert.equal(fixture.syncs.length, 0);
});

test('missing KV credentials with configured Worker keeps YouTube save pending and blocks approval', async () => {
  const youtube = { ...source, youtubeId: 'abcdefghijk' };
  const fixture = setup({ kvConfigured: false, workerConfigured: true, deleteResults: [false] });
  const saved = await fixture.api.POST(request({ id: 'test', ...youtube, active: true }));
  assert.equal(saved.status, 200);
  assert.ok(saved.body.warning);
  assert.equal(fixture.record.proxySyncPending, true);
  assert.equal(fixture.record.active, false);
  const approved = await fixture.api.PATCH(request({ id: 'test', active: true, review: attestation(youtube) }));
  assert.equal(approved.status, 503);
  assert.equal(fixture.record.active, false);
  assert.equal(fixture.record.proxySyncPending, true);
  assert.equal(fixture.syncs.length, 0);
});

test('YouTube deactivation remains disabled and warns if obsolete HLS cleanup fails', async () => {
  const fixture = setup({ initial: { ...source, youtubeId: 'abcdefghijk', active: true }, deleteResults: [false] });
  const result = await fixture.api.PATCH(request({ id: 'test', active: false }));
  assert.equal(result.status, 200);
  assert.ok(result.body.warning);
  assert.equal(fixture.record.active, false);
  assert.equal(fixture.record.proxySyncPending, true);
  assert.equal(fixture.record.originUrl, source.originUrl);
  assert.equal(fixture.syncs.length, 0);
});

test('YouTube approval conflict restores newly selected HLS using the authoritative record', async () => {
  const youtube = { ...source, youtubeId: 'abcdefghijk' };
  const fixture = setup({ initial: youtube, onDelete: ({ call, mutate }) => { if (call === 1) mutate({ youtubeId: null, active: false }); } });
  const result = await fixture.api.PATCH(request({ id: 'test', active: true, review: attestation(youtube) }));
  assert.equal(result.status, 409);
  assert.equal(fixture.deletedKv.length, 1);
  assert.equal(fixture.syncs.length, 1);
  assert.equal(fixture.syncs[0].originUrl, source.originUrl);
  assert.equal(fixture.syncs[0].active, false);
  assert.equal(fixture.record.active, false);
});


for (const change of [{ active: false }, { name: 'Concurrent name' }, { originUrl: 'http://example.test/new.m3u8', active: false }]) {
  test(`POST stale KV write is repaired for concurrent ${Object.keys(change)[0]}`, async () => {
    const fixture = setup({ initial: { ...source, active: true }, onSync: ({ call, mutate }) => { if (call === 1) mutate(change); } });
    const result = await fixture.api.POST(request({ id: 'test', ...source, name: 'Saved name' }));
    assert.equal(result.status, 200);
    assert.equal(fixture.syncs.length, 2);
    for (const [key, value] of Object.entries(change)) assert.equal(fixture.syncs[1][key], value);
    assert.equal(fixture.record.proxySyncPending, false);
    assert.ok(!fixture.writes.slice(1, -1).some((write) => write.proxySyncPending === false));
  });
}

test('POST second compensation race retries newest revision before clearing pending', async () => {
  const fixture = setup({ initial: { ...source, active: true }, onSync: ({ call, mutate }) => {
    if (call === 1) mutate({ active: false });
    if (call === 2) mutate({ name: 'Newest source', originUrl: 'http://example.test/newest.m3u8' });
  } });
  await fixture.api.POST(request({ id: 'test', ...source }));
  assert.equal(fixture.syncs.length, 3);
  assert.equal(fixture.syncs[2].name, 'Newest source');
  assert.equal(fixture.syncs[2].active, false);
  assert.equal(fixture.record.proxySyncPending, false);
});

test('continuous concurrent writes exhaust bounded repair and never clear pending', async () => {
  const fixture = setup({ onSync: ({ call, mutate }) => mutate({ name: `Concurrent ${call}`, proxySyncPending: true }) });
  const result = await fixture.api.POST(request({ id: 'test', ...source }));
  assert.equal(result.body.kvSync, false);
  assert.ok(result.body.warning);
  assert.equal(fixture.syncs.length, 3);
  assert.equal(fixture.record.proxySyncPending, true);
  assert.ok(fixture.writes.every((write) => write.proxySyncPending !== false));
});

test('disable reconciles concurrent source edit rather than clearing pending on stale sync', async () => {
  const fixture = setup({ initial: { ...source, active: true }, onSync: ({ call, mutate }) => { if (call === 1) mutate({ originUrl: 'http://example.test/new.m3u8', active: false }); } });
  await fixture.api.PATCH(request({ id: 'test', active: false }));
  assert.equal(fixture.syncs.length, 2);
  assert.equal(fixture.syncs[1].originUrl, 'http://example.test/new.m3u8');
  assert.equal(fixture.syncs[1].active, false);
  assert.equal(fixture.record.proxySyncPending, false);
});
