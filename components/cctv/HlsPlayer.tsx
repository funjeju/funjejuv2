"use client";

import { useEffect, useRef, useState } from "react";
import { observePlayback } from "@/lib/cctv-playback-health";
import { useCctvSession } from "@/hooks/useCctvSession";
import { useWatchBudget, fmtDuration, type WatchBudgetResult } from "@/hooks/useWatchBudget";

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
  /** Explicit QA only: one attempt, observable HLS errors, no retry or telemetry. */
  verificationMode?: boolean;
};

export function HlsPlayer({ proxyUrl, label, cctvId, cctvName, verificationMode = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<import("hls.js").default | null>(null); // togglePlay/스톨에서 startLoad 재개용
  const failureRef = useRef<(() => void) | null>(null);
  const verificationStopped = useRef(false); // Sticky for this viewer mount.
  const [status,    setStatus]    = useState<Status>(proxyUrl ? "loading" : "offline");
  const [isPlaying, setIsPlaying] = useState(false); // 실제 비디오 재생 중 여부
  const [serverBudget, setServerBudget] = useState<WatchBudgetResult | null>(null);
  const [retryKey, setRetryKey] = useState(0); // 재연결 버튼 → effect 재실행

  // 시청 세션 추적 + 서버 시청예산: 비디오가 실제 재생 중일 때만 (단일 스트림)
  useCctvSession({
    cctvId: !verificationMode && cctvId && isPlaying ? cctvId : null,
    cctvName: verificationMode ? undefined : cctvName,
    isPlaying,
    activeStreams: isPlaying ? 1 : 0,
    onBudget: setServerBudget,
  });

  // 시청시간 예산 — 서버 권위 + 클라 보간
  const productionBudget = useWatchBudget(!verificationMode && isPlaying ? 1 : 0, serverBudget);
  // The separately admin-authorized, time-bounded verification session must not
  // be masked by stale consumer usage caches. Actual entitlements are unchanged.
  const budget = verificationMode ? {
    ...productionBudget, exhausted: false, unlimited: true, usedSeconds: 0,
  } : productionBudget;

  // 소진되면 재생 정지
  useEffect(() => {
    if (budget.exhausted && videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
    }
  }, [budget.exhausted]);

  useEffect(() => {
    if (verificationMode && verificationStopped.current) { setStatus("error"); return; }
    if (!proxyUrl || !videoRef.current) { setStatus("offline"); return; }
    setStatus("loading");

    const video = videoRef.current;
    let hls: import("hls.js").default | null = null;
    let failed = false;
    let cancelled = false; // 동적 import 대기 중 언마운트되면 hls 생성 자체를 막음

    // ★ 프록시 origin 추출 → /event 호출용
    // proxyUrl: https://proxy.tuberecipe.co.kr/cctv/hagwi → proxyBase: https://proxy...
    const proxyBase = (() => {
      try { return new URL(proxyUrl!).origin; } catch { return ""; }
    })();
    const sendEvent = (action: "start" | "stop" | "leave") => {
      if (verificationMode || !proxyBase || !cctvId) return;
      const url = `${proxyBase}/event?cctv=${encodeURIComponent(cctvId)}&action=${action}`;
      try {
        if (navigator.sendBeacon) navigator.sendBeacon(url, "");
        else fetch(url, { method: "POST", keepalive: true }).catch(() => {});
      } catch { /* ignore */ }
    };

    // video element 자체의 재생 상태 추적
    // waiting(버퍼링)은 일시정지가 아니므로 ▶ 오버레이 안 띄움
    const handlePlay  = () => { sendEvent("start"); };
    const handlePause = () => { if (video.paused) { setIsPlaying(false); sendEvent("stop"); } };
    const handleEnd   = () => { setIsPlaying(false); sendEvent("stop"); };
    video.addEventListener("playing", handlePlay);
    video.addEventListener("pause",   handlePause);
    video.addEventListener("ended",   handleEnd);

    const failPlayback = () => {
      if (failed || cancelled) return;
      failed = true;
      if (verificationMode) verificationStopped.current = true;
      hls?.destroy();
      hls = null;
      hlsRef.current = null;
      video.pause();
      if (verificationMode) { video.removeAttribute("src"); video.load(); }
      setStatus("error");
      setIsPlaying(false);
    };
    failureRef.current = failPlayback;
    const stopObserving = observePlayback(video, {
      onProgress: () => { if (!failed) { setStatus("playing"); setIsPlaying(true); } },
      onWaiting: () => { if (!failed) { setStatus("loading"); setIsPlaying(false); } },
      onFailure: failPlayback,
    });
    const resume = () => { if (failed) return; try { hls?.startLoad(); } catch { /* ignore */ } };
    video.addEventListener("stalled", resume);
    const startPlayback = () => { if (!failed) video.play().catch(failPlayback); };
    video.addEventListener("loadedmetadata", startPlayback);

    async function init() {
      const Hls = (await import("hls.js")).default;
      if (cancelled || failed) return;

      if (!Hls.isSupported()) {
        // Native HLS hides response codes/retry behavior; do not probe it in QA.
        if (verificationMode) { failPlayback(); return; }
        if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = proxyUrl!;

        } else {
          setStatus("error");
        }
        return;
      }

      const noRetry = () => ({ default: { maxTimeToFirstByteMs: 8000, maxLoadTimeMs: 12000, timeoutRetry: null, errorRetry: null } });
      hls = new Hls({
        enableWorker: true,
        // ★ 라이브 끝단 추격(lowLatency) 끔 — 끝단에 붙으면 1초 세그먼트(vurix)에서 지터에 바로 끊김.
        // 2세그먼트 뒤를 재생해 쿠션 확보 + 세그먼트 재시도 늘려 일시 502/404 흡수.
        lowLatencyMode: false,
        // 끝단 3칸 뒤 재생 → 시청자들이 같은 ts를 봐 캐시 HIT↑ (실시간에 가까운 뷰어, 지연 허용)
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 10,
        maxBufferLength: 20,
        backBufferLength: 0,
        manifestLoadingMaxRetry: verificationMode ? 0 : 4,
        levelLoadingMaxRetry: verificationMode ? 0 : 4,
        fragLoadingMaxRetry: verificationMode ? 0 : 6,
        fragLoadingRetryDelay: 500,
        ...(verificationMode ? {
          manifestLoadPolicy: noRetry(), playlistLoadPolicy: noRetry(),
          fragLoadPolicy: noRetry(), keyLoadPolicy: noRetry(), certLoadPolicy: noRetry(),
          steeringManifestLoadPolicy: noRetry(), interstitialAssetListLoadPolicy: noRetry(),
          enableInterstitialPlayback: false, emeEnabled: false,
          contentSteeringController: undefined,
        } : {}),
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (failed || cancelled) return;
        video.play().catch(() => {
          if (failed || cancelled) return;
          video.muted = true;
          video.play().catch(failPlayback);
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (failed || cancelled) return;
        // Any network error (including nonfatal 401/403/CORS) is terminal in QA.
        // Never let the production recovery path restart an explicitly denied probe.
        if (verificationMode && (data.type === Hls.ErrorTypes.NETWORK_ERROR || data.fatal)) {
          failPlayback(); return;
        }
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls!.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            try { hls!.recoverMediaError(); } catch { failPlayback(); }
          } else {
            failPlayback();
          }
        }
      });

      // Register denial handlers before starting any source/media work.
      hlsRef.current = hls;
      hls.loadSource(proxyUrl!);
      if (!failed && !cancelled) hls?.attachMedia(video);
    }

    init().catch(failPlayback);

    // 페이지 이탈 시 leave 이벤트
    const handleUnload = () => sendEvent("leave");
    window.addEventListener("pagehide", handleUnload);

    // ★ 탭 전환/앱 백그라운드 — 즉시 정지 + 다운로드 중단, 복귀 시 자동 재개
    let pausedByHidden = false;
    const handleVisibility = () => {
      if (failed || cancelled) return;
      if (document.hidden) {
        if (!video.paused) {
          pausedByHidden = true;
          video.pause(); // → pause 이벤트로 세션 종료 + stop 이벤트 전송
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
      // 강제 정리: HLS destroy + video 완전 해제 → origin 다운로드 즉시 중단
      cancelled = true;
      failureRef.current = null;
      sendEvent("leave"); // 슬롯 제거/페이지 이동
      stopObserving();
      video.removeEventListener("stalled", resume);
      video.removeEventListener("loadedmetadata", startPlayback);
      hls?.destroy();
      hlsRef.current = null;
      video.removeEventListener("playing", handlePlay);
      video.removeEventListener("pause",   handlePause);
      video.removeEventListener("ended",   handleEnd);
      window.removeEventListener("pagehide", handleUnload);
      document.removeEventListener("visibilitychange", handleVisibility);
      video.pause();
      video.removeAttribute("src");
      video.load();
      setIsPlaying(false);
    };
  }, [proxyUrl, retryKey, cctvId, verificationMode]);

  function togglePlay() {
    if (verificationMode && verificationStopped.current) return;
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      if (budget.exhausted) return; // 소진 시 재생 차단
      // ★ 멈춰있을 땐 hls 로딩부터 재개해야 버퍼가 차서 실제로 재생됨 (play()만으론 안 먹음)
      try { hlsRef.current?.startLoad(); } catch { /* */ }
      v.play().catch(() => {
        if (verificationMode && verificationStopped.current) return;
        v.muted = true;
        v.play().catch(() => {
          if (verificationMode) failureRef.current?.();
          else setRetryKey((k) => k + 1);
        }); // Production retains reconnect; QA never restarts a failed attempt.
      });
    } else {
      v.pause();
    }
  }

  return (
    <div className="group relative w-full overflow-hidden rounded-none bg-gray-950 aspect-video md:rounded-2xl">
      {/* 실제 비디오 — 클릭 시 정지/재생 */}
      <video
        ref={videoRef}
        onClick={togglePlay}
        className="h-full w-full object-cover cursor-pointer"
        playsInline
        muted
        autoPlay
      />

      {/* 정지 상태 안내 (페이지 위에 ▶ 보여줌) */}
      {status === "playing" && !isPlaying && (
        <button type="button" onClick={togglePlay}
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 transition-colors hover:bg-black/50">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-orange/90 shadow-2xl">
            <span className="ml-1 text-3xl text-white">▶</span>
          </div>
        </button>
      )}

      {/* 재생 중 클릭 안내 (호버 시) */}
      {status === "playing" && isPlaying && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex flex-col items-center gap-1 rounded-2xl bg-black/60 px-4 py-3 backdrop-blur-sm">
            <span className="text-3xl">⏸</span>
            <span className="text-xs font-bold text-white">클릭하면 정지</span>
          </div>
        </div>
      )}

      {/* 시청시간 소진 오버레이 */}
      {budget.exhausted && (status === "playing" || status === "loading") && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-gray-950/90 px-6 text-center">
          <span className="text-4xl">⏳</span>
          <p className="text-sm font-bold text-white">오늘 시청시간을 다 썼어요</p>
          <p className="text-xs text-white/60">내일 다시 충전돼요</p>
          {/* 정식 요금제 확정 전까지 요금제 링크 임시 숨김
          <Link
            href="/pricing"
            className="mt-2 rounded-full bg-brand-orange px-4 py-2 text-xs font-bold text-white hover:bg-brand-orange/90 transition-colors"
          >
            요금제 보러가기 →
          </Link>
          */}
        </div>
      )}

      {/* 잔여 시청시간 배지 (재생 중, 한도 있을 때) */}
      {status === "playing" && isPlaying && !budget.unlimited && !budget.exhausted && (
        <span className="absolute right-3 top-3 z-20 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">
          ⏱ {fmtDuration(budget.remainingSeconds)}
        </span>
      )}

      {/* 어드민/무제한 — 차단 없이 오늘 누적 사용량을 위로 카운트 */}
      {status === "playing" && isPlaying && budget.unlimited && budget.usedSeconds > 0 && (
        <span className="absolute right-3 top-3 z-20 rounded-full bg-brand-navy/70 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">
          ⏱ 오늘 누적 {fmtDuration(budget.usedSeconds)}
        </span>
      )}

      {/* 로딩 오버레이 */}
      {status === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/80 gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          <p className="text-xs text-white/60">스트림 연결 중...</p>
        </div>
      )}

      {/* 에러 오버레이 — 원인(외부 신호 중단 / 내 네트워크)에 따라 다른 메시지 */}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-950 px-6 text-center">
          <span className="text-4xl">📡</span>
          <p className="text-sm font-bold text-white">영상 재생에 임시 오류가 있어요</p>
          <p className="text-xs leading-relaxed text-white/60">{verificationMode ? "검증 요청을 중단했습니다. 재시도하지 말고 접근 권한과 연결 결과를 검토해 주세요." : <>현재 영상 재생을 확인하지 못했어요.<br />원본 신호 또는 연결 문제일 수 있어요. 잠시 후 다시 시도해 주세요.</>}</p>
          {!verificationMode && <button
            type="button"
            onClick={() => { setStatus("loading"); setRetryKey((k) => k + 1); }}
            className="mt-1 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
          >
            지금 재연결
          </button>}
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
      {status === "playing" && isPlaying && (
        <>
          <div className="absolute left-3 top-3 flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-live-red px-2.5 py-1 text-[11px] font-bold text-white shadow">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              재생 확인
            </span>
          </div>
          {/* 볼륨 토글 */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (videoRef.current) videoRef.current.muted = !videoRef.current.muted;
            }}
            className="absolute bottom-3 left-3 z-20 rounded-full bg-black/50 p-2 text-white backdrop-blur hover:bg-black/70 transition-colors"
          >
            🔊
          </button>
        </>
      )}
    </div>
  );
}
