"use client";

import { useEffect, useState } from "react";
import { subscribeCctvs } from "@/lib/firestore-cctv";
import type { CctvEntry } from "@/types/cctv";

/** The published inventory is authoritative, including an intentionally empty list. */
export function useCctvs() {
  const [cctvs, setCctvs] = useState<CctvEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let disposed = false;
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = subscribeCctvs((entries) => {
        if (disposed) return;
        setCctvs(entries);
        setLoading(false);
        setError(null);
      }, () => {
        if (disposed) return;
        setCctvs([]);
        setLoading(false);
        setError("CCTV 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
      });
    } catch {
      queueMicrotask(() => {
        if (disposed) return;
        setCctvs([]);
        setLoading(false);
        setError("CCTV 목록 연결을 준비 중이에요.");
      });
    }
    return () => { disposed = true; unsubscribe?.(); };
  }, []);
  return { cctvs, loading, error };
}
