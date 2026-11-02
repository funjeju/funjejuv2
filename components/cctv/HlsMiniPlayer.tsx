"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { observePlayback } from "@/lib/cctv-playback-health";
import { useCctvSession } from "@/hooks/useCctvSession";
import { track } from "@/lib/analytics";

type Props = {
  id: string;
  proxyUrl: string | null;
  name: string;
  /** 강제 자동재생 (홈의 메인 미리보기 등) */
  forcePlay?: boolean;
};

/**
 * 컴팩트 미니 플레이어
 * 기본: 썸네일 + 재생 버튼 → 사용자가 클릭해야 재생 시작
 * forcePlay=true: 자동 재생
 */
export function HlsMiniPlayer({ id, proxyUrl, name, forcePlay = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activated, setActivated] = useState(forcePlay);
  const [status, setStatus] = useState<"idle" | "loading" | "playing" | "error">(
    forcePlay ? "loading" : "idle"
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // 시청 세션 추적
  useCctvSession({
    cctvId: isPlaying ? id : null,
    cctvName: name,
    isPlaying,
  });
  useEffect(() => {
    if (!activated || !proxyUrl || !videoRef.current) {
      if (activated && !proxyUrl) queueMicrotask(() => setStatus("error"));
      return;
    }

    queueMicrotask(() => setStatus("loading"));
    const video = videoRef.current;
    let hls: import("hls.js").default | null = null;
    let failed = false;
    let cancelled = false; // 동적 import 대기 중 언마운트되면 hls 생성 자체를 막음

    const onPause = () => setIsPlaying(false);
    video.addEventListener("pause",   onPause);
    video.addEventListener("waiting", onPause);

    const failPlayback = () => {
      if (failed || cancelled) return;
      failed = true;
      hls?.destroy();
      hls = null;
      video.pause();
      setStatus("error");
      setIsPlaying(false);
    };
    const stopObserving = observePlayback(video, {
      onProgress: () => { if (!failed) { setStatus("playing"); setIsPlaying(true); } },
      onWaiting: () => { if (!failed) { setStatus("loading"); setIsPlaying(false); } },
      onFailure: failPlayback,
    });
    const startPlayback = () => { if (!failed) video.play().catch(failPlayback); };
    video.addEventListener("loadedmetadata", startPlayback);
    async function init() {
      const Hls = (await import("hls.js")).default;
      if (cancelled || failed) return;

      if (!Hls.isSupported()) {
        if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = proxyUrl!;

        } else {
          setStatus("error");
        }
        return;
      }

      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        liveSyncDurationCount: 2,
        maxBufferLength: 20,
        maxMaxBufferLength: 30,
        backBufferLength: 0,
        manifestLoadingMaxRetry: 4,
        levelLoadingMaxRetry: 4,
        fragLoadingMaxRetry: 6,
        fragLoadingRetryDelay: 500,
      });

      hls.loadSource(proxyUrl!);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (failed || cancelled) return;
        video.muted = true;
        video.play().catch(failPlayback);
      });

      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (failed || cancelled) return;
        if (data.fatal) {
          failPlayback();
        }
      });
    }

    init().catch(failPlayback);

    // 탭 전환/앱 백그라운드 — 즉시 정지 + 다운로드 중단, 복귀 시 자동 재개
    let pausedByHidden = false;
    const handleVisibility = () => {
      if (failed || cancelled) return;
      if (document.hidden) {
        if (!video.paused) {
          pausedByHidden = true;
          video.pause();
        }
        try { hls?.stopLoad(); } catch { /* ignore */ }
      } else {
        try { hls?.startLoad(); } catch { /* ignore */ }
        if (pausedByHidden) {
          pausedByHidden = false;
          video.play().catch(() => { /* ignore */ });
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      stopObserving();
      video.removeEventListener("loadedmetadata", startPlayback);
      hls?.destroy();
      video.removeEventListener("pause",   onPause);
      video.removeEventListener("waiting", onPause);
      document.removeEventListener("visibilitychange", handleVisibility);
      video.pause();
      video.removeAttribute("src");
      video.load();
      setIsPlaying(false);
    };
  }, [proxyUrl, activated, retryKey]);

  function handlePlayClick(e: MouseEvent) {
    // 카드의 Link 이동을 막고 재생만 활성화
    e.preventDefault();
    e.stopPropagation();
    if (!proxyUrl) return;
    setActivated(true);
    track("cctv_play", { cctv_id: id, cctv_name: name, mode: "click" });
  }

  return (
    <Link
      href={`/cctv/${id}`}
      className="group relative block aspect-video overflow-hidden rounded-xl bg-gray-900"
    >
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        playsInline
        muted
        preload="none"
      />

      {/* 비활성 상태 — 썸네일 + 재생 버튼 */}
      {!activated && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-500/40 to-teal-400/30">
          <button
            type="button"
            onClick={handlePlayClick}
            disabled={!proxyUrl}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 transition-all hover:scale-110 disabled:opacity-30"
            aria-label="재생"
          >
            <span className="ml-1 text-2xl">▶</span>
          </button>
        </div>
      )}

      {/* 로딩 */}
      {activated && status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-500/40 to-teal-400/30">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </div>
      )}

      {/* 에러 */}
      {activated && status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-gray-900 px-2 text-center text-white/60">
          <span className="text-2xl">📡</span>
          <span className="text-[10px] leading-tight">영상 재생 임시 오류</span>
          <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRetryKey(k => k + 1); }} className="rounded-full bg-white/10 px-3 py-1 text-xs text-white">다시 시도</button>
        </div>
      )}

      {/* LIVE 뱃지 */}
      {status === "playing" && isPlaying && (
        <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-live-red px-2 py-0.5 text-[10px] font-bold text-white shadow">
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          재생 확인
        </span>
      )}

      {/* 하단 정보 오버레이 */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5">
        <p className="text-xs font-medium text-white truncate">{name}</p>
      </div>
    </Link>
  );
}
