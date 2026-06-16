"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/common/PageHeader";
import { DolmangyiIcon } from "@/components/common/DolmangyiIcon";
import { useAuth } from "@/hooks/useAuth";
import { useCctvFavorite } from "@/hooks/useCctvFavorite";
import { useMySpot } from "@/hooks/useMySpot";
import { getAuthor, countMyFeeds, updateUserProfile } from "@/lib/feed";
import { listTripPlans, deleteTripPlan } from "@/lib/trip-plans";
import { getEntitlements } from "@/lib/entitlements";
import { mockCctvs } from "@/constants/mock-cctvs";
import { HlsMiniPlayer } from "@/components/cctv/HlsMiniPlayer";
import { BusinessCtaSettings } from "@/components/mypage/BusinessCtaSettings";
import { MyBizSites } from "@/components/mypage/MyBizSites";
import { ExternalHomepagesManager } from "@/components/mypage/ExternalHomepagesManager";
import { MySpotsManager } from "@/components/mypage/MySpotsManager";
import type { FeedAuthor } from "@/types/feed";
import type { SavedTripPlan } from "@/types/trip";

const ADMIN_EMAIL = "naggu1999@gmail.com";

const menuItems = [
  { label: "저장한 스팟", href: "/saved",   emoji: "⭐" },
  { label: "내 여행 일정", href: "/trip-ai", emoji: "🗓️" },
  { label: "내 피드",     href: "/feed",    emoji: "📸" },
  { label: "알림 설정",   href: "#",        emoji: "🔔" },
  { label: "앱 설정",     href: "#",        emoji: "⚙️" },
];

export default function MyPage() {
  const { user, loading, signInWithGoogle, logout } = useAuth();
  const { favoriteIds } = useCctvFavorite();
  const { spotIds: mySpotIds } = useMySpot();
  const [author, setAuthor] = useState<FeedAuthor | null>(null);
  const [viewMode, setViewMode] = useState<"personal" | "business">("personal");
  const [tripPlans, setTripPlans] = useState<SavedTripPlan[]>([]);
  const [feedCount, setFeedCount] = useState<number | null>(null);
  const [editingNick, setEditingNick] = useState(false);
  const [nickInput, setNickInput] = useState("");
  const [savingNick, setSavingNick] = useState(false);

  async function saveNickname() {
    if (!user || savingNick) return;
    const nickname = nickInput.trim().slice(0, 20);
    setSavingNick(true);
    try {
      await updateUserProfile(user.uid, { nickname });
      setAuthor((prev) =>
        prev
          ? { ...prev, nickname }
          : { uid: user.uid, displayName: user.displayName ?? "", nickname, photoURL: user.photoURL ?? null, isBusiness: false }
      );
      setEditingNick(false);
    } catch {
      alert("닉네임 저장에 실패했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setSavingNick(false);
    }
  }

  const isAdmin = user?.email === ADMIN_EMAIL;
  // 멤버십 — 정식 모드 전이라 users.plan은 아직 미사용(베타는 로그인 여부만 봄)
  const entitlements = getEntitlements({ loggedIn: !!user });

  useEffect(() => {
    if (!user) return;
    getAuthor(user.uid).then(setAuthor);
    listTripPlans(user.uid).then(setTripPlans).catch(() => setTripPlans([]));
    countMyFeeds(user.uid).then(setFeedCount).catch(() => setFeedCount(0));
  }, [user]);

  const handleDeleteTripPlan = async (planId: string) => {
    if (!user) return;
    setTripPlans((prev) => prev.filter((p) => p.id !== planId));
    try { await deleteTripPlan(user.uid, planId); } catch { /* 다음 로드에서 동기화 */ }
  };

  const stats = [
    { label: "마이스팟", value: String(mySpotIds.size), emoji: "📍", href: "/saved" },
    { label: "작성한 피드", value: feedCount === null ? "…" : String(feedCount), emoji: "📸", href: "/feed" },
    { label: "완성한 일정", value: String(tripPlans.length), emoji: "🗓️", href: "/trip-ai" },
  ];

  if (!loading && !user) {
    return (
      <div className="mx-auto max-w-screen-xl px-0 md:px-4 md:py-6">
        <PageHeader title="마이페이지" emoji="👤" />
        <div className="flex flex-col items-center py-20 text-center px-4">
          <DolmangyiIcon size={64} />
          <h2 className="mt-4 text-lg font-black text-text-primary">로그인이 필요해요</h2>
          <p className="mt-1 text-sm text-text-secondary">저장한 스팟과 여행 일정을 관리하려면 로그인하세요</p>
          <button
            type="button"
            onClick={signInWithGoogle}
            className="mt-6 flex items-center gap-2 rounded-full bg-brand-navy px-6 py-3 text-sm font-bold text-white shadow-soft hover:bg-brand-navy/90 transition-colors"
          >
            Google로 시작하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-xl px-0 md:px-4 md:py-6">
      <PageHeader title="마이페이지" emoji="👤" />

      {/* Profile Card */}
      <div className="mx-4 mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-navy to-blue-700 p-5 text-white md:mx-0">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-white/20">
            {user?.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoURL} alt="" className="h-full w-full object-cover" />
            ) : (
              <DolmangyiIcon size={40} className="shrink-0" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-lg font-black">{author?.nickname || user?.displayName || "제주 여행자"}</p>
              <button
                type="button"
                onClick={() => { setNickInput(author?.nickname || ""); setEditingNick(true); }}
                className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-white/30"
              >
                ✏️ 닉네임
              </button>
            </div>
            <p className="truncate text-sm text-white/70">{user?.email}</p>
            {editingNick && (
              <div className="mt-2 flex items-center gap-1.5">
                <input
                  type="text"
                  value={nickInput}
                  onChange={(e) => setNickInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveNickname()}
                  maxLength={20}
                  autoFocus
                  placeholder="표시할 닉네임 (최대 20자)"
                  className="min-w-0 flex-1 rounded-lg bg-white px-2.5 py-1.5 text-sm font-bold text-text-primary outline-none"
                />
                <button type="button" onClick={saveNickname} disabled={savingNick}
                  className="shrink-0 rounded-lg bg-brand-yellow px-3 py-1.5 text-xs font-black text-brand-navy disabled:opacity-50">
                  {savingNick ? "…" : "저장"}
                </button>
                <button type="button" onClick={() => setEditingNick(false)}
                  className="shrink-0 rounded-lg bg-white/20 px-2.5 py-1.5 text-xs font-bold text-white">취소</button>
              </div>
            )}
            <div className="mt-1 flex flex-wrap gap-1">
              {author?.isBusiness && (
                <span className="rounded-full bg-brand-orange px-2 py-0.5 text-[10px] font-black text-white">
                  💼 비즈니스
                </span>
              )}
              {isAdmin && (
                <span className="rounded-full bg-yellow-400 px-2 py-0.5 text-[10px] font-black text-brand-navy">
                  👑 관리자
                </span>
              )}
              {!author?.isBusiness && !isAdmin && (
                <span className="rounded-full bg-brand-yellow px-2 py-0.5 text-[10px] font-black text-brand-navy">
                  🏝️ 제주 탐험가
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="shrink-0 rounded-full border border-white/30 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 transition-colors"
          >
            로그아웃
          </button>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 divide-x divide-white/20 rounded-xl bg-white/10">
          {stats.map((s) => (
            <Link key={s.label} href={s.href} className="flex flex-col items-center py-3 transition-colors hover:bg-white/10 active:bg-white/15">
              <span className="text-xl">{s.emoji}</span>
              <span className="text-lg font-black">{s.value}</span>
              <span className="text-[10px] text-white/70">{s.label} ›</span>
            </Link>
          ))}
        </div>
      </div>

      {/* 멤버십 카드 */}
      <div className="mx-4 mb-4 flex items-center gap-3 rounded-2xl border border-brand-orange/30 bg-brand-orange/5 px-4 py-3 md:mx-0">
        <span className="text-2xl">💎</span>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-bold text-text-primary">{entitlements.planLabel}</p>
            {entitlements.betaPerks && (
              <span className="rounded-full bg-brand-navy px-2 py-0.5 text-[9px] font-black text-white">시범 무료</span>
            )}
          </div>
          <p className="text-[11px] text-text-secondary">
            {entitlements.betaPerks
              ? "모든 기능을 자유롭게 이용하고 있어요!"
              : "제주 여행을 더 편하게 즐겨보세요."}
          </p>
        </div>
        {/* 정식 요금제 확정 전까지 임시 숨김
        <Link
          href="/pricing"
          className="shrink-0 rounded-full bg-brand-orange px-3 py-1.5 text-[11px] font-bold text-white hover:bg-brand-orange/90 transition-colors"
        >
          요금제 보기 →
        </Link>
        */}
      </div>

      {/* Admin 바로가기 */}
      {isAdmin && (
        <div className="mx-4 mb-4 flex items-center gap-3 rounded-2xl border border-yellow-300/40 bg-yellow-50 px-4 py-3 md:mx-0">
          <span className="text-2xl">👑</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-text-primary">관리자 패널</p>
            <p className="text-[11px] text-text-secondary">CCTV 관리, 사용자 비즈니스 승인</p>
          </div>
          <Link
            href="/admin/cctv"
            className="shrink-0 rounded-full bg-brand-navy px-3 py-1.5 text-[11px] font-bold text-white hover:bg-brand-navy/90 transition-colors"
          >
            Admin →
          </Link>
        </div>
      )}

      {/* 비즈니스/개인 뷰 토글 — isBusiness일 때만 표시 */}
      {author?.isBusiness && (
        <div className="mx-4 mb-4 flex rounded-2xl border border-border-soft bg-bg-card p-1 shadow-card md:mx-0">
          <button
            type="button"
            onClick={() => setViewMode("personal")}
            className={[
              "flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors",
              viewMode === "personal"
                ? "bg-brand-navy text-white shadow-soft"
                : "text-text-secondary hover:text-text-primary",
            ].join(" ")}
          >
            👤 개인
          </button>
          <button
            type="button"
            onClick={() => setViewMode("business")}
            className={[
              "flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors",
              viewMode === "business"
                ? "bg-brand-orange text-white shadow-soft"
                : "text-text-secondary hover:text-text-primary",
            ].join(" ")}
          >
            💼 비즈니스
          </button>
        </div>
      )}

      {/* ── 개인 뷰 ── */}
      {viewMode === "personal" && (
        <>
          {/* Mascot CTA */}
          <div className="mx-4 mb-5 flex items-center gap-3 rounded-2xl border border-brand-yellow/30 bg-brand-yellow/20 px-4 py-3 md:mx-0">
            <DolmangyiIcon size={40} className="shrink-0" />
            <div>
              <p className="text-sm font-bold text-text-primary">돌AI가 일정을 추천해드릴게요!</p>
              <p className="text-[11px] text-text-secondary">마이스팟 {mySpotIds.size}개로 최적 동선 만들기</p>
            </div>
            <Link
              href="/trip-ai"
              className="ml-auto shrink-0 rounded-full bg-brand-orange px-3 py-1.5 text-[11px] font-bold text-white hover:bg-brand-orange/90 transition-colors"
            >
              일정 만들기
            </Link>
          </div>

          {/* 마이스팟 */}
          <MySpotsManager />

          {/* 내 여행 일정 */}
          {tripPlans.length > 0 && (
            <section className="mx-4 mb-5 md:mx-0">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-bold text-text-primary">
                  🗓️ 내 여행 일정
                  <span className="rounded-full bg-brand-orange/10 px-2 py-0.5 text-[10px] font-bold text-brand-orange">
                    {tripPlans.length}
                  </span>
                </h2>
                <Link href="/trip-ai" className="text-xs font-medium text-brand-orange">
                  새 일정 만들기 →
                </Link>
              </div>
              <div className="space-y-2">
                {tripPlans.slice(0, 5).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 rounded-2xl border border-border-soft bg-bg-card px-4 py-3 shadow-card"
                  >
                    <Link href={`/trip-ai?plan=${p.id}`} className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-text-primary">{p.title}</p>
                      <p className="mt-0.5 text-[10px] text-text-secondary">
                        {p.nights === 0 ? "당일치기" : `${p.nights}박 ${p.days}일`} · {p.transportation}
                        {p.createdAt > 0 && ` · ${new Date(p.createdAt).toLocaleDateString("ko-KR")}`}
                      </p>
                    </Link>
                    <Link
                      href={`/trip-ai?plan=${p.id}`}
                      className="shrink-0 rounded-full bg-brand-orange/10 px-3 py-1.5 text-[10px] font-bold text-brand-orange hover:bg-brand-orange hover:text-white transition-colors"
                    >
                      보기
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDeleteTripPlan(p.id)}
                      className="shrink-0 text-xs text-text-secondary hover:text-live-red transition-colors"
                      aria-label="일정 삭제"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 즐겨찾기 CCTV */}
          {(() => {
            const savedCctvs = mockCctvs.filter((c) => favoriteIds.has(c.id));
            if (savedCctvs.length === 0) return null;
            return (
              <section className="mx-4 mb-5 md:mx-0">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-sm font-bold text-text-primary">
                    📷 내 즐겨찾기 CCTV
                    <span className="rounded-full bg-brand-orange/10 px-2 py-0.5 text-[10px] font-bold text-brand-orange">
                      {savedCctvs.length}
                    </span>
                  </h2>
                  <Link href="/cctv/multiview" className="text-xs font-medium text-brand-orange">
                    4분할로 보기 →
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                  {savedCctvs.map((cctv) => (
                    <HlsMiniPlayer
                      key={cctv.id}
                      id={cctv.id}
                      proxyUrl={cctv.streamProxyUrl}
                      name={cctv.name}
                    />
                  ))}
                </div>
              </section>
            );
          })()}

          {/* Menu */}
          <div className="mx-4 overflow-hidden rounded-2xl border border-border-soft bg-bg-card shadow-card md:mx-0">
            {menuItems.map((item, i) => (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex items-center gap-3 px-4 py-4 hover:bg-bg-secondary transition-colors",
                  i !== menuItems.length - 1 ? "border-b border-border-soft" : "",
                ].join(" ")}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-bg-secondary text-xl">
                  {item.emoji}
                </span>
                <span className="flex-1 text-sm font-semibold text-text-primary">{item.label}</span>
                <span className="text-text-secondary">›</span>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* ── 비즈니스 뷰 ── */}
      {viewMode === "business" && author?.isBusiness && (
        <>
          {/* 비즈니스 상태 요약 */}
          <div className="mx-4 mb-4 rounded-2xl border border-brand-orange/20 bg-brand-orange/5 p-4 md:mx-0">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xl">💼</span>
              <h3 className="text-sm font-bold text-text-primary">비즈니스 계정</h3>
              <span className="rounded-full bg-jeju-green/10 px-2 py-0.5 text-[10px] font-bold text-jeju-green">
                ✓ 인증됨
              </span>
            </div>
            <p className="text-xs leading-relaxed text-text-secondary">
              피드를 올리면 자동으로 CTA 버튼이 노출됩니다.
              아래에서 버튼 텍스트, 링크, 스타일을 설정하세요.
            </p>
          </div>

          {/* 홈페이지 만들기 — 눈에 띄는 메인 액션 */}
          <Link
            href="/biz/create"
            className="mx-4 mb-4 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-brand-orange to-amber-500 px-5 py-4 text-white shadow-card transition-transform hover:scale-[1.01] md:mx-0"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-2xl">🏠</span>
            <div className="flex-1">
              <p className="text-base font-black">홈페이지 만들기</p>
              <p className="text-[11px] text-white/85">상호명만 입력하면 AI가 1분 만에 홈페이지를 만들어드려요</p>
            </div>
            <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-black text-brand-orange">시작하기 →</span>
          </Link>

          {/* 내 홈페이지 목록 (생성형) + 외부 홈페이지 링크 */}
          <MyBizSites />
          <ExternalHomepagesManager />

          {/* CTA 설정 — 비즈니스 전용 */}
          <BusinessCtaSettings />

          {/* 비즈니스 메뉴 */}
          <div className="mx-4 mt-2 overflow-hidden rounded-2xl border border-border-soft bg-bg-card shadow-card md:mx-0">
            <Link href="/feed" className="flex items-center gap-3 border-b border-border-soft px-4 py-4 hover:bg-bg-secondary transition-colors">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-bg-secondary text-xl">📸</span>
              <span className="flex-1 text-sm font-semibold text-text-primary">내 피드 관리</span>
              <span className="text-text-secondary">›</span>
            </Link>
            <Link href="/feed" className="flex items-center gap-3 px-4 py-4 hover:bg-bg-secondary transition-colors">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-bg-secondary text-xl">📊</span>
              <span className="flex-1 text-sm font-semibold text-text-primary">피드 통계</span>
              <span className="ml-auto text-[10px] text-text-secondary">준비 중</span>
              <span className="text-text-secondary">›</span>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
