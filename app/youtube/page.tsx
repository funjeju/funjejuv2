"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/common/PageHeader";
import { DolmangyiIcon } from "@/components/common/DolmangyiIcon";
import { useAuth } from "@/hooks/useAuth";
import { addMySpot, listMySpots } from "@/lib/my-spots";
import type { MySpotCategory } from "@/types/my-spot";
import type { JejutubeVideo, JejutubeSpot } from "@/types/jejutube";

/** 제주tube 카테고리 → 마이스팟 카테고리 */
function toMySpotCategory(category: string): MySpotCategory {
  if (category === "카페") return "카페";
  if (category === "맛집") return "맛집";
  if (category === "숙소") return "숙소";
  return "여행지";
}

function SpotChip({
  spot, saved, saving, onSave,
}: {
  spot: JejutubeSpot;
  saved: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  const hasCoord = typeof spot.lat === "number";
  return (
    <div className="flex items-center gap-2 rounded-xl bg-bg-secondary/50 px-3 py-2">
      <span className="text-base">{spot.emoji}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-xs font-bold text-text-primary">{spot.name}</p>
          <span className="rounded-full bg-bg-card px-1.5 py-0.5 text-[9px] text-text-secondary">{spot.category}</span>
          {spot.timestamp !== "00:00" && (
            <span className="text-[9px] text-text-secondary">⏱ {spot.timestamp}</span>
          )}
        </div>
        <p className="truncate text-[10px] text-text-secondary">{spot.description}</p>
      </div>
      <button
        type="button"
        onClick={onSave}
        disabled={saved || saving || !hasCoord}
        title={!hasCoord ? "위치를 확인할 수 없는 스팟이에요" : undefined}
        className={[
          "shrink-0 rounded-full px-2.5 py-1.5 text-[10px] font-bold transition-colors",
          saved
            ? "bg-jeju-green/10 text-jeju-green"
            : hasCoord
              ? "bg-brand-orange/10 text-brand-orange hover:bg-brand-orange hover:text-white"
              : "bg-bg-secondary text-text-secondary/50",
        ].join(" ")}
      >
        {saved ? "✓ 찜 완료" : saving ? "..." : "📍 찜"}
      </button>
    </div>
  );
}

export default function JejutubePage() {
  const { user, signInWithGoogle } = useAuth();
  const [videos, setVideos] = useState<JejutubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedNames, setSavedNames] = useState<Set<string>>(new Set());
  const [savingName, setSavingName] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null); // 재생 중인 videoId

  useEffect(() => {
    fetch("/api/jejutube")
      .then((r) => r.json())
      .then((d) => setVideos(d.videos ?? []))
      .catch(() => setVideos([]))
      .finally(() => setLoading(false));
  }, []);

  // 이미 찜한 스팟 이름 로드 (중복 방지)
  useEffect(() => {
    if (!user) { setSavedNames(new Set()); return; }
    listMySpots(user.uid)
      .then((spots) => setSavedNames(new Set(spots.map((s) => s.name))))
      .catch(() => {});
  }, [user]);

  async function handleSave(spot: JejutubeSpot) {
    if (!user) {
      signInWithGoogle();
      return;
    }
    if (typeof spot.lat !== "number" || typeof spot.lng !== "number") return;
    setSavingName(spot.name);
    try {
      await addMySpot(user.uid, {
        name: spot.name,
        category: toMySpotCategory(spot.category),
        lat: spot.lat,
        lng: spot.lng,
        address: spot.address,
        source: "jejutube",
      });
      setSavedNames((prev) => new Set([...prev, spot.name]));
    } catch { /* ignore */ } finally {
      setSavingName(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-0 md:px-4 md:py-6">
      <PageHeader title="제주tube" subtitle="유튜브 속 제주 스팟을 한눈에, 찜하면 내 여행 일정에" emoji="▶️" />

      <div className="space-y-5 px-4 md:px-0">
        {/* 안내 */}
        <div className="flex items-center gap-3 rounded-2xl bg-brand-yellow/20 p-3">
          <DolmangyiIcon size={36} className="shrink-0" />
          <p className="text-[11px] leading-5 text-text-primary">
            영상 속 스팟을 <strong>📍 찜</strong>하면 마이페이지 <Link href="/mypage" className="font-bold text-brand-orange">마이스팟</Link>에 저장되고,
            <Link href="/trip-ai" className="font-bold text-brand-orange"> AI 여행 일정</Link>을 짤 때 동선에 자동 반영돼요!
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-2xl bg-bg-secondary" />
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border-soft p-10 text-center">
            <DolmangyiIcon size={48} />
            <p className="mt-3 text-sm font-bold text-text-primary">아직 등록된 영상이 없어요</p>
            <p className="mt-1 text-xs text-text-secondary">곧 멋진 제주 영상들이 올라올 예정이에요!</p>
          </div>
        ) : (
          videos.map((v) => (
            <div key={v.videoId} className="overflow-hidden rounded-2xl border border-border-soft bg-bg-card shadow-card">
              {/* 영상 영역 */}
              {playing === v.videoId ? (
                <div className="relative aspect-video bg-black">
                  <iframe
                    className="absolute inset-0 h-full w-full"
                    src={`https://www.youtube.com/embed/${v.videoId}?autoplay=1&playsinline=1&rel=0`}
                    title={v.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setPlaying(v.videoId)}
                  className="group relative block aspect-video w-full bg-gray-900"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={v.thumbnail} alt={v.title} className="h-full w-full object-cover" />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/40">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-xl text-white shadow-lg transition-transform group-hover:scale-110">▶</span>
                  </span>
                </button>
              )}

              <div className="p-4">
                <p className="text-sm font-bold text-text-primary">{v.title}</p>
                <p className="mt-0.5 text-[11px] text-text-secondary">{v.author}</p>
                <p className="mt-2 text-xs leading-5 text-text-secondary">{v.summary}</p>
                {v.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {v.tags.map((t) => (
                      <span key={t} className="rounded-full bg-bg-secondary px-2 py-0.5 text-[9px] font-medium text-text-secondary">#{t}</span>
                    ))}
                  </div>
                )}

                {/* 스팟 목록 */}
                <div className="mt-3 space-y-1.5">
                  <p className="text-[10px] font-bold text-brand-navy">
                    📍 영상 속 스팟 {v.spots.length}곳
                  </p>
                  {v.spots.map((spot) => (
                    <SpotChip
                      key={`${v.videoId}-${spot.name}`}
                      spot={spot}
                      saved={savedNames.has(spot.name)}
                      saving={savingName === spot.name}
                      onSave={() => handleSave(spot)}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
