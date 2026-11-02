/** Local playback evidence only: this does not certify upstream freshness or global uptime. */
export type PlaybackSample = { currentTime: number; readyState: number; videoWidth: number; videoHeight: number; paused: boolean };
export function hasPlaybackProgress(previousTime: number, sample: PlaybackSample): boolean {
  return !sample.paused && sample.readyState >= 2 && sample.videoWidth > 0 && sample.videoHeight > 0
    && Number.isFinite(previousTime) && Number.isFinite(sample.currentTime)
    && sample.currentTime > previousTime + 0.05;
}

/** Shared HLS/native watchdog; metadata/manifest success alone is never playback evidence. */
export function observePlayback(video: HTMLVideoElement, callbacks: {
  onProgress: () => void; onWaiting: () => void; onFailure: () => void;
}, timeoutMs = 20_000) {
  let previousTime = video.currentTime;
  let lastProgress = Date.now();
  let confirmed = false;
  let failed = false;
  const resetDeadline = () => { lastProgress = Date.now(); previousTime = video.currentTime; };
  const fail = () => { if (!failed) { failed = true; callbacks.onFailure(); } };
  const tick = () => {
    if (document.hidden || (confirmed && video.paused)) { resetDeadline(); return; }
    if (hasPlaybackProgress(previousTime, video)) {
      confirmed = true;
      failed = false;
      lastProgress = Date.now();
      callbacks.onProgress();
    } else if (Date.now() - lastProgress >= timeoutMs) fail();
    previousTime = video.currentTime;
  };
  const waiting = () => callbacks.onWaiting();
  const timer = setInterval(tick, 1000);
  video.addEventListener("error", fail);
  video.addEventListener("waiting", waiting);
  document.addEventListener("visibilitychange", resetDeadline);
  return () => {
    clearInterval(timer);
    video.removeEventListener("error", fail);
    video.removeEventListener("waiting", waiting);
    document.removeEventListener("visibilitychange", resetDeadline);
  };
}

/** YouTube API progress is provider-reported evidence, not decoded-frame or live-source proof. */
export function createProviderPlaybackWatchdog(startedAt: number, timeoutMs = 20_000) {
  let previousTime = Number.NaN;
  let lastProgress = startedAt;
  return (sample: { now: number; currentTime: number; state: number; hidden?: boolean }): "playing" | "waiting" | "paused" | "error" => {
    const { now, currentTime, state, hidden } = sample;
    if (hidden || state === 2 || state === 5) {
      lastProgress = now;
      previousTime = currentTime;
      return hidden ? "waiting" : "paused";
    }
    if (state === 0) return "error"; // ended
    const advanced = state === 1 && Number.isFinite(previousTime) && Number.isFinite(currentTime) && currentTime > previousTime + 0.05;
    previousTime = currentTime;
    if (advanced) { lastProgress = now; return "playing"; }
    return now - lastProgress >= timeoutMs ? "error" : "waiting";
  };
}
