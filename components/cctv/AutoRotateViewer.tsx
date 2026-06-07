"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSaved } from "@/hooks/useSaved";
import { mockCctvs } from "@/constants/mock-cctvs";
import { LiveChat } from "@/components/cctv/LiveChat";
import { useCctvSession } from "@/hooks/useCctvSession";

const ROTATE_SEC = 7;
const FADE_MS = 600;

/** 이중 video로 부드러운 전환 (mount 시점에 즉시 로드 시작) */
function CrossfadePlayer({
  proxyUrl,
  cctvName,
  cctvId,
}: {
  proxyUrl: string | null;
  cctvName: string;
  cctvId?: string;
}) {
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const hlsARef   = useRef<import("hls.js").default | null>(null);
  const hlsBRef   = useRef<import("hls.js").default | null>(null);

  const [activeLayer, setActiveLayer] = useState<"A" | "B">("A");
  const [status,      setStatus]      = useState<"loading" | "playing" | "error">("loading");
  const [isPlaying,   setIsPlaying]   = useState(false); // 실제 비디오 재생 중

  // 시청 세션 추적: 비디오가 실제 재생 중일 때만
  useCctvSession({
    cctvId: cctvId && isPlaying ? cctvId : null,
    cctvName,
    isPlaying,
  });

  // 활성 video의 재생 상태 추적
  useEffect(() => {
    const video = activeLayer === "A" ? videoARef.current : videoBRef.current;
    if (!video) return;
    const onPlay  = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    video.addEventListener("playing", onPlay);
    video.addEventListener("pause",   onPause);
    video.addEventListener("waiting", onPause);
    // 현재 상태 즉시 반영
    setIsPlaying(!video.paused);
    return () => {
      video.removeEventListener("playing", onPlay);
      video.removeEventListener("pause",   onPause);
      video.removeEventListener("waiting", onPause);
    };
  }, [activeLayer]);

  useEffect(() => {
    if (!proxyUrl) { setStatus("error"); return; }

    let cancelled = false;
    const nextLayer  = activeLayer === "A" ? "B" : "A";
    const nextVideo  = nextLayer === "A" ? videoARef.current : videoBRef.current;
    const prevVideo  = activeLayer === "A" ? videoARef.current : videoBRef.current;
    const nextHlsRef = nextLayer === "A" ? hlsARef : hlsBRef;
    const prevHlsRef = activeLayer === "A" ? hlsARef : hlsBRef;

    if (!nextVideo) return;
    setStatus("loading");

    async function loadIntoNext() {
      const Hls = (await import("hls.js")).default;
      if (cancelled) return;

      if (!Hls.isSupported()) {
        if (nextVideo!.canPlayType("application/vnd.apple.mpegurl")) {
          nextVideo!.src = proxyUrl!;
          nextVideo!.addEventListener("loadedmetadata", () => onReady(), { once: true });
          nextVideo!.addEventListener("error", () => setStatus("error"), { once: true });
        } else {
          setStatus("error");
        }
        return;
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 10,
        backBufferLength: 0,
        manifestLoadingMaxRetry: 2,
        levelLoadingMaxRetry: 2,
        fragLoadingMaxRetry: 2,
      });
      nextHlsRef.current = hls;
      hls.loadSource(proxyUrl!);
      hls.attachMedia(nextVideo!);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (cancelled) return;
        nextVideo!.muted = true;
        nextVideo!.play()
          .then(() => { if (!cancelled) onReady(); })
          .catch(() => onReady());
      });

      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal && !cancelled) {
          setStatus("error");
          hls.destroy();
        }
      });
    }

    function onReady() {
      if (cancelled) return;
      setStatus("playing");
      setActiveLayer(nextLayer);

      setTimeout(() => {
        const prevHls = prevHlsRef.current;
        if (prevHls) { prevHls.destroy(); prevHlsRef.current = null; }
        if (prevVideo) {
          prevVideo.pause();
          prevVideo.removeAttribute("src");
          prevVideo.load();
        }
      }, FADE_MS + 100);
    }

    loadIntoNext();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proxyUrl]);

  // 언마운트 시 두 비디오 + HLS 완전 정리
  useEffect(() => {
    return () => {
      hlsARef.current?.destroy();
      hlsBRef.current?.destroy();
      hlsARef.current = null;
      hlsBRef.current = null;
      [videoARef.current, videoBRef.current].forEach((v) => {
        if (!v) return;
        v.pause();
        v.removeAttribute("src");
        v.load();
      });
      setIsPlaying(false);
    };
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl bg-gray-900">
      <video
        ref={videoARef}
        className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[600ms]"
        style={{ opacity: activeLayer === "A" ? 1 : 0 }}
        playsInline muted preload="none"
      />
      <video
        ref={videoBRef}
        className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[600ms]"
        style={{ opacity: activeLayer === "B" ? 1 : 0 }}
        playsInline muted preload="none"
      />

      {status === "loading" && (
        <div className="absolute right-3 top-3 z-10">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 bg-gray-900 text-white/60">
          <span className="text-3xl">📡</span>
          <span className="text-xs">{cctvName} 연결 실패</span>
        </div>
      )}

      {status === "playing" && (
        <span className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-full bg-live-red px-2.5 py-1 text-[11px] font-bold text-white shadow">
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          LIVE
        </span>
      )}
    </div>
  );
}

/** 비활성 상태 플레이스홀더 — 그라데이션 + 재생 버튼 */
function PlaceholderPlayer({
  cctvName,
  onPlay,
}: {
  cctvName: string;
  onPlay: () => void;
}) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl bg-gradient-to-br from-blue-700/60 via-cyan-600/40 to-teal-500/30">
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4">
        <button
          type="button"
          onClick={onPlay}
          className="group flex h-20 w-20 items-center justify-center rounded-full bg-brand-orange/90 text-white shadow-2xl backdrop-blur-sm transition-all hover:scale-110 hover:bg-brand-orange md:h-24 md:w-24"
          aria-label="실시간 영상 재생"
        >
          <span className="ml-1.5 text-3xl md:text-4xl">▶</span>
        </button>
        <div className="text-center">
          <p className="text-sm font-black text-white drop-shadow-lg md:text-base">
            📡 실시간 영상 보기
          </p>
          <p className="mt-1 text-[11px] text-white/80 drop-shadow md:text-xs">
            ▶ 클릭하면 7초마다 자동 전환되는 라이브 영상이 시작됩니다
          </p>
        </div>
      </div>
      <div className="absolute bottom-3 left-3 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
        📍 {cctvName}
      </div>
    </div>
  );
}

export function AutoRotateViewer() {
  const { savedIds } = useSaved();
  const [index,     setIndex]     = useState(0);
  const [paused,    setPaused]    = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [activated, setActivated] = useState(false);

  const savedCctvs = mockCctvs.filter((c) => savedIds.has(c.id));
  const cctvs = savedCctvs.length > 0 ? savedCctvs : mockCctvs;
  const isPersonalized = savedCctvs.length > 0;
  const current = cctvs[index % cctvs.length];

  // 자동 전환: activated && !paused일 때만
  useEffect(() => {
    if (!activated || paused || cctvs.length <= 1) return;
    const TICK = 100;
    const totalTicks = (ROTATE_SEC * 1000) / TICK;
    let tickCount = 0;
    setProgress(0);

    const id = setInterval(() => {
      tickCount++;
      if (tickCount >= totalTicks) {
        setIndex((i) => (i + 1) % cctvs.length);
        tickCount = 0;
        setProgress(0);
      } else {
        setProgress((tickCount / totalTicks) * 100);
      }
    }, TICK);
    return () => clearInterval(id);
  }, [activated, paused, cctvs.length, index]);

  function next() { setIndex((i) => (i + 1) % cctvs.length); setProgress(0); }
  function prev() { setIndex((i) => (i - 1 + cctvs.length) % cctvs.length); setProgress(0); }

  if (!current) return null;

  return (
    <section className="px-4 md:px-0">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-text-primary md:text-lg">
            {isPersonalized ? (
              <>내 즐겨찾기 CCTV <span className="text-brand-orange">⭐</span></>
            ) : (
              "실시간 제주 CCTV"
            )}
          </h2>
          <span className="rounded-full bg-bg-secondary px-2 py-0.5 text-[10px] font-bold text-text-secondary">
            {(index % cctvs.length) + 1} / {cctvs.length}
          </span>
        </div>
        <Link href="/cctv" className="text-xs font-medium text-brand-orange">
          전체보기 →
        </Link>
      </div>

      <div className="relative rounded-2xl border-4 border-jeju-green bg-jeju-green/10 p-3">
        <div className="absolute -top-4 left-1/2 flex -translate-x-1/2 gap-4 text-xl text-jeju-green">
          <span className="-rotate-12 inline-block">📡</span>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.6fr_1fr] lg:items-stretch">
          <div className="flex flex-col gap-2">
            <div className="aspect-video w-full">
              {/* ★ activated일 때만 실제 플레이어 mount, 아니면 플레이스홀더 */}
              {activated ? (
                <CrossfadePlayer
                  proxyUrl={current.streamProxyUrl}
                  cctvName={current.name}
                  cctvId={current.id}
                />
              ) : (
                <PlaceholderPlayer
                  cctvName={current.name}
                  onPlay={() => setActivated(true)}
                />
              )}
            </div>

            <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 shadow-card">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium text-ocean-blue">{current.region}</p>
                <Link
                  href={`/cctv/${current.id}`}
                  className="block truncate text-sm font-bold text-text-primary hover:text-brand-orange transition-colors"
                >
                  📍 {current.name}
                </Link>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button type="button" onClick={prev}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-secondary hover:bg-border-soft transition-colors"
                  title="이전">
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!activated) { setActivated(true); return; }
                    setPaused((p) => !p);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-secondary text-xs hover:bg-border-soft transition-colors"
                  title={!activated ? "재생" : paused ? "재개" : "정지"}
                >
                  {!activated || paused ? "▶" : "⏸"}
                </button>
                <button type="button" onClick={next}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-secondary hover:bg-border-soft transition-colors"
                  title="다음">
                  ›
                </button>
              </div>
            </div>

            {cctvs.length > 1 && (
              <div className="h-1 overflow-hidden rounded-full bg-bg-secondary">
                <div
                  className={`h-full transition-all ${(!activated || paused) ? "bg-text-secondary" : "bg-brand-orange"}`}
                  style={{ width: `${(!activated || paused) ? 100 : progress}%` }}
                />
              </div>
            )}

            {cctvs.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {cctvs.slice(0, 10).map((c, i) => {
                  const realIdx = index % cctvs.length;
                  const isActive = i === realIdx;
                  return (
                    <button key={c.id} type="button"
                      onClick={() => { setIndex(i); setProgress(0); }}
                      className={[
                        "h-1.5 rounded-full transition-all",
                        isActive ? "w-6 bg-brand-orange" : "w-1.5 bg-text-secondary/30 hover:bg-text-secondary/60",
                      ].join(" ")}
                      title={c.name}
                    />
                  );
                })}
                {cctvs.length > 10 && (
                  <span className="text-[10px] text-text-secondary">+{cctvs.length - 10}</span>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col min-h-0">
            <LiveChat cctvId="jeju_global" cctvName="제주 실시간" fillHeight />
          </div>
        </div>

        <Link href="/cctv"
          className="mt-3 flex w-full items-center justify-between rounded-xl border border-jeju-green/30 bg-white px-4 py-2.5 text-sm font-semibold text-text-primary hover:bg-jeju-green/5 transition-colors">
          <span className="text-sm">〈</span>
          <span>전체 CCTV 보기</span>
          <span className="text-sm">〉</span>
        </Link>
      </div>
    </section>
  );
}
