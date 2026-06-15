"use client";

import { useState, useRef, useEffect, useMemo, type DragEvent } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/common/PageHeader";
import { ShareButton } from "@/components/common/ShareButton";
import { useCctvs } from "@/hooks/useCctvs";
import { useCctvFavorite } from "@/hooks/useCctvFavorite";
import { useWatchBudget, fmtDuration, type WatchBudgetResult } from "@/hooks/useWatchBudget";
import { useCctvSession } from "@/hooks/useCctvSession";
import { BetaPlanNotice } from "@/components/common/BetaPlanNotice";
import type { Cctv, CctvEntry } from "@/types/cctv";
import { isMultiviewExcluded } from "@/constants/vurix";

// 멀티뷰 최대 분할 — 안정성·대역폭 위해 4분할로 제한 (모든 사용자)
const PUBLIC_MAX_SPLIT = 4;

// 분할 수에 맞는 격자 미리보기 아이콘 (1·2·4·6·9분할 레이아웃 그대로 표현)
function SplitIcon({ n, active }: { n: number; active: boolean }) {
  const cols = n <= 1 ? 1 : n <= 4 ? 2 : 3;
  const rows = Math.ceil(n / cols);
  return (
    <span
      className="grid gap-[1.5px]"
      style={{
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        width: 15,
        height: 15,
      }}
    >
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} className={`rounded-[1.5px] ${active ? "bg-white" : "bg-current opacity-70"}`} />
      ))}
    </span>
  );
}

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
    let recoveryTimerId: ReturnType<typeof setTimeout> | null = null;
    let restartCount = 0;
    const MAX_RESTARTS = 5;
    const STALL_THRESHOLD = 8000; // 8초 동안 currentTime 변화 없으면 = 죽음
    const RECOVERY_INTERVAL = 60_000; // 연결 실패 후 1분마다 조용히 재시도 (origin 복구 감지)

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
        console.warn(`[SlotPlayer ${cctv?.id}] 재시도 한도 초과 (${reason}) → 1분 후 재시도 예약`);
        setStatus("error");
        // 5번 즉시 재시도 실패 → "연결 실패" 표시 후 1분마다 조용히 재시도.
        // origin이 되살아나면 자동 부활. 슬롯 삭제/교체 시 cleanup에서 멈춤.
        if (recoveryTimerId) clearTimeout(recoveryTimerId);
        recoveryTimerId = setTimeout(() => {
          if (cancelled) return;
          restartCount = 0;
          setStatus("loading");
          init();
        }, RECOVERY_INTERVAL);
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

      // ★ 이전 hls 인스턴스 강제 정리 — recovery/재시도에서 destroy 없이 new Hls()하면
      // 죽은 디코더·버퍼가 계속 쌓여(누수) 14시간쯤 뒤 처음 켠 스트림부터 죽음.
      if (hls) { try { hls.destroy(); } catch { /* */ } hls = null; }

      if (!Hls.isSupported()) {
        if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = cctv!.streamProxyUrl!;
          video.addEventListener("loadedmetadata", () => setStatus("playing"));
        }
        return;
      }

      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        // ★ "실시간에 가까운 CCTV 뷰어"(15~20초 지연 허용) 전략:
        // 라이브 끝단이 아니라 3세그먼트 뒤에서 재생 → 시청자들이 같은 ts를 봐서 캐시 HIT 급상승(서버 부하↓).
        // 앞 버퍼는 넉넉히(jitter 흡수→stall=reconnect 감소), 과거 버퍼는 0(누적 차단).
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 10,
        maxBufferLength: 10,
        maxMaxBufferLength: 18,
        maxBufferSize: 12 * 1000 * 1000, // 12MB 캡 (대용량 세그먼트 메모리 방어)
        backBufferLength: 0,
        maxFragLookUpTolerance: 0.5,
        manifestLoadingMaxRetry: 4,
        levelLoadingMaxRetry: 4,
        fragLoadingMaxRetry: 4,
        fragLoadingRetryDelay: 800,
      });
      hls.loadSource(cctv!.streamProxyUrl!);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setStatus("playing");
        video.muted = true;
        video.play().catch(() => setStatus("error"));
      });

      let netErrSoft = 0;
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          // ★ 디코더 세션 유지하며 가볍게 재개(startLoad) — destroy+new Hls()는 새 디코더를 만들어
          // 다른 스트림 디코더를 밀어내는 cascade를 일으킴. 2회까지 가볍게, 그래도 안 되면 전체 재시작.
          if (netErrSoft < 2) {
            netErrSoft++;
            try { hls?.startLoad(); } catch { hardRestart("network softfail"); }
          } else {
            netErrSoft = 0;
            hardRestart("HLS NETWORK_ERROR");
          }
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          try { hls?.recoverMediaError(); } catch { hardRestart("MEDIA recover failed"); }
        } else {
          hardRestart("HLS fatal");
        }
      });

      // ★ stalled 감지 — 먼저 가벼운 재개(startLoad)로 시도, 그래도 안 되면 전체 재시작.
      // (9분할 동시 부하 때 stall마다 전체 재로딩하면 요청 폭주 → 악순환이라 단계적 회복)
      let lastTime = -1;
      let lastTick = Date.now();
      let softTries = 0;
      stallTimerId = setInterval(() => {
        if (cancelled || !video) return;
        if (video.paused) return; // 사용자가 일부러 정지한 거면 무시
        const now = Date.now();
        const t = video.currentTime;
        if (t !== lastTime) {
          lastTime = t;
          lastTick = now;
          softTries = 0;
          return;
        }
        if (now - lastTick > STALL_THRESHOLD) {
          if (softTries < 2) {
            softTries++;
            try { hls?.startLoad(); } catch { /* */ }
            video.play().catch(() => { /* */ });
          } else {
            hardRestart(`stalled ${Math.floor((now - lastTick) / 1000)}s`);
            softTries = 0;
          }
          lastTick = now;
        }
      }, 2000);
    }

    // 탭 전환/앱 백그라운드 — 즉시 정지 + 다운로드 중단, 복귀 시 자동 재개
    let pausedByHidden = false;
    const handleVisibility = () => {
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
      if (delayTimerId) clearTimeout(delayTimerId);
      if (stallTimerId) clearInterval(stallTimerId);
      if (recoveryTimerId) clearTimeout(recoveryTimerId);
      document.removeEventListener("visibilitychange", handleVisibility);
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
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-gray-900 px-2 text-center text-white/60">
          <span className="text-2xl">📡</span>
          <span className="text-[10px]">연결 실패</span>
          <span className="text-[9px] text-white/40">1분 후 다시 연결을 시도합니다</span>
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
  onPick,
  isDragOver,
  setDragOver,
}: {
  onDrop: (id: string) => void;
  onPick: () => void;
  isDragOver: boolean;
  setDragOver: (v: boolean) => void;
}) {
  function handleDrop(e: DragEvent<HTMLButtonElement>) {
    e.preventDefault();
    const id = e.dataTransfer.getData("cctv-id");
    if (id) onDrop(id);
    setDragOver(false);
  }

  return (
    <button
      type="button"
      onClick={onPick}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={[
        "flex h-full w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed transition-all",
        isDragOver
          ? "border-brand-orange bg-brand-orange/10 scale-[0.98]"
          : "border-border-soft bg-bg-secondary/40 hover:border-brand-orange hover:bg-brand-orange/5",
      ].join(" ")}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-orange/15 text-xl font-bold text-brand-orange md:h-10 md:w-10 md:text-2xl">+</span>
      <p className="text-[9px] text-text-secondary md:text-xs">탭해서 CCTV 추가</p>
    </button>
  );
}

export default function MultiviewPage() {
  const { favoriteIds: savedIds } = useCctvFavorite();
  const { cctvs } = useCctvs(); // 목록 페이지와 같은 소스 (Firestore + mock 폴백)
  // vurix + 간헐적 rtmp(모슬포·대포·논짓물)는 멀티뷰에서 제외 (개별 화면으로만)
  const allCctvs = useMemo(() => cctvs.map(toView).filter((c) => !isMultiviewExcluded(c.id)), [cctvs]);
  const [slotCount, setSlotCount] = useState<SlotCount>(4);
  const [slots, setSlots] = useState<(string | null)[]>(Array(9).fill(null));
  const [presets, setPresets] = useState<{ name: string; slots: (string | null)[] }[]>([]);
  const [rotating, setRotating] = useState(false);   // 프리셋 자동 순환(디스플레이 모드)
  const [rotateSec, setRotateSec] = useState(60);    // 전환 간격(초) — 짧을수록 재초기화 부담↑이라 30초 이상만
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [pickerIdx, setPickerIdx] = useState<number | null>(null); // + 버튼으로 연 슬롯
  const [playing, setPlaying] = useState(false); // 일괄 재생 토글
  const gridRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pseudoFs, setPseudoFs] = useState(false); // iOS 등 네이티브 전체화면 미지원 시 CSS 꽉채움 폴백
  const [tabHidden, setTabHidden] = useState(false); // 탭 숨김 동안 시청예산 차감 중지

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    const onVis = () => setTabHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  function toggleFullscreen() {
    const el = gridRef.current;
    if (!el) return;
    // iOS Safari는 div.requestFullscreen 미지원 → CSS 유사 전체화면으로 폴백
    const canNative = typeof el.requestFullscreen === "function" && document.fullscreenEnabled;
    if (pseudoFs) { setPseudoFs(false); return; }
    if (document.fullscreenElement) { document.exitFullscreen().catch(() => {}); return; }
    if (canNative) {
      el.requestFullscreen().catch(() => setPseudoFs(true));
    } else {
      setPseudoFs(true);
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

  // ── 시청시간 예산 (우리 워커 경유 HLS 스트림만 차감, 유튜브 제외) ──
  const activeHlsStreams = useMemo(() => {
    if (!playing) return 0;
    return slots.slice(0, slotCount).filter((id) => {
      if (!id) return false;
      const c = allCctvs.find((x) => x.id === id);
      return !!c && !c.youtubeId;
    }).length;
  }, [playing, slots, slotCount, allCctvs]);

  // 서버 시청예산 — 멀티뷰는 분할 수만큼 차감 (activeStreams = 동시 HLS 스트림 수)
  const [serverBudget, setServerBudget] = useState<WatchBudgetResult | null>(null);
  const sessionActive = playing && activeHlsStreams > 0 && !tabHidden;
  useCctvSession({
    cctvId: sessionActive ? "__multiview__" : null,
    cctvName: "멀티뷰",
    isPlaying: sessionActive,
    activeStreams: activeHlsStreams,
    onBudget: setServerBudget,
  });

  const budget = useWatchBudget(sessionActive ? activeHlsStreams : 0, serverBudget);

  // 소진되면 재생 자동 정지
  useEffect(() => {
    if (budget.exhausted && playing) setPlaying(false);
  }, [budget.exhausted, playing]);

  // 멀티뷰는 4분할까지로 제한 (안정성·대역폭). 모든 사용자 동일.
  const effectiveMaxSplit = Math.min(budget.maxSplit, PUBLIC_MAX_SPLIT);

  // 한도 초과 분할은 강제로 낮춤 (비회원 1분할 / 일반 사용자 6·9 차단)
  useEffect(() => {
    if (slotCount > effectiveMaxSplit) {
      setSlotCount(effectiveMaxSplit as SlotCount);
    }
  }, [effectiveMaxSplit, slotCount]);

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

  // ── 프리셋: 현재 4분할 조합을 이름 붙여 저장·불러오기 (localStorage) ──
  useEffect(() => {
    const p = localStorage.getItem("multiview_presets");
    if (p) { try { setPresets(JSON.parse(p)); } catch { /* ignore */ } }
  }, []);
  function persistPresets(next: { name: string; slots: (string | null)[] }[]) {
    setPresets(next);
    localStorage.setItem("multiview_presets", JSON.stringify(next));
  }
  function savePreset() {
    const chosen = slots.slice(0, 4).filter(Boolean);
    if (chosen.length === 0) { alert("먼저 슬롯에 CCTV를 채워주세요."); return; }
    const name = prompt("이 조합 이름 (예: 노을 4종)")?.trim();
    if (!name) return;
    const slots4 = slots.slice(0, 4);
    persistPresets([...presets.filter((p) => p.name !== name), { name, slots: slots4 }].slice(-12));
  }
  function loadPreset(p: { name: string; slots: (string | null)[] }) {
    setSlotCount(4);
    setSlots([...p.slots.slice(0, 4), ...Array(5).fill(null)]);
  }
  function deletePreset(name: string) {
    persistPresets(presets.filter((p) => p.name !== name));
  }

  // 프리셋 자동 순환 — rotating ON이면 일정 간격으로 다음 프리셋 로드 (매장 디스플레이용)
  useEffect(() => {
    if (!rotating || presets.length < 2) return;
    let i = 0;
    const apply = (idx: number) => {
      const p = presets[idx];
      if (!p) return;
      setSlotCount(4);
      setSlots([...p.slots.slice(0, 4), ...Array(5).fill(null)]);
    };
    setPlaying(true);
    apply(0);
    const t = setInterval(() => {
      i = (i + 1) % presets.length;
      apply(i);
    }, Math.max(5, rotateSec) * 1000);
    return () => clearInterval(t);
  }, [rotating, rotateSec, presets]);

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

  // 전체화면에선 셀을 aspect 고정 대신 화면을 균등하게 채운다 (안드로이드 세로화면 잘림·어긋남 방지)
  const colCount = { 1: 1, 2: 2, 4: 2, 6: 3, 9: 3 }[slotCount] ?? 2;
  const rowCount = Math.ceil(slotCount / colCount);
  const fsActive = isFullscreen || pseudoFs;

  return (
    <div className="mx-auto max-w-screen-xl px-0 md:px-4 md:py-6">
      <PageHeader
        title="멀티뷰"
        subtitle="여러 CCTV를 동시에 시청하세요"
        emoji="📺"
        right={
          <div className="flex items-center gap-2">
            <ShareButton
              title="제주 멀티뷰 — 실시간 CCTV 동시 시청 | 펀제주"
              url="https://www.funjeju.com/cctv/multiview"
              description="여러 제주 CCTV를 한 화면에서 동시에 보세요"
              compact
            />
            <Link href="/cctv" className="text-xs font-medium text-brand-orange">
              ← CCTV 목록
            </Link>
          </div>
        }
      />

      {/* 컨트롤 바 */}
      <div className="mx-4 mb-3 space-y-1.5 rounded-2xl border border-border-soft bg-bg-card p-1.5 shadow-card md:mx-0 md:flex md:flex-wrap md:items-center md:gap-2 md:space-y-0 md:p-3">
        {/* 분할 선택 — 플랜 한도 초과는 잠금 */}
        <div className="flex gap-1 rounded-2xl bg-bg-secondary p-1 md:items-center md:gap-1.5">
          {(([1, 2, 4]) as SlotCount[]).map((n) => {
            const locked = n > effectiveMaxSplit;
            const selected = slotCount === n;
            return (
              <button
                key={n}
                type="button"
                disabled={locked}
                onClick={() => setSlotCount(n)}
                title={locked ? `${budget.maxSplit}분할까지 가능해요 (요금제 업그레이드 시 확장)` : `${n}분할`}
                className={[
                  "flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-1.5 font-bold transition-colors md:flex-none md:px-3.5 md:py-2",
                  selected
                    ? "bg-brand-navy text-white shadow"
                    : locked
                      ? "text-text-secondary/30 cursor-not-allowed"
                      : "text-text-secondary hover:bg-bg-card hover:text-text-primary",
                ].join(" ")}
              >
                {locked ? (
                  <span className="flex h-[15px] w-[15px] items-center justify-center text-[13px] leading-none">🔒</span>
                ) : (
                  <SplitIcon n={n} active={selected} />
                )}
                <span className="text-[10px] leading-none md:text-[11px]">{n}분할</span>
              </button>
            );
          })}
        </div>

        {/* 프리셋 — 내 4분할 조합 저장·불러오기 */}
        <div className="flex min-w-0 items-center gap-1 overflow-x-auto no-scrollbar md:flex-1">
          <button
            type="button"
            onClick={savePreset}
            className="flex shrink-0 items-center gap-0.5 rounded-full bg-brand-orange/10 px-2.5 py-1 text-[11px] font-bold text-brand-orange hover:bg-brand-orange/20 transition-colors"
            title="현재 4분할 조합을 프리셋으로 저장"
          >
            💾 조합 저장
          </button>
          {presets.map((p) => (
            <span key={p.name} className="flex shrink-0 items-center rounded-full border border-border-soft bg-bg-secondary pl-2.5 text-[11px] font-semibold text-text-secondary">
              <button type="button" onClick={() => loadPreset(p)} className="py-1 hover:text-brand-navy" title="이 조합 불러오기">⭐ {p.name}</button>
              <button type="button" onClick={() => deletePreset(p.name)} className="px-1.5 py-1 text-text-secondary/50 hover:text-live-red" title="삭제">✕</button>
            </span>
          ))}
          {/* 자동 순환 (프리셋 2개 이상) */}
          {presets.length >= 2 && (
            <span className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setRotating((r) => !r)}
                className={[
                  "rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors",
                  rotating ? "bg-brand-navy text-white" : "bg-bg-secondary text-text-secondary hover:text-brand-navy",
                ].join(" ")}
                title="저장한 프리셋을 일정 간격으로 자동 전환"
              >
                {rotating ? "⏸ 순환중" : "🔄 자동순환"}
              </button>
              <select
                value={rotateSec}
                onChange={(e) => setRotateSec(Number(e.target.value))}
                className="rounded-full border border-border-soft bg-bg-card px-1.5 py-1 text-[11px] font-semibold text-text-secondary"
              >
                <option value={30}>30초</option>
                <option value={60}>1분</option>
                <option value={120}>2분</option>
                <option value={180}>3분</option>
              </select>
            </span>
          )}
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
            <span className="md:hidden">{(isFullscreen || pseudoFs) ? "종료" : "전체"}</span>
            <span className="hidden md:inline">{(isFullscreen || pseudoFs) ? "⛶ 종료" : "⛶ 전체화면"}</span>
          </button>
        </div>
      </div>

      {/* 베타 안내 — 정식 오픈 시 요금제 적용 */}
      <div className="mx-4 mb-3 md:mx-0">
        <BetaPlanNotice />
      </div>

      {/* 어드민/무제한 — 차단 없이 오늘 누적 사용량 위로 카운트 */}
      {budget.unlimited && budget.usedSeconds > 0 && (
        <div className="mx-4 mb-3 md:mx-0">
          <div className="flex items-center gap-2 rounded-2xl border border-brand-navy/20 bg-brand-navy/5 px-4 py-2">
            <span className="text-sm">⏱</span>
            <p className="flex-1 text-[11px] text-text-secondary">
              오늘 누적 시청{" "}
              <span className="font-black text-brand-navy">{fmtDuration(budget.usedSeconds)}</span>
              {activeHlsStreams > 1 && (
                <span className="ml-1 text-text-secondary">· 지금 {activeHlsStreams}배속 누적</span>
              )}
              <span className="ml-1 text-text-secondary/70">(어드민 · 무제한)</span>
            </p>
          </div>
        </div>
      )}

      {/* 시청시간 예산 바 */}
      {!budget.unlimited && (
        <div className="mx-4 mb-3 md:mx-0">
          {budget.exhausted ? (
            <div className="flex items-center gap-2 rounded-2xl border border-live-red/30 bg-live-red/5 px-4 py-3">
              <span className="text-lg">⏳</span>
              <p className="flex-1 text-[11px] leading-5 text-text-primary">
                오늘 시청시간을 다 썼어요! 내일 다시 충전돼요.
                {/* 정식 요금제 확정 전까지 임시 숨김
                <Link href="/pricing" className="ml-1 font-bold text-brand-orange">더 길게 보려면 →</Link> */}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-2xl border border-border-soft bg-bg-card px-4 py-2 shadow-card">
              <span className="text-sm">⏱</span>
              <p className="flex-1 text-[11px] text-text-secondary">
                오늘 남은 시청시간{" "}
                <span className="font-black text-brand-navy">{fmtDuration(budget.remainingSeconds)}</span>
                {activeHlsStreams > 1 && (
                  <span className="ml-1 text-text-secondary">· 지금 {activeHlsStreams}배 차감 중</span>
                )}
              </p>
              {/* 정식 요금제 확정 전까지 임시 숨김
              <Link href="/pricing" className="shrink-0 text-[10px] font-bold text-brand-orange">늘리기</Link> */}
            </div>
          )}
        </div>
      )}

      {/* 멀티뷰 그리드 — 모바일 여백·간격 최소화 */}
      <div className="mb-5 md:mx-0">
        <div
          ref={gridRef}
          className={[
            "grid gap-0.5 md:gap-2",
            gridClass,
            isFullscreen ? "h-[100dvh] w-screen bg-black p-1" : "",
            pseudoFs ? "fixed inset-0 z-[100] h-[100dvh] w-screen overflow-hidden bg-black p-1" : "",
          ].join(" ")}
          style={fsActive ? { gridTemplateRows: `repeat(${rowCount}, 1fr)` } : undefined}
        >
          {pseudoFs && (
            <button
              type="button"
              onClick={() => setPseudoFs(false)}
              className="fixed right-3 top-3 z-[110] rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold text-white backdrop-blur"
            >
              ⛶ 종료
            </button>
          )}
          {Array.from({ length: slotCount }).map((_, idx) => {
            const cctvId = slots[idx];
            const cctv = cctvId ? allCctvs.find((c) => c.id === cctvId) ?? null : null;
            const isDragOver = dragOverIdx === idx;
            return (
              <div
                key={idx}
                className={`${fsActive ? "h-full min-h-0" : aspectClass} relative transition-all ${isDragOver ? "ring-4 ring-brand-orange ring-offset-2" : ""}`}
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
                    onPick={() => setPickerIdx(idx)}
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

      {/* CCTV 선택 모달 (+ 버튼) */}
      {pickerIdx !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-center"
          onClick={() => setPickerIdx(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-bg-card shadow-2xl md:rounded-3xl"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border-soft px-5 py-4">
              <h2 className="text-sm font-black text-text-primary">📺 {pickerIdx + 1}번 칸에 넣을 CCTV</h2>
              <button type="button" onClick={() => setPickerIdx(null)} className="text-2xl text-text-secondary hover:text-text-primary">×</button>
            </div>
            <div className="grid grid-cols-2 gap-2 overflow-y-auto p-4 sm:grid-cols-3">
              {availableCctvs.map((cctv) => {
                const inUse = slots.slice(0, slotCount).includes(cctv.id);
                return (
                  <button
                    key={cctv.id}
                    type="button"
                    onClick={() => { handleDrop(pickerIdx, cctv.id); setPickerIdx(null); }}
                    className={[
                      "rounded-lg border border-border-soft bg-bg-secondary p-2 text-left transition-all hover:border-brand-orange hover:bg-brand-orange/5",
                      inUse ? "opacity-50" : "",
                    ].join(" ")}
                  >
                    <div className="relative flex aspect-video items-center justify-center rounded bg-gray-800 text-2xl">
                      🏝️
                      {cctv.youtubeId && (
                        <span className="absolute left-1 top-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[7px] font-bold text-white">▶ YouTube</span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-[11px] font-semibold text-text-primary">{cctv.name}</p>
                    <p className="truncate text-[9px] text-text-secondary">{cctv.region}{inUse ? " · 시청 중" : ""}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
