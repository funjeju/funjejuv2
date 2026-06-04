"use client";

import { useEffect, useState } from "react";
import { subscribeCctvs } from "@/lib/firestore-cctv";
import { mockCctvs } from "@/constants/mock-cctvs";
import type { CctvEntry } from "@/types/cctv";

/** Firestore 실시간 구독. Firestore가 비어있으면 mock fallback */
export function useCctvs() {
  const [cctvs, setCctvs] = useState<CctvEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let settled = false;

    // 3초 내 Firestore 응답이 없으면 mock 사용
    const fallbackTimer = setTimeout(() => {
      if (!settled) {
        setCctvs(mockToCctvEntries());
        setLoading(false);
      }
    }, 3000);

    const unsub = subscribeCctvs((entries) => {
      settled = true;
      clearTimeout(fallbackTimer);
      if (entries.length === 0) {
        setCctvs(mockToCctvEntries());
      } else {
        setCctvs(entries);
      }
      setLoading(false);
    });

    return () => {
      clearTimeout(fallbackTimer);
      unsub();
    };
  }, []);

  return { cctvs, loading };
}

function mockToCctvEntries(): CctvEntry[] {
  return mockCctvs.map((c) => ({
    id: c.id,
    name: c.name,
    region: c.region,
    direction: c.direction,
    category: c.category,
    originUrl: "",
    youtubeId: c.youtubeId,
    active: true,
    description: c.description,
    lat: c.latitude,
    lng: c.longitude,
  }));
}
