"use client";

import { usePreviewRuntime } from "@/components/common/PreviewRuntimeProvider";

import { useState } from "react";
import { CctvCard } from "@/components/cctv/CctvCard";
import { CameraDialog } from "@/components/cctv/CameraDialog";
import { openCameraWatch, requiresExternalPlayback, requiresPlaybackDetail } from "@/lib/cctv-playback-target";
import type { Cctv, CctvEntry } from "@/types/cctv";

type AnyEntry = CctvEntry | Cctv;

function toEntry(c: AnyEntry): CctvEntry {
  if ("originUrl" in c) return c;
  return { ...c, originUrl: "", active: c.status !== "비활성" };
}

export function CctvList({ cctvs, variant = "editorial", onCameraOpen }: { cctvs: readonly AnyEntry[]; variant?: "editorial" | "compact"; onCameraOpen?: (camera: CctvEntry) => void }) {
  const preview = usePreviewRuntime();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const entries = cctvs.map(toEntry);
  const selected = entries.find(c => c.id === selectedId && c.active && !requiresExternalPlayback(c) && !requiresPlaybackDetail(c));
  // Drop unavailable selection now, so restoring the inventory cannot reopen it.
  if (selectedId !== null && !selected) setSelectedId(null);
  return (
    <>
      <div className={variant === "compact" ? "wind-camera-list flex flex-col gap-2" : "editorial-camera-grid grid gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3"}>
        {entries.map((cctv, index) => <CctvCard key={cctv.id} cctv={cctv} index={index} variant={variant} onOpen={() => {
          if (!cctv.active) return;
          onCameraOpen?.(cctv);
          if (preview || requiresExternalPlayback(cctv)) { setSelectedId(null); openCameraWatch(cctv, preview); }
          else if (requiresPlaybackDetail(cctv)) {
            setSelectedId(null);
            window.location.assign(`/cctv/${encodeURIComponent(cctv.id)}`);
          } else setSelectedId(cctv.id);
        }} />)}
      </div>
      {selected && <CameraDialog key={selected.id} camera={selected} onClose={() => setSelectedId(null)} />}
    </>
  );
}
