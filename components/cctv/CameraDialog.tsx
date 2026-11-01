"use client";

import { useEffect, useId, useRef } from "react";
import Link from "next/link";
import { ArrowUpRight, X } from "lucide-react";
import { HlsPlayer } from "@/components/cctv/HlsPlayer";
import { YoutubePlayer } from "@/components/cctv/YoutubePlayer";
import { VurixLaunch } from "@/components/cctv/VurixLaunch";
import { isVurixId } from "@/constants/vurix";

export type DialogCamera = {
  id: string; name: string; region?: string; category?: string;
  youtubeId?: string; active?: boolean; sourceRevision?: string;
  originUrl?: string; streamProxyUrl?: string | null;
};
const PROXY_URL = process.env.NEXT_PUBLIC_WORKER_URL || process.env.NEXT_PUBLIC_PROXY_URL || "";

/** Metadata edits keep playback mounted; an actual source change starts a fresh session. */
export function cameraPlaybackKey(camera: DialogCamera) {
  return JSON.stringify([camera.id, camera.youtubeId ?? "", camera.sourceRevision ?? "", camera.originUrl ?? "", camera.streamProxyUrl ?? ""]);
}

export function CameraDialog({ camera, onClose }: { camera: DialogCamera; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  const proxyUrl = camera.streamProxyUrl ?? (PROXY_URL ? `${PROXY_URL}/cctv/${camera.id}` : null);
  const playbackKey = cameraPlaybackKey(camera);
  return (
    <dialog ref={dialogRef} onCancel={event => { event.preventDefault(); onClose(); }} aria-labelledby={titleId}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}
      className="editorial-camera-dialog fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_1.5rem)] max-w-3xl overflow-y-auto rounded-[20px] border border-white/20 bg-[#f6f7f2] p-0 text-[#172524] shadow-2xl backdrop:bg-[#071413]/85 backdrop:backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3 border-b border-[#172524]/15 px-5 py-4 sm:px-7">
        <div><p className="mb-1 text-[10px] font-bold tracking-[.18em] text-[#52605a]">JEJU / CAMERA VIEW</p><h2 id={titleId} className="text-xl font-black tracking-tight sm:text-2xl">{camera.name}</h2><p className="mt-1 text-xs text-[#52605a]">{[camera.region, camera.category].filter(Boolean).join(" · ")}</p></div>
        <button type="button" autoFocus onClick={onClose} aria-label="CCTV 미리보기 닫기" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#172524]/20 transition-colors hover:bg-[#d9ff60] focus-visible:outline-2 focus-visible:outline-offset-4"><X size={20} /></button>
      </div>
      <div className="bg-[#101a19]">
        {camera.active === false ? <p role="status" className="p-10 text-center text-white">점검 또는 임시 오류로 재생이 중단되었어요.</p>
          : camera.youtubeId ? <YoutubePlayer key={playbackKey} youtubeId={camera.youtubeId} title={camera.name} />
          : isVurixId(camera.id) ? <VurixLaunch key={playbackKey} id={camera.id} name={camera.name} />
          : <HlsPlayer key={playbackKey} proxyUrl={proxyUrl} label={camera.name} cctvId={camera.id} cctvName={camera.name} />}
      </div>
      <div className="px-5 py-5 sm:px-7"><p className="mb-4 text-xs leading-5 text-[#52605a]">영상 연결과 재생 상태는 플레이어에서 확인해 주세요. 현장 통신 상황에 따라 지연되거나 중단될 수 있어요.</p><div className="flex items-center gap-3">
        <Link href={`/cctv/${camera.id}`} onClick={onClose} className="flex flex-1 items-center justify-between gap-2 rounded-lg bg-[#d9ff60] px-5 py-3 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-4">카메라 상세 정보<ArrowUpRight size={17} /></Link>
        <button type="button" onClick={onClose} className="rounded-lg border border-[#172524]/25 px-5 py-3 text-sm font-bold">닫기</button>
      </div></div>
    </dialog>
  );
}
