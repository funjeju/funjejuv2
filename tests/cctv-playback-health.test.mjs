import assert from "node:assert/strict";
import { test } from "node:test";
import { hasPlaybackProgress } from "../lib/cctv-playback-health.ts";
const sample = { currentTime: 3, readyState: 4, videoWidth: 1280, videoHeight: 720, paused: false };
test("manifest/metadata alone and frozen frames are not playback", () => {
  assert.equal(hasPlaybackProgress(3, sample), false);
  assert.equal(hasPlaybackProgress(2, { ...sample, readyState: 1 }), false);
  assert.equal(hasPlaybackProgress(2, { ...sample, videoWidth: 0 }), false);
  assert.equal(hasPlaybackProgress(2, { ...sample, videoHeight: 0 }), false);
});
test("only advancing decoded media is confirmed", () => {
  assert.equal(hasPlaybackProgress(2, sample), true);
  assert.equal(hasPlaybackProgress(2, { ...sample, paused: true }), false);
  assert.equal(hasPlaybackProgress(NaN, sample), false);
  assert.equal(hasPlaybackProgress(4, sample), false);
});

test("watchdog times out startup/stalls, ignores hidden tabs and cleans up", async () => {
  const { observePlayback } = await import("../lib/cctv-playback-health.ts");
  const original = { document: globalThis.document, interval: globalThis.setInterval, clear: globalThis.clearInterval, now: Date.now };
  let now = 0;
  let tick;
  let cleared = false;
  const document = Object.assign(new EventTarget(), { hidden: false });
  const video = Object.assign(new EventTarget(), { ...sample, currentTime: 0 });
  const events = [];
  try {
    globalThis.document = document;
    globalThis.setInterval = (callback) => { tick = callback; return 1; };
    globalThis.clearInterval = () => { cleared = true; };
    Date.now = () => now;
    const cleanup = observePlayback(video, { onProgress: () => events.push("progress"), onWaiting: () => events.push("waiting"), onFailure: () => events.push("error") }, 20000);
    now = 20000; tick();
    assert.deepEqual(events, ["error"]);
    video.currentTime = 1; tick();
    assert.deepEqual(events, ["error", "progress"]);
    video.dispatchEvent(new Event("waiting"));
    assert.equal(events.at(-1), "waiting");
    document.hidden = true;
    now = 60000; tick();
    assert.equal(events.at(-1), "waiting");
    document.hidden = false;
    now = 80000; tick();
    assert.equal(events.at(-1), "error");
    cleanup();
    assert.equal(cleared, true);
    const count = events.length;
    video.dispatchEvent(new Event("waiting"));
    assert.equal(events.length, count);
  } finally {
    globalThis.document = original.document;
    globalThis.setInterval = original.interval;
    globalThis.clearInterval = original.clear;
    Date.now = original.now;
  }
});

test("provider readiness is not playback; startup and stalls time out", async () => {
  const { createProviderPlaybackWatchdog } = await import("../lib/cctv-playback-health.ts");
  const watch = createProviderPlaybackWatchdog(0);
  assert.equal(watch({ now: 1000, currentTime: 0, state: -1 }), "waiting");
  assert.equal(watch({ now: 20000, currentTime: 0, state: 1 }), "error");
  assert.equal(watch({ now: 21000, currentTime: 1, state: 1 }), "playing");
  assert.equal(watch({ now: 41000, currentTime: 1, state: 3 }), "error");
});
test("provider pause and hidden tabs do not become false camera errors", async () => {
  const { createProviderPlaybackWatchdog } = await import("../lib/cctv-playback-health.ts");
  const watch = createProviderPlaybackWatchdog(0);
  assert.equal(watch({ now: 50000, currentTime: 0, state: 2 }), "paused");
  assert.equal(watch({ now: 100000, currentTime: 0, state: 5 }), "paused");
  assert.equal(watch({ now: 150000, currentTime: 0, state: -1, hidden: true }), "waiting");
  assert.equal(watch({ now: 151000, currentTime: 1, state: 1 }), "playing");
  assert.equal(watch({ now: 152000, currentTime: 1, state: 0 }), "error");
});
