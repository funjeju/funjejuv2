"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { FeedCard } from "@/components/feed/FeedCard";
import { FeedWriteModal } from "@/components/feed/FeedWriteModal";
import { subscribeFeeds } from "@/lib/feed";
import { useAuth } from "@/hooks/useAuth";
import type { Feed } from "@/types/feed";

const CATEGORIES = ["전체", "자연", "카페", "맛집", "액티비티", "숙소"];

export default function FeedPage() {
  const { user, signInWithGoogle } = useAuth();
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("전체");
  const [showWriter, setShowWriter] = useState(false);

  useEffect(() => {
    const unsub = subscribeFeeds((list) => {
      setFeeds(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtered = activeCategory === "전체"
    ? feeds
    : feeds.filter((f) => f.category === activeCategory);

  return (
    <div className="mx-auto max-w-screen-xl px-0 md:px-4 md:py-6">
      <PageHeader
        title="라이브 피드"
        subtitle="제주 여행자들의 실시간 순간"
        emoji="✨"
        right={
          <button
            type="button"
            onClick={() => {
              if (!user) return signInWithGoogle();
              setShowWriter(true);
            }}
            className="flex items-center gap-1.5 rounded-full bg-brand-orange px-4 py-2 text-xs font-bold text-white shadow-soft hover:bg-brand-orange/90 transition-colors"
          >
            <span>+</span> 피드 올리기
          </button>
        }
      />

      {/* 카테고리 탭 */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-3 md:px-0">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={[
              "shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
              activeCategory === cat
                ? "bg-text-primary text-white"
                : "border border-border-soft bg-bg-card text-text-secondary hover:bg-bg-secondary",
            ].join(" ")}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 피드 그리드 */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-orange/30 border-t-brand-orange" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center px-4">
          <p className="text-5xl">📷</p>
          <p className="mt-4 text-base font-bold text-text-primary">
            {activeCategory === "전체" ? "아직 피드가 없어요" : `${activeCategory} 카테고리에 피드가 없어요`}
          </p>
          <p className="mt-1 text-sm text-text-secondary">첫 번째 피드를 올려보세요!</p>
          <button
            type="button"
            onClick={() => {
              if (!user) return signInWithGoogle();
              setShowWriter(true);
            }}
            className="mt-4 rounded-full bg-brand-orange px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-orange/90 transition-colors"
          >
            + 피드 올리기
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 px-4 md:grid-cols-2 md:px-0 lg:grid-cols-3">
          {filtered.map((feed) => (
            <FeedCard key={feed.id} feed={feed} />
          ))}
        </div>
      )}

      {/* 작성 모달 */}
      <FeedWriteModal
        open={showWriter}
        onClose={() => setShowWriter(false)}
      />
    </div>
  );
}
