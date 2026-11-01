"use client";

import { useState } from "react";
import { CctvCard } from "@/components/cctv/CctvCard";
import { CameraDialog } from "@/components/cctv/CameraDialog";
import type { Cctv, CctvEntry } from "@/types/cctv";

type AnyEntry = CctvEntry | Cctv;

function toEntry(c: AnyEntry): CctvEntry {
  if ("originUrl" in c) return c;
  return { ...c, originUrl: "", active: c.status !== "비활성" };
}

export function CctvList({ cctvs }: { cctvs: readonly AnyEntry[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const entries = cctvs.map(toEntry);
  const selected = entries.find(c => c.id === selectedId && c.active);
  // Drop unavailable selection now, so restoring the inventory cannot reopen it.
  if (selectedId !== null && !selected) setSelectedId(null);
  return (
    <>
      <div className="editorial-camera-grid grid gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
        {entries.map((cctv, index) => <CctvCard key={cctv.id} cctv={cctv} index={index} onOpen={() => setSelectedId(cctv.id)} />)}
      </div>
      {selected && <CameraDialog key={selected.id} camera={selected} onClose={() => setSelectedId(null)} />}
    </>
  );
}
