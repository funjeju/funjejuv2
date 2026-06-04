"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Props = {
  id: string;
  proxyUrl: string | null;
  name: string;
};

/** 홈/리스트용 컴팩트 자동재생 미니 플레이어 (음소거 + 클릭 시 상세 이동) */
export function HlsMiniPlayer({ id, proxyUrl, name }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"loading" | "playing" | "error">("loading");
  const [viewers] = useState(() => Math.floor(Math.random() * 300 + 100));

  useEffect(() => {
    if (!proxyUrl || !videoRef.current) {
      setStatus("error");
      return;
    }

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
    return () => { hls?.destroy(); };
  }, [proxyUrl]);

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
        autoPlay
      />

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
