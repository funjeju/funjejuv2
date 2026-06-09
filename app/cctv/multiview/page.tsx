"use client";

import { useState, useRef, useEffect, type DragEvent } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/common/PageHeader";
import { mockCctvs } from "@/constants/mock-cctvs";
import { useSaved } from "@/hooks/useSaved";
import type { Cctv } from "@/types/cctv";

type SlotCount = 1 | 2 | 4 | 6 | 9;

/** 단일 슬롯 플레이어 - 멀티뷰 전용 */
function SlotPlayer({ cctv, onRemove }: { cctv: Cctv | null; onRemove: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"loading" | "playing" | "error">("loading");
  const [paused, setPaused] = useState(false);

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

  useEffect(() => {
    if (!cctv?.streamProxyUrl || !videoRef.current) {
      if (cctv && !cctv.streamProxyUrl) setStatus("error");
      return;
    }

    setStatus("loading");
    const video = videoRef.current;
    let hls: import("hls.js").default | null = null;

    async function init() {
      const Hls = (await import("hls.js")).default;

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
      });
      hls.loadSource(cctv!.streamProxyUrl!);
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
      if (video) {
        video.pause();
        video.removeAttribute("src");
        video.load();
      }
    };
  }, [cctv?.streamProxyUrl]);

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
  const [slotCount, setSlotCount] = useState<SlotCount>(4);
  const [slots, setSlots] = useState<(string | null)[]>(Array(9).fill(null));
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // 저장된 CCTV 우선, 없으면 전체
  const availableCctvs = savedIds.size > 0
    ? mockCctvs.filter((c) => savedIds.has(c.id))
    : mockCctvs;

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
      <div className="mx-4 mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-border-soft bg-bg-card p-3 shadow-card md:mx-0">
        <div className="flex items-center gap-1 rounded-full bg-bg-secondary p-1">
          {([1, 2, 4, 6, 9] as SlotCount[]).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setSlotCount(n)}
              className={[
                "rounded-full px-3 py-1 text-xs font-bold transition-colors",
                slotCount === n
                  ? "bg-brand-navy text-white shadow"
                  : "text-text-secondary hover:text-text-primary",
              ].join(" ")}
            >
              {n}분할
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={autoFill}
            className="rounded-full bg-brand-orange px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-orange/90 transition-colors"
          >
            ⚡ 자동 채우기
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="rounded-full border border-border-soft bg-bg-secondary px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-bg-primary transition-colors"
          >
            전체 비우기
          </button>
        </div>
      </div>

      {/* 멀티뷰 그리드 — 모바일 여백·간격 최소화 */}
      <div className="mb-5 md:mx-0">
        <div className={`grid gap-0.5 md:gap-2 ${gridClass}`}>
          {Array.from({ length: slotCount }).map((_, idx) => {
            const cctvId = slots[idx];
            const cctv = cctvId ? mockCctvs.find((c) => c.id === cctvId) ?? null : null;
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
                {cctv ? (
                  <SlotPlayer cctv={cctv} onRemove={() => removeSlot(idx)} />
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
                <div className="flex aspect-video items-center justify-center rounded bg-gray-800 text-2xl">
                  🏝️
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
