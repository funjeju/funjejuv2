"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { subscribeFeeds, deleteFeed } from "@/lib/feed";
import type { Feed } from "@/types/feed";

export default function AdminFeedPage() {
  const [feeds,   setFeeds]   = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg,     setMsg]     = useState("");

  useEffect(() => {
    const unsub = subscribeFeeds(
      (list) => { setFeeds(list); setLoading(false); },
      (err)  => { setMsg(err.message); setLoading(false); },
      200
    );
    return unsub;
  }, []);

  async function handleDelete(feed: Feed) {
    if (!confirm(`"${feed.aiCopy}" 피드를 삭제할까요?`)) return;
    try {
      await deleteFeed(feed.id);
      setMsg("✅ 삭제 완료");
      setTimeout(() => setMsg(""), 2000);
    } catch (e) {
      setMsg(`❌ 삭제 실패: ${e instanceof Error ? e.message : "오류"}`);
    }
  }

  function timeAgo(date: Date) {
    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 60)    return "방금";
    if (diff < 3600)  return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    return `${Math.floor(diff / 86400)}일 전`;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-text-primary">📸 라이브피드 관리</h1>
          <p className="text-sm text-text-secondary">전체 피드 목록 · 삭제 가능</p>
        </div>
        <span className="rounded-full bg-jeju-green/10 px-3 py-1.5 text-xs font-bold text-jeju-green border border-jeju-green/20">
          {feeds.length}개
        </span>
      </div>

      {msg && (
        <div className="mb-4 rounded-xl bg-jeju-green/10 px-4 py-3 text-sm font-semibold text-jeju-green border border-jeju-green/20">
          {msg}
        </div>
      )}

      <div className="rounded-2xl border border-border-soft bg-bg-card shadow-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-orange/30 border-t-brand-orange" />
          </div>
        ) : feeds.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-3xl">📷</p>
            <p className="mt-3 text-sm font-bold text-text-primary">아직 피드가 없어요</p>
          </div>
        ) : (
          <div className="divide-y divide-border-soft">
            {feeds.map((feed) => {
              const date = feed.createdAt?.toDate?.() ?? new Date();
              return (
                <div key={feed.id} className="flex items-center gap-4 px-5 py-4 hover:bg-bg-secondary transition-colors">
                  {/* 썸네일 */}
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-200">
                    <Image
                      src={feed.imageUrl}
                      alt={feed.aiCopy}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>

                  {/* 정보 */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-sm font-bold text-text-primary truncate">{feed.aiCopy}</p>
                      <span className="rounded-full bg-bg-secondary px-2 py-0.5 text-[9px] text-text-secondary">
                        {feed.category}
                      </span>
                      {feed.regionName && (
                        <span className="rounded-full bg-brand-navy/10 px-2 py-0.5 text-[9px] text-brand-navy">
                          📍{feed.regionName}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-text-secondary">
                      {feed.authorName} · {timeAgo(date)} · ❤️ {feed.likes}
                    </p>
                    <p className="font-mono text-[9px] text-text-secondary truncate">{feed.authorId}</p>
                  </div>

                  {/* 삭제 버튼 */}
                  <button
                    type="button"
                    onClick={() => handleDelete(feed)}
                    className="shrink-0 rounded-lg bg-live-red/10 px-3 py-1.5 text-[11px] font-bold text-live-red hover:bg-live-red/20 transition-colors"
                  >
                    삭제
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
