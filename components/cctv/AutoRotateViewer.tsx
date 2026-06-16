"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useCctvFavorite } from "@/hooks/useCctvFavorite";
import { fetchCctvsByIds } from "@/lib/firestore-cctv";
import { mockCctvs } from "@/constants/mock-cctvs";
import type { CctvEntry } from "@/types/cctv";

// 홈 회전뷰 고정 목록 — 안정적으로 재생되는 CCTV만 (유튜브 소스 제외, 접속불가 방지)
// 순서대로 순환: 김녕·월정·함덕·협재·성산일출봉·평대·논짓물·신산·세천
const HOME_ROTATE_IDS = [
  "gimnyeong", "woljeong", "hamdeok", "hyeopjae", "seongsan",
  "pyeongdae", "nonjitmul", "sinsan", "sechon",
];

// CCTV 스트림 프록시 URL (mock-cctvs와 동일 규칙) — id만 있으면 자동 생성
const _WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL ?? "";
const _PROXY_BASE = process.env.NEXT_PUBLIC_PROXY_URL ?? "";
function streamProxyUrlFor(id: string): string | null {
  if (_WORKER_URL) return `${_WORKER_URL}/cctv/${id}`;
  if (_PROXY_BASE) return `${_PROXY_BASE}/cctv/${id}`;
  return null;
}

// 초기값(즉시 렌더·블링크 방지): mock에서 화이트리스트 항목을 CctvEntry로 변환
const MOCK_INITIAL: CctvEntry[] = mockCctvs
  .filter((c) => HOME_ROTATE_IDS.includes(c.id))
  .map((c) => ({
    id: c.id, name: c.name, region: c.region, direction: c.direction,
    category: c.category, originUrl: "", active: true, description: c.description ?? "",
    lat: c.latitude, lng: c.longitude,
  }));
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
        lowLatencyMode: false,
        liveSyncDurationCount: 2,
        maxBufferLength: 20,
        backBufferLength: 0,
        manifestLoadingMaxRetry: 4,
        levelLoadingMaxRetry: 4,
        fragLoadingMaxRetry: 6,
        fragLoadingRetryDelay: 500,
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

  // 탭 전환/앱 백그라운드 — 두 레이어 모두 정지 + 다운로드 중단, 복귀 시 재개
  useEffect(() => {
    let pausedByHidden = false;
    const onVis = () => {
      const videos = [videoARef.current, videoBRef.current];
      const hlses  = [hlsARef.current, hlsBRef.current];
      if (document.hidden) {
        if (videos.some((v) => v && !v.paused)) pausedByHidden = true;
        videos.forEach((v) => v?.pause());
        hlses.forEach((h) => { try { h?.stopLoad(); } catch { /* ignore */ } });
      } else {
        hlses.forEach((h) => { try { h?.startLoad(); } catch { /* ignore */ } });
        if (pausedByHidden) {
          pausedByHidden = false;
          videos.forEach((v) => v?.play().catch(() => { /* ignore */ }));
        }
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

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
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 md:gap-3">
        <button
          type="button"
          onClick={onPlay}
          className="group flex h-14 w-14 items-center justify-center rounded-full bg-brand-orange/90 text-white shadow-2xl backdrop-blur-sm transition-all hover:scale-110 hover:bg-brand-orange md:h-24 md:w-24"
          aria-label="실시간 영상 재생"
        >
          <span className="ml-0.5 text-xl md:text-4xl">▶</span>
        </button>
        <div className="text-center">
          <p className="text-xs font-black text-white drop-shadow-lg md:text-base">
            📡 실시간 영상 보기
          </p>
          <p className="mt-0.5 text-[9px] text-white/75 drop-shadow md:text-xs">
            클릭하면 7초마다 자동 전환되는 라이브
          </p>
        </div>
      </div>
      <div className="absolute bottom-2 left-2 rounded-full bg-black/40 px-2 py-0.5 text-[9px] font-bold text-white backdrop-blur-sm md:bottom-3 md:left-3 md:px-2.5 md:py-1 md:text-[11px]">
        📍 {cctvName}
      </div>
    </div>
  );
}

export function AutoRotateViewer() {
  const { favoriteIds: savedIds } = useCctvFavorite();
  const [index,     setIndex]     = useState(0);
  const [paused,    setPaused]    = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [activated, setActivated] = useState(false);
  const [tabHidden, setTabHidden] = useState(false); // 탭 숨김 동안 자동 전환 중지

  useEffect(() => {
    const onVis = () => setTabHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // 홈 회전뷰는 실시간 구독이 불필요 → 마운트 시 1회만 조회 (읽기 증폭 제거).
  // 영상은 워커에서 라이브 HLS로 받으므로 목록 캐시가 영상 신선도에 영향 없음.
  const [liveCctvs, setLiveCctvs] = useState<CctvEntry[]>(MOCK_INITIAL);
  useEffect(() => {
    const ids = [...HOME_ROTATE_IDS, ...savedIds]; // 화이트리스트 + 본인 찜
    fetchCctvsByIds(ids)
      .then((entries) => { if (entries.length > 0) setLiveCctvs(entries); })
      .catch(() => { /* 실패 시 mock 유지 */ });
  }, [savedIds]);

  // 홈 회전뷰는 고정 화이트리스트만 — 지정 순서대로, active한 것만
  const byId = new Map(liveCctvs.map((c) => [c.id, c]));
  const rotatable = HOME_ROTATE_IDS
    .map((id) => byId.get(id))
    .filter((c): c is CctvEntry => !!c && c.active !== false)
    .map((c) => ({ ...c, streamProxyUrl: streamProxyUrlFor(c.id) }));
  // 로그인 사용자가 직접 찜한 CCTV는 전체 목록에서 (본인 선택이므로 화이트리스트 무관)
  const savedCctvs = liveCctvs
    .filter((c) => savedIds.has(c.id) && c.active !== false)
    .map((c) => ({ ...c, streamProxyUrl: streamProxyUrlFor(c.id) }));
  const cctvs = savedCctvs.length > 0 ? savedCctvs : rotatable;
  const isPersonalized = savedCctvs.length > 0;
  const current = cctvs[index % cctvs.length];

  // 자동 전환: activated && !paused && 탭이 보일 때만
  useEffect(() => {
    if (!activated || paused || tabHidden || cctvs.length <= 1) return;
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
  }, [activated, paused, tabHidden, cctvs.length, index]);

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
              {/* ★ activated일 때만 실제 플레이어 mount, 아니면 플레이스홀더
                  클릭하면 정지 (다시 ▶ 누르면 재생) */}
              {activated ? (
                <button
                  type="button"
                  onClick={() => setActivated(false)}
                  className="group relative block h-full w-full overflow-hidden rounded-xl"
                  title="클릭하면 정지"
                >
                  <CrossfadePlayer
                    proxyUrl={current.streamProxyUrl}
                    cctvName={current.name}
                    cctvId={current.id}
                  />
                  {/* hover 시 정지 안내 */}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
                    <div className="flex flex-col items-center gap-1 rounded-2xl bg-black/60 px-4 py-3 backdrop-blur-sm">
                      <span className="text-3xl">⏸</span>
                      <span className="text-xs font-bold text-white">클릭하면 정지</span>
                    </div>
                  </div>
                </button>
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
