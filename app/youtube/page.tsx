"use client";

import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";

type Spot = {
  name: string;
  category: string;
  description: string;
  timestamp: string;
  emoji: string;
};

type Summary = {
  title: string;
  summary: string;
  duration: string;
  spots: Spot[];
  course: string[];
  tags: string[];
};

const EXAMPLES = [
  { label: "협재리", url: "https://www.youtube.com/watch?v=ZO4M9siq8MA" },
  { label: "신창리 싱계물공원", url: "https://www.youtube.com/watch?v=FvITqIw4WkA" },
  { label: "성산일출봉", url: "https://www.youtube.com/watch?v=3zcicFYlePc" },
  { label: "마라도", url: "https://www.youtube.com/watch?v=ZghXO3Ih5NU" },
];

function extractVideoId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

export default function YoutubePage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Summary | null>(null);
  const [error, setError] = useState("");

  async function analyze(targetUrl: string) {
    if (!targetUrl.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/youtube-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "분석 실패");
      }
      setResult(data as Summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했어요");
    } finally {
      setLoading(false);
    }
  }

  const videoId = result ? extractVideoId(url) : null;

  return (
    <div className="mx-auto max-w-4xl px-0 md:px-4 md:py-6">
      <PageHeader
        title="유튜브 요약"
        subtitle="제주 여행 유튜브를 AI가 스팟 단위로 요약해드려요"
        emoji="▶️"
      />

      {/* URL 입력 */}
      <div className="mx-4 mb-5 rounded-2xl border border-border-soft bg-bg-card p-4 shadow-card md:mx-0">
        <p className="mb-2 text-sm font-bold text-text-primary">유튜브 URL 입력</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && analyze(url)}
            placeholder="https://youtube.com/watch?v=..."
            disabled={loading}
            className="flex-1 rounded-full border border-border-soft bg-bg-secondary px-4 py-2.5 text-sm text-text-primary outline-none focus:border-brand-orange disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => analyze(url)}
            disabled={loading || !url.trim()}
            className="shrink-0 rounded-full bg-live-red px-5 py-2.5 text-xs font-bold text-white hover:bg-live-red/90 disabled:opacity-50 transition-colors"
          >
            {loading ? "분석 중..." : "요약하기"}
          </button>
        </div>

        {/* 예시 */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="text-[11px] text-text-secondary">예시:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.url}
              type="button"
              onClick={() => { setUrl(ex.url); analyze(ex.url); }}
              disabled={loading}
              className="rounded-full bg-bg-secondary px-2.5 py-0.5 text-[10px] font-medium text-text-secondary hover:bg-border-soft transition-colors disabled:opacity-50"
            >
              {ex.label}
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-2 text-xs font-semibold text-live-red">❌ {error}</p>
        )}
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="mx-4 flex flex-col items-center py-16 md:mx-0">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-orange/30 border-t-brand-orange" />
          <p className="mt-4 text-sm font-medium text-text-primary">
            🗿 돌맹이가 영상을 보고 있어요...
          </p>
          <p className="mt-1 text-xs text-text-secondary">영상 길이에 따라 30초~1분 정도 걸려요</p>
        </div>
      )}

      {/* 결과 */}
      {result && (
        <div className="mx-4 space-y-4 md:mx-0">
          {/* 영상 임베드 */}
          {videoId && (
            <div className="overflow-hidden rounded-2xl border border-border-soft shadow-card">
              <div className="relative aspect-video bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}`}
                  className="absolute inset-0 h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          )}

          {/* 요약 카드 */}
          <div className="rounded-2xl border border-border-soft bg-bg-card p-5 shadow-card">
            <h2 className="text-lg font-black text-text-primary">{result.title}</h2>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-bg-secondary px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                ⏱ {result.duration}
              </span>
              <span className="rounded-full bg-brand-orange/10 px-2 py-0.5 text-[10px] font-bold text-brand-orange">
                📍 스팟 {result.spots.length}개
              </span>
              {result.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-bg-secondary px-2 py-0.5 text-[10px] text-text-secondary">
                  #{tag}
                </span>
              ))}
            </div>
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-brand-yellow/10 p-3">
              <span className="text-xl">🗿</span>
              <p className="text-sm leading-6 text-text-primary">{result.summary}</p>
            </div>
          </div>

          {/* 추천 코스 */}
          {result.course.length > 0 && (
            <div className="rounded-2xl border border-border-soft bg-bg-card p-5 shadow-card">
              <p className="mb-3 text-sm font-bold text-text-primary">🗺️ 추천 코스</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {result.course.map((spot, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="rounded-full bg-brand-navy/10 px-3 py-1 text-xs font-semibold text-brand-navy">
                      {i + 1}. {spot}
                    </span>
                    {i < result.course.length - 1 && (
                      <span className="text-text-secondary">→</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 스팟 리스트 */}
          <div className="rounded-2xl border border-border-soft bg-bg-card p-5 shadow-card">
            <p className="mb-3 text-sm font-bold text-text-primary">📍 등장 스팟</p>
            <div className="space-y-2">
              {result.spots.map((spot, i) => (
                <div key={i} className="flex gap-3 rounded-xl bg-bg-secondary/50 p-3 hover:bg-bg-secondary transition-colors">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-bg-card text-2xl shadow-card">
                    {spot.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-text-primary">{spot.name}</p>
                      <span className="rounded-full bg-brand-orange/10 px-2 py-0.5 text-[10px] font-medium text-brand-orange">
                        {spot.category}
                      </span>
                      {videoId && (
                        <a
                          href={`https://youtube.com/watch?v=${videoId}&t=${spot.timestamp.replace(":", "m")}s`}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-auto rounded-full bg-live-red/10 px-2 py-0.5 text-[10px] font-bold text-live-red hover:bg-live-red/20 transition-colors"
                        >
                          ▶ {spot.timestamp}
                        </a>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs leading-5 text-text-secondary">{spot.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
