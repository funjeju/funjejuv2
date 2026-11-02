"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePublicCctvs } from "@/hooks/usePublicCctvs";
import { launchObservation } from "@/lib/cctv-launch-policy";

/** ISR may keep place copy, but must never keep a player alive after a current
 * inventory failure, source replacement, or operator disable. */
export function PublicPlaybackBoundary({ id, sourceRevision, children }: { id: string; sourceRevision: string; children: ReactNode }) {
  const { cctvs, loading, error } = usePublicCctvs();
  const published = launchObservation(id)?.sourceRevision === sourceRevision && cctvs.some(current => current.id === id);
  if (published && !error) return children;
  return <div role="status" className="rounded-2xl border border-border-soft bg-bg-secondary p-8 text-center text-text-primary">
    <p className="font-bold">{loading ? "공개 가능한 영상을 확인하고 있어요" : "재생 확인 전까지 비공개로 보관하고 있어요"}</p>
    <p className="mt-2 text-sm text-text-secondary">{error ? "목록 연결을 확인하지 못해 영상을 연결하지 않습니다." : "장소 기록은 보존하며, 최근 영상 재생을 확인한 카메라만 공개합니다."}</p>
    <Link href="/cctv" className="mt-4 inline-block underline">공개 카메라 보기</Link>
  </div>;
}
