"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSaved } from "@/hooks/useSaved";
import { mockCctvs } from "@/constants/mock-cctvs";
import { LiveChat } from "@/components/cctv/LiveChat";

const ROTATE_SEC = 7;

/** 자동 전환 HLS 플레이어 (1개 CCTV만 재생) */
function AutoPlayer({ proxyUrl, cctvName }: { proxyUrl: string | null; cctvName: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"loading" | "playing" | "error">("loading");

  useEffect(() => {
    if (!proxyUrl || !videoRef.current) {
      if (!proxyUrl) setStatus("error");
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
        } else setStatus("error");
        return;
      }

      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 10,
        backBufferLength: 0,
        manifestLoadingMaxRetry: 2,
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
  }, [proxyUrl]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-gray-900">
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        playsInline
        muted
        preload="none"
      />

      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-500/40 to-teal-400/30">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-gray-900 text-white/60">
          <span className="text-3xl">📡</span>
          <span className="text-xs">{cctvName} 연결 실패</span>
        </div>
      )}

      {status === "playing" && (
        <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-live-red px-2.5 py-1 text-[11px] font-bold text-white shadow">
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          LIVE
        </span>
      )}
    </div>
  );
}

export function AutoRotateViewer() {
  const { savedIds } = useSaved();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0); // 0~100

  // 즐겨찾기 우선, 없으면 전체
  const savedCctvs = mockCctvs.filter((c) => savedIds.has(c.id));
  const cctvs = savedCctvs.length > 0 ? savedCctvs : mockCctvs;
  const isPersonalized = savedCctvs.length > 0;

  const current = cctvs[index % cctvs.length];

  // 자동 전환 + 진행률
  useEffect(() => {
    if (paused || cctvs.length <= 1) return;

    const TICK = 100; // 100ms마다 진행률 업데이트
    const totalTicks = (ROTATE_SEC * 1000) / TICK;
    let tickCount = 0;
    setProgress(0);

    const id = setInterval(() => {
      tickCount++;
      const p = (tickCount / totalTicks) * 100;
      if (tickCount >= totalTicks) {
        setIndex((i) => (i + 1) % cctvs.length);
        tickCount = 0;
        setProgress(0);
      } else {
        setProgress(p);
      }
    }, TICK);

    return () => clearInterval(id);
  }, [paused, cctvs.length, index]);

  function next() {
    setIndex((i) => (i + 1) % cctvs.length);
    setProgress(0);
  }
  function prev() {
    setIndex((i) => (i - 1 + cctvs.length) % cctvs.length);
    setProgress(0);
  }

  if (!current) return null;

  return (
    <section className="px-4 md:px-0">
      {/* 헤더 */}
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

      {/* TV-shaped container */}
      <div className="relative rounded-2xl border-4 border-jeju-green bg-jeju-green/10 p-3">
        <div className="absolute -top-4 left-1/2 flex -translate-x-1/2 gap-4 text-xl text-jeju-green">
          <span className="-rotate-12 inline-block">📡</span>
        </div>

        {/* 데스크탑: 좌영상 우채팅 / 모바일: 위아래 */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.6fr_1fr]">

          {/* ── 영상 영역 ── */}
          <div className="space-y-2">
            <AutoPlayer
              key={current.id}
              proxyUrl={current.streamProxyUrl}
              cctvName={current.name}
            />

            {/* CCTV 정보 + 컨트롤 */}
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
                <button
                  type="button"
                  onClick={prev}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-secondary hover:bg-border-soft transition-colors"
                  title="이전"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => setPaused((p) => !p)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-secondary text-xs hover:bg-border-soft transition-colors"
                  title={paused ? "재개" : "정지"}
                >
                  {paused ? "▶" : "⏸"}
                </button>
                <button
                  type="button"
                  onClick={next}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-secondary hover:bg-border-soft transition-colors"
                  title="다음"
                >
                  ›
                </button>
              </div>
            </div>

            {/* 진행률 바 */}
            {cctvs.length > 1 && (
              <div className="h-1 overflow-hidden rounded-full bg-bg-secondary">
                <div
                  className={`h-full transition-all ${paused ? "bg-text-secondary" : "bg-brand-orange"}`}
                  style={{ width: `${paused ? 100 : progress}%` }}
                />
              </div>
            )}

            {/* 다음 CCTV 미리보기 (점) */}
            {cctvs.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {cctvs.slice(0, 10).map((c, i) => {
                  const realIdx = index % cctvs.length;
                  const isActive = i === realIdx;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { setIndex(i); setProgress(0); }}
                      className={[
                        "h-1.5 rounded-full transition-all",
                        isActive
                          ? "w-6 bg-brand-orange"
                          : "w-1.5 bg-text-secondary/30 hover:bg-text-secondary/60",
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

          {/* ── 채팅 영역 ── */}
          <div className="lg:max-h-[420px]">
            <LiveChat
              key={current.id}
              cctvId={current.id}
              cctvName={current.name}
            />
          </div>
        </div>

        {/* 하단 안내 */}
        <Link
          href="/cctv"
          className="mt-3 flex w-full items-center justify-between rounded-xl border border-jeju-green/30 bg-white px-4 py-2.5 text-sm font-semibold text-text-primary hover:bg-jeju-green/5 transition-colors"
        >
          <span className="text-sm">〈</span>
          <span>전체 CCTV 보기</span>
          <span className="text-sm">〉</span>
        </Link>
      </div>
    </section>
  );
}
