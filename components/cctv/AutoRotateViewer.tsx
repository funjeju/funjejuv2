"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSaved } from "@/hooks/useSaved";
import { mockCctvs } from "@/constants/mock-cctvs";
import { LiveChat } from "@/components/cctv/LiveChat";
import { usePageVisibility } from "@/hooks/usePageVisibility";

const ROTATE_SEC = 7;
const FADE_MS = 600;

/**
 * 이중 video 엘리먼트로 부드러운 전환
 * active=false면 HLS 로드 안 함 (placeholder 상태)
 */
function CrossfadePlayer({
  proxyUrl,
  cctvName,
  active,
}: {
  proxyUrl: string | null;
  cctvName: string;
  active: boolean;
}) {
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const hlsARef   = useRef<import("hls.js").default | null>(null);
  const hlsBRef   = useRef<import("hls.js").default | null>(null);

  const [activeLayer, setActiveLayer] = useState<"A" | "B">("A");
  const [status,      setStatus]      = useState<"loading" | "playing" | "error">("loading");

  // 백그라운드 진입 시 양쪽 HLS 정지, 복귀 시 재시작
  usePageVisibility({
    onHide: () => {
      hlsARef.current?.stopLoad();
      hlsBRef.current?.stopLoad();
      videoARef.current?.pause();
      videoBRef.current?.pause();
    },
    onShow: () => {
      if (!active) return;
      hlsARef.current?.startLoad();
      hlsBRef.current?.startLoad();
      const v = activeLayer === "A" ? videoARef.current : videoBRef.current;
      v?.play().catch(() => { /* 자동재생 차단 시 무시 */ });
    },
  });

  useEffect(() => {
    if (!active || !proxyUrl) {
      if (!proxyUrl && active) setStatus("error");
      return;
    }

    let cancelled = false;
    const nextLayer    = activeLayer === "A" ? "B" : "A";
    const nextVideo    = nextLayer === "A" ? videoARef.current : videoBRef.current;
    const prevVideo    = activeLayer === "A" ? videoARef.current : videoBRef.current;
    const nextHlsRef   = nextLayer === "A" ? hlsARef : hlsBRef;
    const prevHlsRef   = activeLayer === "A" ? hlsARef : hlsBRef;

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
  }, [proxyUrl, active]);

  useEffect(() => {
    return () => {
      hlsARef.current?.destroy();
      hlsBRef.current?.destroy();
    };
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl bg-gray-900">
      <video
        ref={videoARef}
        className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[600ms]"
        style={{ opacity: active && activeLayer === "A" ? 1 : 0 }}
        playsInline muted preload="none"
      />
      <video
        ref={videoBRef}
        className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[600ms]"
        style={{ opacity: active && activeLayer === "B" ? 1 : 0 }}
        playsInline muted preload="none"
      />

      {/* 비활성 — 플레이스홀더 + 안내 + 재생 버튼은 부모 컴포넌트에서 표시 */}
      {!active && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gradient-to-br from-blue-700/60 via-cyan-600/40 to-teal-500/30">
          {/* 아무것도 안 그림 — 부모가 처리 */}
        </div>
      )}

      {active && status === "loading" && (
        <div className="absolute right-3 top-3 z-10">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </div>
      )}

      {active && status === "error" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 bg-gray-900 text-white/60">
          <span className="text-3xl">📡</span>
          <span className="text-xs">{cctvName} 연결 실패</span>
        </div>
      )}

      {active && status === "playing" && (
        <span className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-full bg-live-red px-2.5 py-1 text-[11px] font-bold text-white shadow">
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          LIVE
        </span>
      )}
    </div>
  );
}

export function AutoRotateViewer() {
  const { savedIds } = useSaved();
  const [index,     setIndex]     = useState(0);
  const [paused,    setPaused]    = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [activated, setActivated] = useState(false); // ★ 사용자 재생 클릭 여부

  const savedCctvs = mockCctvs.filter((c) => savedIds.has(c.id));
  const cctvs = savedCctvs.length > 0 ? savedCctvs : mockCctvs;
  const isPersonalized = savedCctvs.length > 0;
  const current = cctvs[index % cctvs.length];

  // 자동 전환은 activated && !paused일 때만
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
            <div className="relative aspect-video w-full">
              <CrossfadePlayer
                proxyUrl={current.streamProxyUrl}
                cctvName={current.name}
                active={activated}
              />

              {/* ── 비활성 상태 오버레이: 재생 버튼 + 안내 ── */}
              {!activated && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 px-4">
                  <button
                    type="button"
                    onClick={() => setActivated(true)}
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
                  {/* 장소명 표시 (비활성 상태에서도) */}
                  <div className="absolute bottom-3 left-3 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
                    📍 {current.name}
                  </div>
                </div>
              )}
            </div>

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
