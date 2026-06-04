"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FeedCard } from "@/components/feed/FeedCard";
import { fetchFeeds } from "@/lib/feed";
import type { Feed } from "@/types/feed";

const CATEGORIES = ["전체", "자연", "카페", "맛집", "액티비티"];

export function HomeFeedSection() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("전체");

  useEffect(() => {
    fetchFeeds(8)
      .then((list) => {
        setFeeds(list);
        setLoading(false);
      })
      .catch((err) => {
        console.error("[HomeFeedSection]", err);
        setFeeds([]);
        setLoading(false);
      });
  }, []);

  const filtered = activeCategory === "전체"
    ? feeds
    : feeds.filter((f) => f.category === activeCategory);

  return (
    <section className="px-4 md:px-0">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-text-primary md:text-lg">
          라이브 피드 <span className="text-brand-yellow">✨</span>
        </h2>
        <Link href="/feed" className="text-xs font-medium text-brand-orange">
          전체보기 →
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveCategory(tab)}
            className={[
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              activeCategory === tab
                ? "bg-text-primary text-white"
                : "border border-border-soft bg-bg-card text-text-secondary hover:bg-bg-secondary",
            ].join(" ")}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-[4/5] animate-pulse rounded-xl bg-bg-secondary" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border-soft bg-bg-secondary/40 py-12 text-center">
          <p className="text-3xl">📷</p>
          <p className="mt-2 text-sm font-bold text-text-primary">아직 피드가 없어요</p>
          <p className="mt-1 text-xs text-text-secondary">첫 피드를 올려보세요!</p>
          <Link
            href="/feed"
            className="mt-3 rounded-full bg-brand-orange px-4 py-2 text-xs font-bold text-white hover:bg-brand-orange/90 transition-colors"
          >
            + 피드 올리기
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {filtered.slice(0, 4).map((feed) => (
            <FeedCard key={feed.id} feed={feed} />
          ))}
        </div>
      )}

      <Link
        href="/feed"
        className="mt-4 block w-full rounded-full border border-border-soft bg-bg-card py-3 text-center text-sm font-semibold text-text-secondary hover:bg-bg-secondary transition-colors"
      >
        더 많은 피드 보기 ∨
      </Link>
    </section>
  );
}
