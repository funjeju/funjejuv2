"use client";

import { useEffect, useRef, useState } from "react";
import { createProviderPlaybackWatchdog } from "@/lib/cctv-playback-health";

type YoutubeInstance = { destroy: () => void; getCurrentTime: () => number; getPlayerState: () => number; playVideo: () => void; pauseVideo: () => void };
type YoutubeApi = { Player: new (element: HTMLElement, options: {
  videoId: string; playerVars: Record<string, number>;
  events: { onReady: () => void; onError: () => void; onAutoplayBlocked: () => void };
}) => YoutubeInstance };

type Props = { youtubeId: string; title: string };

/** Provider error events are useful; iframe load alone is not evidence of live playback. */
export function YoutubePlayer({ youtubeId, title }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "playing" | "paused" | "error">("loading");
  const playRef = useRef<(() => void) | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    queueMicrotask(() => setStatus("loading"));
    let player: YoutubeInstance | undefined;
    let cancelled = false;
    let failed = false;
    let ready = false;
    let awaitingGesture = false;
    let watch = createProviderPlaybackWatchdog(Date.now());
    const fail = () => {
      if (cancelled || failed) return;
      failed = true;
      player?.pauseVideo();
      setStatus("error");
    };
    playRef.current = () => {
      if (!player || failed) return;
      awaitingGesture = false;
      watch = createProviderPlaybackWatchdog(Date.now());
      setStatus("loading");
      player.playVideo();
    };
    const target = document.createElement("div");
    host.replaceChildren(target);
    const readApi = () => (window as Window & { YT?: YoutubeApi }).YT;
    if (!readApi()?.Player && !document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.appendChild(script);
    }
    const deadline = Date.now() + 15_000;
    const timer = setInterval(() => {
      const api = readApi();
      if (api?.Player) {
        clearInterval(timer);
        player = new api.Player(target, {
          videoId: youtubeId,
          playerVars: { autoplay: 1, mute: 1, playsinline: 1, rel: 0, controls: 1 },
          events: {
            onReady: () => { ready = true; },
            onError: fail,
            onAutoplayBlocked: () => { if (!cancelled && !failed) { awaitingGesture = true; setStatus("paused"); } },
          },
        });
      } else if (Date.now() >= deadline) { clearInterval(timer); fail(); }
    }, 100);
    const playbackTimer = setInterval(() => {
      if (cancelled || failed) return;
      try {
        const state = ready && player ? player.getPlayerState() : -1;
        if (awaitingGesture && state !== 1) return;
        awaitingGesture = false;
        const result = watch({ now: Date.now(), currentTime: ready && player ? player.getCurrentTime() : 0, state, hidden: document.hidden });
        if (result === "error") fail();
        else if (!document.hidden) setStatus(result === "waiting" ? "loading" : result);
      } catch { fail(); }
    }, 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
      clearInterval(playbackTimer);
      playRef.current = null;
      player?.destroy();
      host.replaceChildren();
    };
  }, [youtubeId, retry]);
  return (
    <div className="relative aspect-video w-full overflow-hidden bg-gray-950 md:rounded-2xl" aria-label={title}>
      <div ref={hostRef} className="absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full" />
      {status === "loading" && <p className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-white">YouTube 영상 연결 중…</p>}
      {status === "paused" && <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/30 text-white"><p className="text-xs">일시 정지 · 재생 버튼을 눌러 주세요</p><button type="button" onClick={() => playRef.current?.()} className="pointer-events-auto rounded-full bg-white/20 px-5 py-3">▶ 재생</button></div>}
      {status === "error" && (
        <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-950 px-5 text-center text-white">
          <p className="font-bold">영상 재생에 임시 오류가 있어요</p>
          <p className="text-xs text-white/60">영상이 종료되었거나 제공자의 재생 제한이 있을 수 있어요.</p>
          <button type="button" onClick={() => setRetry(n => n + 1)} className="rounded-full bg-white/15 px-4 py-2 text-xs">다시 시도</button>
        </div>
      )}
      <a href={`https://www.youtube.com/watch?v=${encodeURIComponent(youtubeId)}`} target="_blank" rel="noopener noreferrer" className="absolute bottom-2 right-2 z-10 rounded-full bg-black/70 px-3 py-1 text-xs text-white">원본 보기 ↗</a>
      <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-red-600 px-2 py-1 text-[10px] font-bold text-white">YouTube 영상</span>
    </div>
  );
}
