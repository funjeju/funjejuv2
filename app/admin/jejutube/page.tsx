"use client";

import { useEffect, useState } from "react";
import type { JejutubeVideo } from "@/types/jejutube";

export default function AdminJejutubePage() {
  const [url, setUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [videos, setVideos] = useState<JejutubeVideo[]>([]);
  const [error, setError] = useState("");
  const [lastResult, setLastResult] = useState<JejutubeVideo | null>(null);

  async function loadVideos() {
    try {
      const res = await fetch("/api/admin/jejutube");
      const data = await res.json();
      if (res.ok) setVideos(data.videos ?? []);
    } catch { /* ignore */ }
  }

  useEffect(() => { loadVideos(); }, []);

  async function handleAnalyze() {
    if (!url.trim() || analyzing) return;
    setAnalyzing(true);
    setError("");
    setLastResult(null);
    try {
      const res = await fetch("/api/admin/jejutube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "분석 실패");
      setLastResult(data as JejutubeVideo);
      setUrl("");
      loadVideos();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류 발생");
    } finally {
      setAnalyzing(false);
    }
  }

  const [reanalyzing, setReanalyzing] = useState<string | null>(null);

  async function handleReanalyze(videoUrl: string, videoId: string) {
    if (reanalyzing) return;
    setReanalyzing(videoId);
    setError("");
    try {
      const res = await fetch("/api/admin/jejutube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: videoUrl, force: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "재분석 실패");
      setLastResult(data as JejutubeVideo);
      loadVideos();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류 발생");
    } finally {
      setReanalyzing(null);
    }
  }

  async function handleDelete(videoId: string) {
    setVideos((prev) => prev.filter((v) => v.videoId !== videoId));
    try {
      await fetch("/api/admin/jejutube", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId }),
      });
    } catch { /* 다음 로드에서 동기화 */ }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-1 text-lg font-black text-text-primary">▶ 제주tube 관리</h1>
      <p className="mb-5 text-xs text-text-secondary">
        유튜브 영상을 등록하면 자막을 추출해 제주 스팟을 뽑아냅니다. 사용자는 /youtube에서 스팟을 마이스팟으로 찜할 수 있어요.
      </p>

      {/* 등록 폼 */}
      <div className="mb-6 rounded-2xl border border-border-soft bg-bg-card p-4 shadow-card">
        <div className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            placeholder="https://www.youtube.com/watch?v=..."
            className="flex-1 rounded-xl border border-border-soft bg-bg-secondary px-3 py-2.5 text-sm outline-none focus:border-brand-orange"
            disabled={analyzing}
          />
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!url.trim() || analyzing}
            className="shrink-0 rounded-xl bg-brand-orange px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-orange/90 disabled:opacity-40 transition-colors"
          >
            {analyzing ? "🗿 분석 중... (최대 1분)" : "✨ 분석 + 등록"}
          </button>
        </div>
        {error && <p className="mt-2 text-xs font-semibold text-live-red">❌ {error}</p>}

        {lastResult && (
          <div className="mt-3 rounded-xl bg-jeju-green/10 p-3">
            <p className="text-xs font-bold text-jeju-green">
              ✓ 등록 완료: {lastResult.title} — 스팟 {lastResult.spots.length}개
              (자막: {lastResult.transcriptSource === "socialkit" ? "SocialKit" : "Gemini 영상분석"})
            </p>
            <p className="mt-1 text-[11px] text-text-secondary">
              {lastResult.spots.map((s) => `${s.emoji}${s.name}${s.lat ? "📍" : ""}`).join(" · ")}
            </p>
          </div>
        )}
      </div>

      {/* 등록된 영상 목록 */}
      <h2 className="mb-3 text-sm font-bold text-text-primary">등록된 영상 ({videos.length})</h2>
      <div className="space-y-3">
        {videos.map((v) => (
          <div key={v.videoId} className="flex gap-3 rounded-2xl border border-border-soft bg-bg-card p-3 shadow-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={v.thumbnail} alt={v.title} className="h-20 w-32 shrink-0 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-text-primary">{v.title}</p>
              <p className="text-[11px] text-text-secondary">
                {v.author} · 스팟 {v.spots.length}개 (좌표 확보 {v.spots.filter((s) => s.lat).length}개)
                · {new Date(v.createdAt).toLocaleDateString("ko-KR")}
              </p>
              <p className="mt-1 truncate text-[11px] text-text-secondary">
                {v.spots.map((s) => s.name).join(", ")}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-1.5 self-start">
              <button
                type="button"
                onClick={() => handleReanalyze(v.url, v.videoId)}
                disabled={reanalyzing === v.videoId}
                title="AI로 좌표를 다시 찾아 스팟을 보정합니다 (찜 활성화)"
                className="rounded-full border border-border-soft px-2.5 py-1 text-[11px] text-brand-orange hover:border-brand-orange disabled:opacity-40 transition-colors"
              >
                {reanalyzing === v.videoId ? "분석 중..." : "🔄 재분석"}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(v.videoId)}
                className="rounded-full border border-border-soft px-2.5 py-1 text-[11px] text-text-secondary hover:border-live-red hover:text-live-red transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        ))}
        {videos.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border-soft p-6 text-center text-xs text-text-secondary">
            아직 등록된 영상이 없어요. 위에 유튜브 URL을 넣어보세요!
          </p>
        )}
      </div>
    </div>
  );
}
