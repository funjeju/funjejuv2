"use client";

import { useState, useRef, useEffect, useMemo, type DragEvent } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/common/PageHeader";
import { useCctvs } from "@/hooks/useCctvs";
import { useSaved } from "@/hooks/useSaved";
import type { Cctv, CctvEntry } from "@/types/cctv";

type SlotCount = 1 | 2 | 4 | 6 | 9;

const PROXY_BASE = process.env.NEXT_PUBLIC_WORKER_URL || process.env.NEXT_PUBLIC_PROXY_URL || "";

/** CctvEntry(Firestore/mock 통합) → 멀티뷰 표시용 Cctv */
function toView(e: CctvEntry): Cctv {
  return {
    id: e.id,
    name: e.name,
    region: e.region,
    direction: e.direction,
    category: e.category,
    status: "실시간",
    description: e.description,
    latitude: e.lat ?? 0,
    longitude: e.lng ?? 0,
    isSaved: false,
    youtubeId: e.youtubeId,
    streamProxyUrl: e.youtubeId ? null : (PROXY_BASE ? `${PROXY_BASE}/cctv/${e.id}` : null),
  };
}

/** 유튜브형 슬롯 — embed iframe (재생 토글 시에만 로드) */
function YoutubeSlot({ cctv, onRemove, enabled }: { cctv: Cctv; onRemove: () => void; enabled: boolean }) {
  return (
    <div className="group relative h-full w-full overflow-hidden rounded-lg bg-gray-900">
      {enabled ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube.com/embed/${cctv.youtubeId}?autoplay=1&mute=1&playsinline=1&modestbranding=1&rel=0&controls=0&iv_load_policy=3&disablekb=1`}
          title={cctv.name}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-gray-900 text-white/50">
          <span className="text-2xl">▶</span>
          <span className="text-[10px]">일괄 재생 대기 중</span>
        </div>
      )}

      {/* YouTube 뱃지 */}
      {enabled && (
        <span className="absolute left-1.5 top-1.5 z-10 rounded-full bg-red-600 px-1.5 py-0.5 text-[7px] font-bold text-white shadow">
          ▶ LIVE
        </span>
      )}

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="absolute right-1 top-1 z-20 flex h-4 w-4 items-center justify-center rounded-full bg-black/50 text-[8px] leading-none text-white hover:bg-black/80 transition-colors"
        title="제거"
      >
        ✕
      </button>

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1">
        <p className="text-[8px] font-medium leading-tight text-white truncate">{cctv.name}</p>
      </div>
    </div>
  );
}

/** 단일 슬롯 플레이어 - 멀티뷰 전용
 *  initDelay: 봇 탐지 회피용 초기 지연 (0~3000ms 랜덤 권장)
 */
function SlotPlayer({ cctv, onRemove, initDelay = 0, enabled = true }: { cctv: Cctv | null; onRemove: () => void; initDelay?: number; enabled?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"loading" | "playing" | "error" | "waiting" | "idle">(
    !enabled ? "idle" : (initDelay > 0 ? "waiting" : "loading")
  );
  const [paused, setPaused] = useState(false);
  const [countdown, setCountdown] = useState(Math.ceil(initDelay / 1000));

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => { /* ignore */ });
      setPaused(false);
    } else {
      v.pause();
      setPaused(true);
    }
  }

  // 카운트다운 (대기 중일 때)
  useEffect(() => {
    if (status !== "waiting") return;
    const id = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      return;
    }
    if (!cctv?.streamProxyUrl || !videoRef.current) {
      if (cctv && !cctv.streamProxyUrl) setStatus("error");
      return;
    }

    const video = videoRef.current;
    let hls: import("hls.js").default | null = null;
    let cancelled = false;
    let delayTimerId: ReturnType<typeof setTimeout> | null = null;
    let stallTimerId: ReturnType<typeof setInterval> | null = null;
    let restartCount = 0;
    const MAX_RESTARTS = 5;
    const STALL_THRESHOLD = 8000; // 8초 동안 currentTime 변화 없으면 = 죽음

    // 초기 상태 설정
    setStatus(initDelay > 0 ? "waiting" : "loading");
    setCountdown(Math.ceil(initDelay / 1000));

    // 초기 지연 후 init 시작 (봇 탐지 회피)
    delayTimerId = setTimeout(() => {
      if (cancelled) return;
      setStatus("loading");
      init();
    }, initDelay);

    function hardRestart(reason: string) {
      if (cancelled) return;
      if (restartCount >= MAX_RESTARTS) {
        console.warn(`[SlotPlayer ${cctv?.id}] 재시도 한도 초과 (${reason})`);
        setStatus("error");
        return;
      }
      restartCount++;
      console.log(`[SlotPlayer ${cctv?.id}] 자동 재시작 #${restartCount} (${reason})`);
      setStatus("loading");
      try { hls?.destroy(); } catch { /* ignore */ }
      hls = null;
      setTimeout(() => { if (!cancelled) init(); }, 1500 + Math.random() * 1000);
    }

    async function init() {
      const Hls = (await import("hls.js")).default;
      if (cancelled) return;

      if (!Hls.isSupported()) {
        if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = cctv!.streamProxyUrl!;
          video.addEventListener("loadedmetadata", () => setStatus("playing"));
        }
        return;
      }

      hls = new Hls({
        enableWorker: true,
        maxBufferLength: 10,
        backBufferLength: 0,
        manifestLoadingMaxRetry: 6,
        levelLoadingMaxRetry: 6,
        fragLoadingMaxRetry: 6,
      });
      hls.loadSource(cctv!.streamProxyUrl!);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setStatus("playing");
        video.muted = true;
        video.play().catch(() => setStatus("error"));
      });

      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          // 네트워크 에러 → HLS.js 내장 재시도 + 재시작
          hardRestart("HLS NETWORK_ERROR");
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          try { hls?.recoverMediaError(); } catch { hardRestart("MEDIA recover failed"); }
        } else {
          hardRestart("HLS fatal");
        }
      });

      // ★ stalled 감지 — currentTime 8초간 변화 없으면 죽었다고 판단
      let lastTime = -1;
      let lastTick = Date.now();
      stallTimerId = setInterval(() => {
        if (cancelled || !video) return;
        if (video.paused) return; // 사용자가 일부러 정지한 거면 무시
        const now = Date.now();
        const t = video.currentTime;
        if (t !== lastTime) {
          lastTime = t;
          lastTick = now;
          return;
        }
        if (now - lastTick > STALL_THRESHOLD) {
          hardRestart(`stalled ${Math.floor((now - lastTick) / 1000)}s`);
          lastTick = now;
        }
      }, 2000);
    }

    return () => {
      cancelled = true;
      if (delayTimerId) clearTimeout(delayTimerId);
      if (stallTimerId) clearInterval(stallTimerId);
      hls?.destroy();
      if (video) {
        video.pause();
        video.removeAttribute("src");
        video.load();
      }
    };
  }, [cctv?.streamProxyUrl, initDelay, enabled]);

  return (
    <div className="group relative h-full w-full overflow-hidden rounded-lg bg-gray-900">
      <video ref={videoRef}
        onClick={togglePlay}
        className="h-full w-full object-cover cursor-pointer"
        playsInline muted preload="none" />

      {/* 정지 상태 — ▶ 표시 */}
      {paused && status === "playing" && (
        <button type="button" onClick={togglePlay}
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 hover:bg-black/60 transition-colors">
          <span className="text-3xl text-white">▶</span>
        </button>
      )}

      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </div>
      )}

      {status === "waiting" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-gray-900/80 text-white/70">
          <span className="text-xs">⏳ {countdown}초 후 시작</span>
        </div>
      )}

      {status === "idle" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-gray-900 text-white/50">
          <span className="text-2xl">▶</span>
          <span className="text-[10px]">일괄 재생 대기 중</span>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-gray-900 text-white/60">
          <span className="text-2xl">📡</span>
          <span className="text-[10px]">연결 실패</span>
        </div>
      )}

      {/* LIVE — 빨간 점만 */}
      {status === "playing" && (
        <span className="absolute left-1.5 top-1.5 h-2 w-2 rounded-full bg-live-red shadow-sm animate-pulse" />
      )}

      {/* X 버튼 — 1/3 크기 */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="absolute right-1 top-1 z-20 flex h-4 w-4 items-center justify-center rounded-full bg-black/50 text-[8px] leading-none text-white hover:bg-black/80 transition-colors"
        title="제거"
      >
        ✕
      </button>

      {/* 이름 — 절반 크기 */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1">
        <p className="text-[8px] font-medium leading-tight text-white truncate">{cctv?.name}</p>
      </div>
    </div>
  );
}

/** 빈 슬롯 - 드롭 영역 */
function EmptySlot({
  onDrop,
  isDragOver,
  setDragOver,
}: {
  onDrop: (id: string) => void;
  isDragOver: boolean;
  setDragOver: (v: boolean) => void;
}) {
  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const id = e.dataTransfer.getData("cctv-id");
    if (id) onDrop(id);
    setDragOver(false);
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={[
        "flex h-full w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-all",
        isDragOver
          ? "border-brand-orange bg-brand-orange/10 scale-[0.98]"
          : "border-border-soft bg-bg-secondary/40",
      ].join(" ")}
    >
      <span className="text-xl opacity-30 md:text-3xl">📺</span>
      <p className="hidden text-xs text-text-secondary md:block">
        CCTV를 끌어다 놓으세요
      </p>
    </div>
  );
}

export default function MultiviewPage() {
  const { savedIds } = useSaved();
  const { cctvs } = useCctvs(); // 목록 페이지와 같은 소스 (Firestore + mock 폴백)
  const allCctvs = useMemo(() => cctvs.map(toView), [cctvs]);
  const [slotCount, setSlotCount] = useState<SlotCount>(4);
  const [slots, setSlots] = useState<(string | null)[]>(Array(9).fill(null));
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false); // 일괄 재생 토글
  const gridRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  function toggleFullscreen() {
    if (!gridRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      gridRef.current.requestFullscreen().catch(() => {});
    }
  }

  // 봇 탐지 회피: 같은 IP에서 9개 동시 연결 피하기 위해 슬롯별 지연
  // 한 번 init 완료된 CCTV는 다음 번 즉시 로드 (재이동 시 사용자 답답함 방지)
  const initDelaysRef = useRef<Set<string>>(new Set());
  const sessionStartRef = useRef<number>(Date.now());

  function getInitDelay(cctvId: string, slotIndex: number): number {
    if (initDelaysRef.current.has(cctvId)) return 0; // 이미 본 영상 → 즉시
    initDelaysRef.current.add(cctvId);

    const sinceStart = Date.now() - sessionStartRef.current;
    if (sinceStart < 2000) {
      // 일괄 재생 직후 = 슬롯 인덱스 기반 (0초, 0.8초, 1.6초, ... 사람처럼)
      return slotIndex * 800 + Math.floor(Math.random() * 500);
    }
    // 추후 드래그로 추가 = 0~1초 랜덤
    return Math.floor(Math.random() * 1000);
  }

  function togglePlayAll() {
    if (!playing) {
      // 재생 시작 → sessionStart 리셋 + delay 캐시 리셋 → 순차 로딩
      sessionStartRef.current = Date.now();
      initDelaysRef.current = new Set();
    }
    setPlaying(!playing);
  }

  // 저장된 CCTV 우선, 없으면 전체
  const availableCctvs = savedIds.size > 0
    ? allCctvs.filter((c) => savedIds.has(c.id))
    : allCctvs;

  // localStorage에서 슬롯 상태 복원
  useEffect(() => {
    const stored = localStorage.getItem("multiview_slots");
    if (stored) {
      try { setSlots(JSON.parse(stored)); } catch { /* ignore */ }
    }
    const storedCount = localStorage.getItem("multiview_slot_count");
    if (storedCount) setSlotCount(Number(storedCount) as SlotCount);
  }, []);

  // 슬롯 상태 저장
  useEffect(() => {
    localStorage.setItem("multiview_slots", JSON.stringify(slots));
  }, [slots]);
  useEffect(() => {
    localStorage.setItem("multiview_slot_count", String(slotCount));
  }, [slotCount]);

  function handleDrop(idx: number, cctvId: string) {
    setSlots((prev) => {
      const next = [...prev];
      // 이미 다른 슬롯에 있으면 그 슬롯과 스왑
      const existingIdx = next.findIndex((id) => id === cctvId);
      if (existingIdx !== -1) {
        next[existingIdx] = next[idx];
      }
      next[idx] = cctvId;
      return next;
    });
  }

  function removeSlot(idx: number) {
    setSlots((prev) => {
      const next = [...prev];
      next[idx] = null;
      return next;
    });
  }

  function clearAll() {
    setSlots(Array(9).fill(null));
  }

  function autoFill() {
    // 사용 가능한 CCTV를 빈 슬롯에 자동 배치
    const usedIds = new Set(slots.filter(Boolean));
    const available = availableCctvs.filter((c) => !usedIds.has(c.id));
    setSlots((prev) => {
      const next = [...prev];
      let availIdx = 0;
      for (let i = 0; i < slotCount; i++) {
        if (!next[i] && availIdx < available.length) {
          next[i] = available[availIdx].id;
          availIdx++;
        }
      }
      return next;
    });
  }

  // 그리드 클래스 결정
  const gridClass = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    4: "grid-cols-2",
    6: "grid-cols-3",
    9: "grid-cols-3",
  }[slotCount];

  const aspectClass = slotCount === 1 ? "aspect-video" : "aspect-video";

  return (
    <div className="mx-auto max-w-screen-xl px-0 md:px-4 md:py-6">
      <PageHeader
        title="멀티뷰"
        subtitle="여러 CCTV를 동시에 시청하세요"
        emoji="📺"
        right={
          <Link href="/cctv" className="text-xs font-medium text-brand-orange">
            ← CCTV 목록
          </Link>
        }
      />

      {/* 컨트롤 바 */}
      <div className="mx-4 mb-3 space-y-1.5 rounded-2xl border border-border-soft bg-bg-card p-1.5 shadow-card md:mx-0 md:flex md:flex-wrap md:items-center md:gap-2 md:space-y-0 md:p-3">
        {/* 분할 선택 */}
        <div className="grid grid-cols-5 gap-0.5 rounded-full bg-bg-secondary p-0.5 md:flex md:items-center md:gap-1 md:p-1">
          {([1, 2, 4, 6, 9] as SlotCount[]).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setSlotCount(n)}
              className={[
                "rounded-full px-1 py-0.5 text-[10px] font-bold transition-colors md:px-3 md:py-1 md:text-xs",
                slotCount === n
                  ? "bg-brand-navy text-white shadow"
                  : "text-text-secondary hover:text-text-primary",
              ].join(" ")}
            >
              {n}<span className="hidden md:inline">분할</span>
            </button>
          ))}
        </div>
        {/* 액션 4칸 — 모바일은 아이콘 없이 글자만 7px */}
        <div className="grid grid-cols-4 gap-0.5 md:ml-auto md:flex md:gap-2">
          <button
            type="button"
            onClick={togglePlayAll}
            className={[
              "rounded-full px-0.5 py-1 text-[10px] font-bold text-white transition-colors md:px-3 md:py-1.5 md:text-xs",
              playing
                ? "bg-live-red hover:bg-live-red/90"
                : "bg-jeju-green hover:bg-jeju-green/90",
            ].join(" ")}
          >
            <span className="md:hidden">{playing ? "정지" : "재생"}</span>
            <span className="hidden md:inline">{playing ? "⏸ 정지" : "▶ 재생"}</span>
          </button>
          <button
            type="button"
            onClick={autoFill}
            className="rounded-full bg-brand-orange px-0.5 py-1 text-[10px] font-bold text-white hover:bg-brand-orange/90 transition-colors md:px-3 md:py-1.5 md:text-xs"
          >
            <span className="md:hidden">채우기</span>
            <span className="hidden md:inline">⚡ 자동 채우기</span>
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="rounded-full border border-border-soft bg-bg-secondary px-0.5 py-1 text-[10px] font-semibold text-text-secondary hover:bg-bg-primary transition-colors md:px-3 md:py-1.5 md:text-xs"
          >
            <span className="md:hidden">비우기</span>
            <span className="hidden md:inline">🗑 전체 비우기</span>
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="rounded-full bg-brand-navy px-0.5 py-1 text-[10px] font-bold text-white hover:bg-brand-navy/90 transition-colors md:px-3 md:py-1.5 md:text-xs"
            title="전체화면"
          >
            <span className="md:hidden">{isFullscreen ? "종료" : "전체"}</span>
            <span className="hidden md:inline">{isFullscreen ? "⛶ 종료" : "⛶ 전체화면"}</span>
          </button>
        </div>
      </div>

      {/* 멀티뷰 그리드 — 모바일 여백·간격 최소화 */}
      <div className="mb-5 md:mx-0">
        <div
          ref={gridRef}
          className={[
            "grid gap-0.5 md:gap-2",
            gridClass,
            isFullscreen ? "h-screen w-screen bg-black p-1" : "",
          ].join(" ")}
        >
          {Array.from({ length: slotCount }).map((_, idx) => {
            const cctvId = slots[idx];
            const cctv = cctvId ? allCctvs.find((c) => c.id === cctvId) ?? null : null;
            const isDragOver = dragOverIdx === idx;
            return (
              <div
                key={idx}
                className={`${aspectClass} relative transition-all ${isDragOver ? "ring-4 ring-brand-orange ring-offset-2" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx); }}
                onDragLeave={() => setDragOverIdx(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("cctv-id");
                  if (id) handleDrop(idx, id);
                  setDragOverIdx(null);
                }}
              >
                {cctv?.youtubeId ? (
                  <YoutubeSlot
                    cctv={cctv}
                    onRemove={() => removeSlot(idx)}
                    enabled={playing}
                  />
                ) : cctv ? (
                  <SlotPlayer
                    cctv={cctv}
                    onRemove={() => removeSlot(idx)}
                    initDelay={playing && cctv ? getInitDelay(cctv.id, idx) : 0}
                    enabled={playing}
                  />
                ) : (
                  <EmptySlot
                    onDrop={(id) => handleDrop(idx, id)}
                    isDragOver={isDragOver}
                    setDragOver={(v) => setDragOverIdx(v ? idx : null)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 드래그 소스 목록 */}
      <div className="mx-4 rounded-2xl border border-border-soft bg-bg-card p-4 shadow-card md:mx-0">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-text-primary">
            {savedIds.size > 0 ? "내 즐겨찾기 CCTV" : "전체 CCTV"}
            <span className="ml-2 text-xs font-medium text-text-secondary">
              · 드래그해서 슬롯에 넣으세요
            </span>
          </h2>
          {savedIds.size === 0 && (
            <Link href="/cctv" className="text-[11px] text-brand-orange font-medium">
              ⭐ 즐겨찾기 추가하기
            </Link>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-6">
          {availableCctvs.map((cctv) => {
            // 현재 활성 슬롯 수까지만 체크 (9분할→2분할 변경 시 옛 슬롯 무시)
            const inUse = slots.slice(0, slotCount).includes(cctv.id);
            return (
              <div
                key={cctv.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("cctv-id", cctv.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                className={[
                  "cursor-grab rounded-lg border border-border-soft bg-bg-secondary p-2 transition-all active:cursor-grabbing active:scale-95",
                  inUse ? "opacity-40" : "hover:border-brand-orange hover:bg-brand-orange/5",
                ].join(" ")}
              >
                <div className="relative flex aspect-video items-center justify-center rounded bg-gray-800 text-2xl">
                  🏝️
                  {cctv.youtubeId && (
                    <span className="absolute left-1 top-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[7px] font-bold text-white">
                      ▶ YouTube
                    </span>
                  )}
                </div>
                <p className="mt-1.5 truncate text-[11px] font-semibold text-text-primary">
                  {cctv.name}
                </p>
                <p className="truncate text-[9px] text-text-secondary">{cctv.region}</p>
                {inUse && (
                  <p className="text-[9px] font-bold text-brand-orange">✓ 시청 중</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 안내 */}
      <div className="mx-4 mt-4 rounded-2xl bg-brand-yellow/20 border border-brand-yellow/30 p-3 text-center md:mx-0">
        <p className="text-xs font-medium text-text-primary">
          향후 멀티뷰는 프리미엄 회원 전용 기능이 될 예정이에요. 지금은 모두 무료!
        </p>
      </div>
    </div>
  );
}
