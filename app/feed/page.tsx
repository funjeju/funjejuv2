"use client";

import { useEffect, useState } from "react";
import { FeedCard } from "@/components/feed/FeedCard";
import { FeedWriteModal } from "@/components/feed/FeedWriteModal";
import { subscribeFeeds } from "@/lib/feed";
import { useAuth } from "@/hooks/useAuth";
import { groupRegionsByCity } from "@/constants/jeju-regions";
import type { Feed } from "@/types/feed";

const CATEGORIES = ["전체", "자연", "카페", "맛집", "액티비티", "숙소"];

export default function FeedPage() {
  const { user, signInWithGoogle } = useAuth();
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState("전체");
  const [activeRegion, setActiveRegion] = useState<string>("전체"); // regionId 또는 "전체" 또는 city 이름
  const [showWriter, setShowWriter] = useState(false);
  const [regionPanelOpen, setRegionPanelOpen] = useState(false);

  useEffect(() => {
    const unsub = subscribeFeeds(
      (list) => {
        setFeeds(list);
        setLoading(false);
        setError("");
      },
      (err) => {
        setError(err.message ?? "피드를 불러오지 못했어요");
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  // URL ?write=1 이면 자동 모달 (하단 + 버튼에서 진입)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("write") === "1") {
      setShowWriter(true);
      // URL 정리
      window.history.replaceState({}, "", "/feed");
    }
  }, []);

  // 하단 네비 피드(=올리기) 버튼이 보내는 이벤트 — 이미 /feed에 있을 때 업로드 모달 오픈
  useEffect(() => {
    const handler = () => {
      if (!user) { signInWithGoogle(); return; }
      setShowWriter(true);
    };
    window.addEventListener("funjeju:feed-write", handler);
    return () => window.removeEventListener("funjeju:feed-write", handler);
  }, [user, signInWithGoogle]);

  // 카테고리 + 지역 필터
  const filtered = feeds.filter((f) => {
    if (activeCategory !== "전체" && f.category !== activeCategory) return false;
    if (activeRegion === "전체") return true;
    if (activeRegion === "제주시" || activeRegion === "서귀포시") {
      return f.regionCity === activeRegion;
    }
    return f.regionId === activeRegion;
  });

  const { 제주시: jejuRegions, 서귀포시: seogwipoRegions } = groupRegionsByCity();

  return (
    <div className="mx-auto max-w-screen-xl px-0 pt-3 md:px-4 md:py-6">
      {/* 콘텐츠 카테고리 */}
      <div className="px-4 md:px-0">
        <p className="mb-1 text-[9px] font-bold text-text-secondary">🏷️ 카테고리</p>
        <div className="flex gap-1 overflow-x-auto pb-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={[
                "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold transition-colors",
                activeCategory === cat
                  ? "bg-text-primary text-white"
                  : "border border-border-soft bg-bg-card text-text-secondary hover:bg-bg-secondary",
              ].join(" ")}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 지역 필터 */}
      <div className="mb-3 px-4 md:px-0">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-[9px] font-bold text-text-secondary">📍 지역</p>
          <button
            type="button"
            onClick={() => setRegionPanelOpen((v) => !v)}
            className="text-[9px] font-semibold text-brand-orange hover:underline"
          >
            {regionPanelOpen ? "접기" : "전체 지역"}
          </button>
        </div>

        {/* 1차: 시 단위 */}
        <div className="flex gap-1 overflow-x-auto pb-1.5">
          {["전체", "제주시", "서귀포시"].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setActiveRegion(c)}
              className={[
                "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold transition-colors",
                activeRegion === c
                  ? "bg-brand-navy text-white"
                  : "border border-border-soft bg-bg-card text-text-secondary hover:bg-bg-secondary",
              ].join(" ")}
            >
              {c}
            </button>
          ))}
        </div>

        {/* 2차: 읍/면/동 단위 (확장 패널) */}
        {regionPanelOpen && (
          <div className="mt-2 space-y-2 rounded-2xl border border-border-soft bg-bg-card p-3 shadow-card">
            <div>
              <p className="mb-1.5 text-[10px] font-bold text-brand-navy">제주시</p>
              <div className="flex flex-wrap gap-1">
                {jejuRegions.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setActiveRegion(r.id)}
                    className={[
                      "rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors",
                      activeRegion === r.id
                        ? "bg-brand-orange text-white"
                        : "bg-bg-secondary text-text-secondary hover:bg-border-soft",
                    ].join(" ")}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-bold text-brand-navy">서귀포시</p>
              <div className="flex flex-wrap gap-1">
                {seogwipoRegions.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setActiveRegion(r.id)}
                    className={[
                      "rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors",
                      activeRegion === r.id
                        ? "bg-brand-orange text-white"
                        : "bg-bg-secondary text-text-secondary hover:bg-border-soft",
                    ].join(" ")}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 결과 카운트 */}
      <div className="mb-3 mx-4 flex items-center justify-between rounded-xl bg-jeju-green/10 border border-jeju-green/20 px-3 py-1.5 md:mx-0">
        <p className="text-[11px] font-medium text-text-primary">
          <span className="font-bold text-jeju-green">{filtered.length}개</span> 피드
        </p>
        {(activeCategory !== "전체" || activeRegion !== "전체") && (
          <button
            type="button"
            onClick={() => { setActiveCategory("전체"); setActiveRegion("전체"); }}
            className="text-[10px] font-semibold text-brand-orange hover:underline"
          >
            필터 초기화
          </button>
        )}
      </div>

      {/* 피드 그리드 */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-orange/30 border-t-brand-orange" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center py-16 text-center px-4">
          <p className="text-4xl">⚠️</p>
          <p className="mt-3 text-sm font-bold text-text-primary">피드를 불러오지 못했어요</p>
          <p className="mt-1 text-xs text-text-secondary">{error}</p>
          <p className="mt-2 text-[10px] text-text-secondary">
            Firebase Console → Firestore → 규칙에서 feeds 컬렉션 규칙을 게시했는지 확인해주세요.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center px-4">
          <p className="text-5xl">📷</p>
          <p className="mt-4 text-base font-bold text-text-primary">
            {feeds.length === 0 ? "아직 피드가 없어요" : "해당 조건의 피드가 없어요"}
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
