"use client";

import { useEffect, useState } from "react";
import { subscribeCctvs } from "@/lib/firestore-cctv";
import { mockCctvs } from "@/constants/mock-cctvs";
import type { CctvEntry } from "@/types/cctv";

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

const MOCK_ENTRIES = mockToCctvEntries(); // 모듈 로드 시점에 한 번만 계산

/**
 * Firestore 실시간 구독.
 * - 초기값: mock 데이터 (즉시 표시, 0ms 대기 없음)
 * - Firestore에 실제 데이터가 있으면 교체
 * - Firestore가 비어있으면 mock 유지
 */
export function useCctvs() {
  const [cctvs, setCctvs] = useState<CctvEntry[]>(MOCK_ENTRIES);

  useEffect(() => {
    const unsub = subscribeCctvs((entries) => {
      if (entries.length > 0) {
        setCctvs(entries); // Firestore 데이터로 교체
      }
      // entries.length === 0 이면 mock 그대로 유지
    });
    return unsub;
  }, []);

  // loading 상태 제거 — 항상 데이터가 있으므로 불필요
  return { cctvs, loading: false };
}
