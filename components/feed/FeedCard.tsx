"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { likeFeed, deleteFeed, getAuthor } from "@/lib/feed";
import { useAuth } from "@/hooks/useAuth";
import { useMySpot } from "@/hooks/useMySpot";
import type { Feed, FeedAuthor, FeedFilter } from "@/types/feed";
import type { MySpotCategory } from "@/types/my-spot";

const ADMIN_EMAIL = "naggu1999@gmail.com";

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

// EXIF date "2026:06:04 14:32:18" → Date
function parseExifDate(exifDate: string): Date | null {
  try {
    const normalized = exifDate.replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3");
    const d = new Date(normalized);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

export function FeedCard({ feed, onDeleted }: { feed: Feed; onDeleted?: () => void }) {
  const { user } = useAuth();
  const [author,    setAuthor]    = useState<FeedAuthor | null>(null);
  const [liked,     setLiked]     = useState(false);
  const [likeCount, setLikeCount] = useState(feed.likes);
  const [deleting,  setDeleting]  = useState(false);
  const [zoomed,    setZoomed]    = useState(false);

  const { isSpot, toggle: toggleSpot } = useMySpot();
  const isOwner = !!user && user.uid === feed.authorId;
  const isAdmin = !!user && user.email === ADMIN_EMAIL;
  const canDelete = isOwner || isAdmin;

  // 피드 스팟 저장 — placeName + GPS 있을 때만
  const canSaveSpot = !!(feed.placeName && feed.gps);
  const spotId = `feed_${feed.id}`;
  const spotSaved = isSpot(spotId);

  function categoryToMySpot(cat: string): MySpotCategory {
    if (cat === "카페") return "카페";
    if (cat === "맛집") return "맛집";
    if (cat === "숙소") return "숙소";
    return "여행지";
  }

  useEffect(() => {
    getAuthor(feed.authorId).then(setAuthor);
  }, [feed.authorId]);

  async function handleDelete() {
    if (!confirm("이 피드를 삭제할까요?")) return;
    setDeleting(true);
    try {
      await deleteFeed(feed.id);
      onDeleted?.();
    } catch {
      setDeleting(false);
    }
  }

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

  const images = feed.images?.length ? feed.images : [feed.imageUrl];

  const uploadDate = feed.createdAt?.toDate?.() ?? new Date();
  // 촬영일 우선, 없으면 업로드 날짜
  const shootDate = feed.exif.date ? (parseExifDate(feed.exif.date) ?? uploadDate) : uploadDate;
  const filterStyle = FILTER_PRESETS[feed.filter] || "";

  // EXIF 표시 가능 여부
  const hasExif = Boolean(
    feed.exif.camera || feed.exif.focalLength || feed.exif.fStop || feed.exif.iso
  );

  return (
    <article className="overflow-hidden rounded-2xl border border-border-soft bg-bg-card shadow-card">
      {/* 이미지 + 오버레이 — 탭하면 전체화면. 여러 장이면 가로 스와이프 */}
      <div className="relative aspect-[4/5] bg-gray-900 overflow-hidden">
        {images.length > 1 ? (
          <div className="no-scrollbar flex h-full w-full snap-x snap-mandatory overflow-x-auto">
            {images.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                alt={`${feed.aiCopy} ${i + 1}`}
                onClick={() => setZoomed(true)}
                className="h-full w-full shrink-0 cursor-zoom-in snap-center object-cover"
                style={{ filter: filterStyle }}
                loading="lazy"
              />
            ))}
          </div>
        ) : (
          <div className="h-full w-full cursor-zoom-in" onClick={() => setZoomed(true)}>
            <Image
              src={feed.imageUrl}
              alt={feed.aiCopy}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover"
              style={{ filter: filterStyle }}
              unoptimized
            />
          </div>
        )}
        {images.length > 1 && (
          <span className="pointer-events-none absolute left-1/2 top-1.5 z-10 -translate-x-1/2 rounded-full bg-black/55 px-2 py-0.5 text-[9px] font-bold text-white backdrop-blur md:top-3">
            📷 1+{images.length - 1}
          </span>
        )}

        {/* 상단 그라데이션 (가독성) */}
        <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />

        {/* AI 카피 — 가운데 정렬, 상단에서 살짝 아래, 글자 키움 */}
        <div className="absolute inset-x-0 top-8 z-[1] px-4 md:top-12">
          <p
            className="line-clamp-2 text-center text-[14px] font-bold leading-snug text-white drop-shadow-lg md:text-2xl md:leading-8"
            style={{ textShadow: "0 2px 8px rgba(0,0,0,0.7)" }}
          >
            {feed.aiCopy}
          </p>
        </div>

        {/* 카테고리 + 지역 + 업소 뱃지 (좌상단, 한 줄) */}
        <div className="absolute left-1.5 top-1.5 flex flex-row flex-wrap items-center gap-1 md:left-3 md:top-3">
          <span className="rounded-full bg-white/90 px-1.5 py-0 text-[8px] font-bold text-text-primary backdrop-blur md:px-2.5 md:py-0.5 md:text-[10px]">
            {feed.category}
          </span>
          {feed.regionName && (
            <span className="rounded-full bg-brand-navy/90 px-1.5 py-0 text-[8px] font-bold text-white backdrop-blur md:px-2.5 md:py-0.5 md:text-[10px]">
              📍 {feed.regionName}
            </span>
          )}
          {feed.placeName && (
            <span className="rounded-full bg-brand-orange/90 px-1.5 py-0 text-[8px] font-bold text-white backdrop-blur md:px-2.5 md:py-0.5 md:text-[10px]">
              🏪 {feed.placeName}
            </span>
          )}
        </div>

        {/* 촬영일 기준 경과 시간 배지 (우하단) */}
        <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[9px] font-semibold text-white/90 backdrop-blur md:bottom-3 md:right-3 md:px-2 md:py-1 md:text-[11px]">
          {timeAgo(shootDate)}
        </span>
      </div>

      {/* 작성자 + 인터랙션 — 한 줄 컴팩트 */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 md:gap-2 md:px-4 md:py-2">
        <div className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-bg-secondary md:h-7 md:w-7">
          {feed.authorPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={feed.authorPhoto} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-[9px] font-bold text-text-secondary">
              {feed.authorName[0]?.toUpperCase() ?? "U"}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="flex items-center gap-1 text-[9px] font-bold text-text-primary">
            <span className="truncate">{feed.authorName}</span>
            {author?.isBusiness && (
              <span className="rounded-full bg-brand-orange/10 px-1 py-0 text-[7px] font-bold text-brand-orange">
                BIZ
              </span>
            )}
          </p>
          <p className="text-[8px] text-text-secondary">{timeAgo(shootDate)}</p>
        </div>
        {canSaveSpot && (
          <button
            type="button"
            onClick={() => toggleSpot(spotId, {
              name: feed.placeName!,
              category: categoryToMySpot(feed.category),
              lat: feed.gps!.lat,
              lng: feed.gps!.lng,
              address: feed.regionName,
              source: "feed",
            })}
            className="text-[11px] transition-transform active:scale-125"
            title={spotSaved ? "마이스팟에서 제거" : "마이스팟에 저장"}
          >
            {spotSaved ? "⭐" : "☆"}
          </button>
        )}
        <button
          type="button"
          onClick={handleLike}
          className="flex items-center gap-0.5 text-[9px] font-semibold transition-transform active:scale-125"
        >
          <span className={`text-[12px] ${liked ? "" : "grayscale opacity-60"}`}>{liked ? "❤️" : "🤍"}</span>
          <span className={liked ? "text-live-red" : "text-text-secondary"}>{likeCount}</span>
        </button>
        {canDelete && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            aria-label={isAdmin && !isOwner ? "관리자 삭제" : "삭제"}
            title={isAdmin && !isOwner ? "관리자 삭제" : "삭제"}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bg-secondary text-[9px] font-bold text-text-secondary hover:bg-live-red/10 hover:text-live-red transition-colors disabled:opacity-40"
          >
            {deleting ? "…" : "✕"}
          </button>
        )}
      </div>

      {/* EXIF — 이미지 아래 흰 배경 검정 글씨 */}
      {hasExif && (
        <div className="border-t border-border-soft px-2.5 py-1 md:px-4">
          <div className="flex items-center gap-x-1.5 truncate text-[7px] font-medium text-text-secondary md:text-[9px]">
            {feed.exif.camera && <span className="shrink truncate">📷 {feed.exif.camera}</span>}
            {feed.exif.focalLength && <span className="shrink-0">{feed.exif.focalLength}</span>}
            {feed.exif.fStop && <span className="shrink-0">{feed.exif.fStop}</span>}
            {feed.exif.iso && <span className="shrink-0">ISO{feed.exif.iso}</span>}
            {feed.exif.exposureTime && <span className="shrink-0 hidden md:inline">{feed.exif.exposureTime}</span>}
          </div>
        </div>
      )}

      {/* 연결된 홈페이지 바로가기 (피드 업로드 시 선택) */}
      {feed.homepageSlug && (
        <a
          href={`/biz/${feed.homepageSlug}`}
          className="mx-2.5 mb-2 block rounded-lg bg-brand-navy py-1.5 text-center text-[11px] font-bold text-white transition-colors hover:bg-brand-navy/90 md:mx-4 md:mb-3 md:rounded-xl md:py-2.5 md:text-xs"
        >
          🏠 {feed.homepageName || "홈페이지"} 보기 →
        </a>
      )}

      {/* 비즈니스 CTA */}
      {author?.isBusiness && author.ctaData?.text && author.ctaData.url && (
        <a
          href={author.ctaData.url}
          target="_blank"
          rel="noopener noreferrer"
          className={[
            "mx-2.5 mb-2 block rounded-lg py-1.5 text-center text-[11px] font-bold transition-colors md:mx-4 md:mb-3 md:rounded-xl md:py-2.5 md:text-xs",
            author.ctaData.variant === "outline"
              ? "border-2 border-brand-orange text-brand-orange hover:bg-brand-orange/10"
              : "bg-brand-orange text-white hover:bg-brand-orange/90 shadow-soft",
          ].join(" ")}
        >
          {author.ctaData.text} →
        </a>
      )}

      {/* 전체화면 뷰어 */}
      {zoomed && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-2"
          onClick={() => setZoomed(false)}
        >
          <button
            type="button"
            onClick={() => setZoomed(false)}
            aria-label="닫기"
            className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-lg text-white backdrop-blur hover:bg-white/25"
          >
            ✕
          </button>
          {images.length > 1 ? (
            <div className="no-scrollbar flex h-full w-full snap-x snap-mandatory items-center overflow-x-auto" onClick={(e) => e.stopPropagation()}>
              {images.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={src} alt={`${feed.aiCopy} ${i + 1}`} className="h-full w-full shrink-0 snap-center object-contain" style={{ filter: filterStyle }} />
              ))}
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={feed.imageUrl}
              alt={feed.aiCopy}
              className="max-h-full max-w-full object-contain"
              style={{ filter: filterStyle }}
              onClick={(e) => e.stopPropagation()}
            />
          )}
          {feed.aiCopy && (
            <p className="absolute inset-x-0 bottom-6 px-6 text-center text-sm font-bold text-white drop-shadow-lg">
              {feed.aiCopy}
            </p>
          )}
        </div>
      )}
    </article>
  );
}
