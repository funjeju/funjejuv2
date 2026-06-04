"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Props = {
  id: string;
  proxyUrl: string | null;
  name: string;
  /** 강제 재생 (홈의 작은 미리보기 등). 기본은 가시성 기반 */
  forcePlay?: boolean;
};

/**
 * 컴팩트 자동재생 미니 플레이어
 * 데이터/CPU 절약 — 화면에 보이지 않으면 자동 정지하고 스트림 끊음
 */
export function HlsMiniPlayer({ id, proxyUrl, name, forcePlay = false }: Props) {
  const containerRef = useRef<HTMLAnchorElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "playing" | "error">(
    forcePlay ? "loading" : "idle"
  );
  const [visible, setVisible] = useState(forcePlay);
  const [viewers] = useState(() => Math.floor(Math.random() * 300 + 100));

  // ── 가시성 감지 (Intersection Observer) ─────────────────────
  useEffect(() => {
    if (forcePlay || !containerRef.current) return;

    const el = containerRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
      },
      {
        // 최소 30%가 보이면 활성, 카드가 큰 영역만큼 보일 때만 재생
        threshold: 0.3,
        // 위/아래 100px 미리 로드해서 스크롤 부드럽게
        rootMargin: "100px 0px",
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [forcePlay]);

  // ── HLS 스트림 부착/해제 ────────────────────────────────────
  useEffect(() => {
    if (!proxyUrl || !videoRef.current) {
      if (!proxyUrl) setStatus("error");
      return;
    }

    // 안 보이면 스트림 끊기
    if (!visible) {
      const video = videoRef.current;
      video.pause();
      // src 비우면 네트워크 다운로드 즉시 중단
      video.removeAttribute("src");
      video.load();
      setStatus("idle");
      return;
    }

    setStatus("loading");
    const video = videoRef.current;
    let hls: import("hls.js").default | null = null;

    async function init() {
      const Hls = (await import("hls.js")).default;

      if (!Hls.isSupported()) {
        if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = proxyUrl!;
          video.addEventListener("loadedmetadata", () => setStatus("playing"));
          video.addEventListener("error", () => setStatus("error"));
        } else {
          setStatus("error");
        }
        return;
      }

      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        // 메모리 절약 — 버퍼 작게
        maxBufferLength: 10,
        maxMaxBufferLength: 20,
        backBufferLength: 0,
        manifestLoadingMaxRetry: 2,
        levelLoadingMaxRetry: 2,
        fragLoadingMaxRetry: 2,
      });

      hls.loadSource(proxyUrl!);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setStatus("playing");
        video.muted = true;
        video.play().catch(() => setStatus("error"));
      });

      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          setStatus("error");
          hls?.destroy();
        }
      });
    }

    init();

    return () => {
      hls?.destroy();
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [proxyUrl, visible]);

  return (
    <Link
      ref={containerRef}
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

      {/* 아직 안 보이는 카드 (대기 상태) */}
      {status === "idle" && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-500/30 to-teal-400/20">
          <span className="text-3xl opacity-50">🏝️</span>
        </div>
      )}

      {/* 로딩 */}
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-500/40 to-teal-400/30">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </div>
      )}

      {/* 에러 */}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-gray-900 text-white/60">
          <span className="text-2xl">📡</span>
          <span className="text-[10px]">연결 실패</span>
        </div>
      )}

      {/* LIVE 뱃지 */}
      {status === "playing" && (
        <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-live-red px-2 py-0.5 text-[10px] font-bold text-white shadow">
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          LIVE
        </span>
      )}

      {/* 하단 정보 오버레이 */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5">
        <p className="text-xs font-medium text-white truncate">{name}</p>
        <p className="text-[10px] text-white/70">👥 {viewers}</p>
      </div>

      {/* 호버 hint */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
        <span className="opacity-0 group-hover:opacity-100 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold text-text-primary transition-opacity">
          크게 보기
        </span>
      </div>
    </Link>
  );
}
