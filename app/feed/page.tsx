"use client";

import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";

const tabs = ["전체", "자연", "카페", "맛집", "액티비티", "숙소"];

const ALL_POSTS = [
  { id: 1, emoji: "🌊", text: "오늘 삼산 드라이브 최고였어요! 바다 색깔 미쳤다", user: "jeju_love_0", avatar: "J", time: "2시간 전", likes: 128, tag: "자연" },
  { id: 2, emoji: "☕", text: "바다 보며 커피 한잔 ☕ 뷰가 너무 좋아요", user: "cafe_jeju", avatar: "C", time: "3시간 전", likes: 97, tag: "카페" },
  { id: 3, emoji: "🍖", text: "흑돼지 진짜 맛집 발견! 줄 서도 먹을 만해요", user: "yum_jeju", avatar: "Y", time: "4시간 전", likes: 153, tag: "맛집" },
  { id: 4, emoji: "🏖️", text: "협재 바다색 미쳤다..💙 투명도 실화냐", user: "beach_day", avatar: "B", time: "5시간 전", likes: 209, tag: "자연" },
  { id: 5, emoji: "🍊", text: "귤이 주렁주렁 🍊 직접 따서 먹는 체험 최고", user: "orange_jeju", avatar: "O", time: "6시간 전", likes: 87, tag: "액티비티" },
  { id: 6, emoji: "🌿", text: "제주 바람은 늘 좋다 걷기만 해도 힐링", user: "slow_moment", avatar: "S", time: "7시간 전", likes: 75, tag: "자연" },
  { id: 7, emoji: "🌅", text: "노을 찰칵 인생샷..📸 성산 일출봉 뷰포인트", user: "film_jeju", avatar: "F", time: "8시간 전", likes: 112, tag: "자연" },
  { id: 8, emoji: "🍱", text: "오션뷰 점심 최고! 해산물 한상 차려줘서 감동", user: "delicious_jeju", avatar: "D", time: "8시간 전", likes: 66, tag: "맛집" },
  { id: 9, emoji: "🏄", text: "서핑 처음 배웠는데 재밌다!! 중문 추천", user: "surf_jeju", avatar: "S", time: "9시간 전", likes: 143, tag: "액티비티" },
  { id: 10, emoji: "🌺", text: "카멜리아힐 꽃 너무 예쁘다 봄이다 진짜", user: "flower_jeju", avatar: "F", time: "10시간 전", likes: 201, tag: "자연" },
  { id: 11, emoji: "🫖", text: "오설록에서 녹차 아이스크림 🍵 필수 코스", user: "tea_jeju", avatar: "T", time: "11시간 전", likes: 88, tag: "카페" },
  { id: 12, emoji: "🐟", text: "자리물회 처음 먹어봤는데 이게 진짜 제주 맛", user: "local_jeju", avatar: "L", time: "12시간 전", likes: 94, tag: "맛집" },
  { id: 13, emoji: "🏨", text: "오션뷰 풀빌라 강추 완전 힐링됐어요", user: "villa_jeju", avatar: "V", time: "13시간 전", likes: 176, tag: "숙소" },
  { id: 14, emoji: "🎣", text: "갈치낚시 체험 첫도전! 생각보다 엄청 잡힘", user: "fish_jeju", avatar: "F", time: "14시간 전", likes: 63, tag: "액티비티" },
];

export default function FeedPage() {
  const [activeTab, setActiveTab] = useState("전체");
  const [sortBy, setSortBy] = useState<"latest" | "popular">("latest");
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());

  const filtered = ALL_POSTS
    .filter((p) => activeTab === "전체" || p.tag === activeTab)
    .sort((a, b) => sortBy === "popular" ? b.likes - a.likes : b.id - a.id);

  function toggleLike(id: number) {
    setLikedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-screen-xl px-0 md:px-4 md:py-6">
      <PageHeader
        title="라이브 피드"
        subtitle="제주 여행자들의 실시간 순간을 함께 나눠요"
        emoji="✨"
        right={
          <button type="button" className="flex items-center gap-1.5 rounded-full bg-brand-orange px-4 py-2 text-xs font-bold text-white shadow-soft hover:bg-brand-orange/90 transition-colors">
            <span>+</span> 피드 올리기
          </button>
        }
      />

      {/* Filter row */}
      <div className="flex items-center justify-between gap-3 px-4 md:px-0">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={[
                "shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
                activeTab === tab
                  ? "bg-text-primary text-white"
                  : "border border-border-soft bg-bg-card text-text-secondary hover:bg-bg-secondary",
              ].join(" ")}
            >
              {tab}
            </button>
          ))}
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "latest" | "popular")}
          className="shrink-0 rounded-full border border-border-soft bg-bg-card px-3 py-1.5 text-xs font-medium text-text-secondary outline-none"
        >
          <option value="latest">최신순</option>
          <option value="popular">인기순</option>
        </select>
      </div>

      {/* Feed grid */}
      <div className="mt-4 grid grid-cols-2 gap-3 px-4 md:grid-cols-3 md:px-0 lg:grid-cols-4">
        {filtered.map((post) => {
          const liked = likedIds.has(post.id);
          return (
            <div
              key={post.id}
              className="group overflow-hidden rounded-2xl border border-border-soft bg-bg-card shadow-card transition-transform hover:scale-[1.02]"
            >
              <div className="relative flex aspect-square items-center justify-center bg-gradient-to-br from-sky-100 via-teal-50 to-blue-50 text-5xl">
                {post.emoji}
                <span className="absolute right-2 top-2 rounded-full bg-bg-secondary px-1.5 py-0.5 text-[9px] font-semibold text-text-secondary">
                  {post.tag}
                </span>
              </div>
              <div className="p-3">
                <p className="line-clamp-2 text-xs font-medium leading-5 text-text-primary">{post.text}</p>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-orange/20 text-[9px] font-bold text-brand-orange">
                      {post.avatar}
                    </div>
                    <span className="text-[10px] text-text-secondary">{post.time}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleLike(post.id)}
                    className="flex items-center gap-0.5 text-[10px] font-semibold transition-transform active:scale-125"
                  >
                    <span>{liked ? "❤️" : "🤍"}</span>
                    <span className={liked ? "text-live-red" : "text-text-secondary"}>
                      {post.likes + (liked ? 1 : 0)}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center py-16 text-center">
          <p className="text-4xl">📷</p>
          <p className="mt-3 text-sm font-bold text-text-primary">해당 카테고리 피드가 없어요</p>
          <button type="button" onClick={() => setActiveTab("전체")} className="mt-2 text-xs text-brand-orange underline">
            전체 보기
          </button>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="mt-6 px-4 md:px-0">
          <button type="button" className="w-full rounded-full border border-border-soft bg-bg-card py-3.5 text-sm font-semibold text-text-secondary shadow-card hover:bg-bg-secondary transition-colors">
            더 많은 피드 보기 ∨
          </button>
        </div>
      )}
    </div>
  );
}
