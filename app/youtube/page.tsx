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
  const [selected, setSelected] = useState<JejutubeVideo | null>(null); // 모달에 열린 영상
  // 유저 영상 등록
  const [url, setUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeMsg, setAnalyzeMsg] = useState<{ type: "ok" | "info" | "error"; text: string } | null>(null);

  async function handleAnalyze() {
    if (!url.trim() || analyzing) return;
    if (!user) { signInWithGoogle(); return; }
    setAnalyzing(true);
    setAnalyzeMsg(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/jejutube/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "분석 실패");
      const video = data as JejutubeVideo & { alreadyExists?: boolean };
      if (video.alreadyExists) {
        setAnalyzeMsg({ type: "info", text: "이미 다른 여행자가 등록한 영상이에요! 아래에서 바로 스팟을 찜해보세요." });
      } else {
        setAnalyzeMsg({ type: "ok", text: `✓ 분석 완료! 스팟 ${video.spots.length}곳을 찾았어요.` });
      }
      setVideos((prev) => [video, ...prev.filter((v) => v.videoId !== video.videoId)]);
      setUrl("");
    } catch (e) {
      setAnalyzeMsg({ type: "error", text: e instanceof Error ? e.message : "오류가 발생했어요" });
    } finally {
      setAnalyzing(false);
    }
  }

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
        {/* 영상 등록 (로그인 유저 누구나) */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-navy to-blue-600 p-4 text-white">
          <div className="mb-2 flex items-center gap-2">
            <DolmangyiIcon size={32} className="shrink-0" />
            <div>
              <p className="text-sm font-black">봤던 제주 유튜브, 여기에 넣어봐!</p>
              <p className="text-[10px] text-white/80">돌맹이가 영상 속 스팟을 뽑아줄게. 다른 여행자들과 함께 공유돼요.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              placeholder="https://www.youtube.com/watch?v=..."
              disabled={analyzing}
              className="flex-1 rounded-xl border-0 bg-white/15 px-3 py-2.5 text-xs text-white placeholder:text-white/50 outline-none focus:bg-white/25"
            />
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={!url.trim() || analyzing}
              className="shrink-0 rounded-xl bg-brand-yellow px-4 py-2.5 text-xs font-black text-brand-navy hover:bg-brand-yellow/90 disabled:opacity-40 transition-colors"
            >
              {analyzing ? "🗿 분석 중..." : "✨ 스팟 추출"}
            </button>
          </div>
          {analyzing && (
            <p className="mt-2 text-[10px] text-white/80">자막을 읽고 스팟을 찾는 중이에요. 최대 1분 정도 걸려요!</p>
          )}
          {analyzeMsg && (
            <p className={[
              "mt-2 text-[11px] font-semibold",
              analyzeMsg.type === "error" ? "text-red-200" : "text-white",
            ].join(" ")}>
              {analyzeMsg.type === "error" ? "❌ " : ""}{analyzeMsg.text}
            </p>
          )}
          {!user && (
            <p className="mt-2 text-[10px] text-white/70">등록하려면 로그인이 필요해요 (버튼을 누르면 로그인 창이 떠요)</p>
          )}
        </div>

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
          // 그리드: PC 4열 / 모바일 2열 — 썸네일 카드, 클릭 시 모달
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {videos.map((v) => (
              <button
                key={v.videoId}
                type="button"
                onClick={() => setSelected(v)}
                className="group overflow-hidden rounded-2xl border border-border-soft bg-bg-card text-left shadow-card transition-transform hover:scale-[1.02]"
              >
                <div className="relative aspect-video bg-gray-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={v.thumbnail} alt={v.title} className="h-full w-full object-cover" loading="lazy" />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors group-hover:bg-black/40">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-sm text-white shadow-lg transition-transform group-hover:scale-110">▶</span>
                  </span>
                  <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/65 px-1.5 py-0.5 text-[9px] font-bold text-white">📍 {v.spots.length}</span>
                </div>
                <div className="p-2.5">
                  <p className="line-clamp-2 text-[12px] font-bold leading-snug text-text-primary">{v.title}</p>
                  {v.addedByName && <p className="mt-1 text-[9px] text-brand-orange">🙋 {v.addedByName}</p>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── 상세 모달: 영상 + 스팟 목록 ── */}
      {selected && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/65 p-0 md:p-6"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-none bg-bg-card md:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-video bg-black">
              <iframe
                className="absolute inset-0 h-full w-full"
                src={`https://www.youtube.com/embed/${selected.videoId}?autoplay=1&playsinline=1&rel=0`}
                title={selected.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-sm text-white hover:bg-black/80"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto p-4">
              <p className="text-sm font-bold text-text-primary">{selected.title}</p>
              <p className="mt-0.5 text-[11px] text-text-secondary">
                {selected.author}
                {selected.addedByName && <span className="ml-1.5 text-brand-orange">· 🙋 {selected.addedByName}님이 공유</span>}
              </p>
              <p className="mt-2 text-xs leading-5 text-text-secondary">{selected.summary}</p>
              {selected.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {selected.tags.map((t) => (
                    <span key={t} className="rounded-full bg-bg-secondary px-2 py-0.5 text-[9px] font-medium text-text-secondary">#{t}</span>
                  ))}
                </div>
              )}

              <div className="mt-3 space-y-1.5">
                <p className="text-[10px] font-bold text-brand-navy">📍 영상 속 스팟 {selected.spots.length}곳</p>
                {selected.spots.map((spot) => (
                  <SpotChip
                    key={`${selected.videoId}-${spot.name}`}
                    spot={spot}
                    saved={savedNames.has(spot.name)}
                    saving={savingName === spot.name}
                    onSave={() => handleSave(spot)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
