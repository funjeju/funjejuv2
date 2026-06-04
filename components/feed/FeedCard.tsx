"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { likeFeed, getAuthor } from "@/lib/feed";
import type { Feed, FeedAuthor, FeedFilter } from "@/types/feed";

// CSS 필터 프리셋
const FILTER_PRESETS: Record<FeedFilter, string> = {
  none: "",
  warm: "contrast(1.1) saturate(1.2) brightness(1.05) sepia(0.1)",
  cool: "contrast(1.15) saturate(0.9) hue-rotate(-5deg) brightness(1.05)",
  vivid: "contrast(1.2) saturate(1.4) brightness(1.02)",
  cinematic: "contrast(1.25) saturate(1.1) brightness(0.95) sepia(0.15)",
};

function timeAgo(date: Date): string {
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

export function FeedCard({ feed }: { feed: Feed }) {
  const [author, setAuthor] = useState<FeedAuthor | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(feed.likes);

  useEffect(() => {
    getAuthor(feed.authorId).then(setAuthor);
  }, [feed.authorId]);

  async function handleLike() {
    if (liked) return;
    setLiked(true);
    setLikeCount((c) => c + 1);
    try {
      await likeFeed(feed.id);
    } catch {
      setLiked(false);
      setLikeCount((c) => c - 1);
    }
  }

  const date = feed.createdAt?.toDate?.() ?? new Date();
  const filterStyle = FILTER_PRESETS[feed.filter] || "";

  // EXIF 표시 가능 여부
  const hasExif = Boolean(
    feed.exif.camera || feed.exif.focalLength || feed.exif.fStop || feed.exif.iso
  );

  return (
    <article className="overflow-hidden rounded-2xl border border-border-soft bg-bg-card shadow-card">
      {/* 이미지 + 오버레이 */}
      <div className="relative aspect-[4/5] bg-gray-900 overflow-hidden">
        <Image
          src={feed.imageUrl}
          alt={feed.aiCopy}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover"
          style={{ filter: filterStyle }}
          unoptimized
        />

        {/* 상단 그라데이션 (가독성) */}
        <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />

        {/* AI 카피 (중앙 우상단) */}
        <div className="absolute right-4 top-4 max-w-[60%]">
          <p
            className="text-right text-lg font-bold leading-7 text-white drop-shadow-lg md:text-xl"
            style={{ textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}
          >
            {feed.aiCopy}
          </p>
        </div>

        {/* 카테고리 + 지역 뱃지 (좌상단) */}
        <div className="absolute left-3 top-3 flex flex-col gap-1">
          <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-bold text-text-primary backdrop-blur">
            {feed.category}
          </span>
          {feed.regionName && (
            <span className="rounded-full bg-brand-navy/90 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur">
              📍 {feed.regionName}
            </span>
          )}
        </div>

        {/* EXIF 정보 (하단) */}
        {hasExif && (
          <>
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 bottom-3 px-4 text-white">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] font-medium tracking-wide opacity-90">
                {feed.exif.camera && (
                  <span className="flex items-center gap-1">
                    <span>📷</span> {feed.exif.camera}
                  </span>
                )}
                {feed.exif.focalLength && <span>{feed.exif.focalLength}</span>}
                {feed.exif.fStop && <span>{feed.exif.fStop}</span>}
                {feed.exif.iso && <span>ISO {feed.exif.iso}</span>}
                {feed.exif.exposureTime && <span>{feed.exif.exposureTime}</span>}
              </div>
            </div>
          </>
        )}
      </div>

      {/* 작성자 + 인터랙션 */}
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-bg-secondary">
          {feed.authorPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={feed.authorPhoto} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-text-secondary">
              {feed.authorName[0]?.toUpperCase() ?? "U"}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-xs font-bold text-text-primary">
            <span className="truncate">{feed.authorName}</span>
            {author?.isBusiness && (
              <span className="rounded-full bg-brand-orange/10 px-1.5 py-0.5 text-[9px] font-bold text-brand-orange">
                BIZ
              </span>
            )}
          </p>
          <p className="text-[10px] text-text-secondary">{timeAgo(date)}</p>
        </div>
        <button
          type="button"
          onClick={handleLike}
          className="flex items-center gap-1 text-xs font-semibold transition-transform active:scale-125"
        >
          <span className={liked ? "" : "grayscale opacity-60"}>{liked ? "❤️" : "🤍"}</span>
          <span className={liked ? "text-live-red" : "text-text-secondary"}>{likeCount}</span>
        </button>
      </div>

      {/* 비즈니스 CTA */}
      {author?.isBusiness && author.ctaData?.text && author.ctaData.url && (
        <a
          href={author.ctaData.url}
          target="_blank"
          rel="noopener noreferrer"
          className={[
            "mx-4 mb-3 block rounded-xl py-2.5 text-center text-xs font-bold transition-colors",
            author.ctaData.variant === "outline"
              ? "border-2 border-brand-orange text-brand-orange hover:bg-brand-orange/10"
              : "bg-brand-orange text-white hover:bg-brand-orange/90 shadow-soft",
          ].join(" ")}
        >
          {author.ctaData.text} →
        </a>
      )}
    </article>
  );
}
