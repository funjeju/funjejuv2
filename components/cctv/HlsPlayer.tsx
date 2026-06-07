"use client";

import { useEffect, useRef, useState } from "react";
import { useCctvSession } from "@/hooks/useCctvSession";

type Status = "loading" | "playing" | "error" | "offline";

type Props = {
  /** Worker 프록시 URL  e.g. https://worker.funjeju.com/cctv/hamdeok */
  proxyUrl: string | null;
  /** 스트림이 없을 때 표시할 CCTV 이름 */
  label?: string;
  /** 통계용 cctv ID (있으면 시청 세션 추적) */
  cctvId?: string;
  /** 통계용 cctv 이름 */
  cctvName?: string;
};

export function HlsPlayer({ proxyUrl, label, cctvId, cctvName }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<Status>(proxyUrl ? "loading" : "offline");

  // 시청 세션 추적 (status가 playing일 때만)
  useCctvSession({
    cctvId: cctvId && status === "playing" ? cctvId : null,
    cctvName,
  });

  useEffect(() => {
    if (!proxyUrl || !videoRef.current) return;

    const video = videoRef.current;
    let hls: import("hls.js").default | null = null;

    async function init() {
      const Hls = (await import("hls.js")).default;

      // Safari는 네이티브 HLS 지원 → Hls.js 불필요
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
        manifestLoadingMaxRetry: 3,
        levelLoadingMaxRetry: 3,
        fragLoadingMaxRetry: 3,
      });

      hls.loadSource(proxyUrl!);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setStatus("playing");
        video.play().catch(() => {
          // 자동재생 정책 → muted로 재시도
          video.muted = true;
          video.play().catch(() => setStatus("error"));
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            // 네트워크 오류 → 재시도
            hls!.startLoad();
          } else {
            setStatus("error");
            hls!.destroy();
          }
        }
      });
    }

    init();

    return () => {
      hls?.destroy();
    };
  }, [proxyUrl]);

  return (
    <div className="relative w-full overflow-hidden rounded-none bg-gray-950 aspect-video md:rounded-2xl">
      {/* 실제 비디오 */}
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        playsInline
        muted
        autoPlay
      />

      {/* 로딩 오버레이 */}
      {status === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/80 gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          <p className="text-xs text-white/60">스트림 연결 중...</p>
        </div>
      )}

      {/* 에러 오버레이 */}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 gap-3">
          <span className="text-4xl">📡</span>
          <p className="text-sm font-bold text-white">스트림 연결 실패</p>
          <p className="text-xs text-white/50">잠시 후 다시 시도해주세요</p>
          <button
            type="button"
            onClick={() => { setStatus("loading"); }}
            className="mt-1 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
          >
            재연결
          </button>
        </div>
      )}

      {/* 오프라인 오버레이 (proxyUrl 없음) */}
      {status === "offline" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 gap-2">
          <span className="text-4xl">🔌</span>
          <p className="text-sm font-bold text-white">{label ?? "CCTV"} 준비 중</p>
          <p className="text-xs text-white/50">스트림 주소 미등록</p>
        </div>
      )}

      {/* 재생 중 배지들 */}
      {status === "playing" && (
        <>
          <div className="absolute left-3 top-3 flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-live-red px-2.5 py-1 text-[11px] font-bold text-white shadow">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              LIVE
            </span>
          </div>
          {/* 볼륨 토글 */}
          <button
            type="button"
            onClick={() => {
              if (videoRef.current) videoRef.current.muted = !videoRef.current.muted;
            }}
            className="absolute bottom-3 left-3 rounded-full bg-black/50 p-2 text-white backdrop-blur hover:bg-black/70 transition-colors"
          >
            🔊
          </button>
        </>
      )}
    </div>
  );
}
