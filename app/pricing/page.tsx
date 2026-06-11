"use client";

import Link from "next/link";
import { PageHeader } from "@/components/common/PageHeader";
import { DolmangyiIcon } from "@/components/common/DolmangyiIcon";
import { useAuth } from "@/hooks/useAuth";
import { PLANS, PAID_PLAN_ORDER, SERVICE_MODE } from "@/lib/plans";

function won(n: number): string {
  return n === 0 ? "무료" : `₩${n.toLocaleString()}`;
}

export default function PricingPage() {
  const { user, signInWithGoogle } = useAuth();
  const isBeta = SERVICE_MODE === "beta";

  return (
    <div className="mx-auto max-w-5xl px-0 md:px-4 md:py-6">
      <PageHeader title="요금제" subtitle="제주 전역 CCTV를 가장 편하게 보는 단 하나의 방법" emoji="💎" />

      <div className="px-4 md:px-0">
        {/* 베타 배너 */}
        {isBeta && (
          <div className="mb-5 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-brand-navy to-blue-600 p-4 text-white">
            <DolmangyiIcon size={40} className="shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-black">🎉 지금은 시범 서비스 기간!</p>
              <p className="mt-0.5 text-[11px] leading-5 text-white/85">
                아래 요금제는 <strong>곧 이렇게</strong> 운영될 예정이에요. 베타 기간에는 <strong>로그인만 하면 멀티뷰 9분할까지 거의 모든 기능을 무료로</strong> 써볼 수 있어요!
              </p>
              {!user && (
                <button
                  type="button"
                  onClick={signInWithGoogle}
                  className="mt-2 rounded-full bg-brand-yellow px-4 py-1.5 text-[11px] font-black text-brand-navy hover:bg-brand-yellow/90 transition-colors"
                >
                  로그인하고 전체 기능 써보기
                </button>
              )}
            </div>
          </div>
        )}

        {/* 가격 카드 */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PAID_PLAN_ORDER.map((id) => {
            const plan = PLANS[id];
            return (
              <div
                key={id}
                className={[
                  "relative flex flex-col rounded-2xl border bg-bg-card p-5 shadow-card",
                  plan.highlight ? "border-brand-orange ring-2 ring-brand-orange/30" : "border-border-soft",
                ].join(" ")}
              >
                {plan.highlight && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-brand-orange px-3 py-0.5 text-[10px] font-black text-white">
                    인기
                  </span>
                )}
                <p className="text-sm font-black text-text-primary">{plan.label}</p>
                <p className="mt-0.5 text-[11px] text-text-secondary">{plan.tagline}</p>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-text-primary">{won(plan.priceMonthly)}</span>
                  {plan.priceMonthly > 0 && <span className="text-[11px] text-text-secondary">/월</span>}
                </div>
                {plan.needsBizVerify && (
                  <span className="mt-1 inline-block w-fit rounded-full bg-brand-navy/10 px-2 py-0.5 text-[9px] font-bold text-brand-navy">
                    사업자 증빙 필요
                  </span>
                )}
                <ul className="mt-4 flex-1 space-y-1.5">
                  {plan.perks.map((perk, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px] leading-5 text-text-primary">
                      <span className="mt-0.5 shrink-0 text-jeju-green">✓</span>
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled
                  className="mt-4 w-full cursor-not-allowed rounded-xl bg-bg-secondary py-2.5 text-xs font-bold text-text-secondary"
                  title="결제는 정식 오픈 시 제공됩니다"
                >
                  {isBeta ? "준비 중" : "시작하기"}
                </button>
              </div>
            );
          })}
        </div>

        {/* 시청시간 안내 */}
        <div className="mt-5 rounded-2xl border border-border-soft bg-bg-secondary/40 p-4">
          <p className="mb-1.5 text-xs font-bold text-text-primary">⏱ CCTV 시청시간은 이렇게 계산돼요</p>
          <p className="text-[11px] leading-5 text-text-secondary">
            화면을 여러 개 동시에 켜면 그만큼 빨리 차감돼요. <strong>4분할로 보면 1분에 4분씩</strong> 줄어드는 식이에요.
            남은 시청시간은 CCTV 페이지 상단에 카운트다운으로 표시될 예정이에요.
          </p>
        </div>

        {/* 비즈니스 강조 */}
        <div className="mt-3 flex flex-col gap-3 rounded-2xl bg-gradient-to-br from-brand-navy to-blue-700 p-5 text-white sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="text-sm font-black">🏪 사장님이라면 — 비즈니스</p>
            <p className="mt-1 text-[11px] leading-5 text-white/85">
              매장 모니터에 <strong>광고 없이 9분할 제주 라이브</strong>를 상시 송출하고,
              <strong> 상호만 입력하면 원페이지 홍보 홈페이지</strong>가 자동으로 만들어져요. 제주에서 우리만 되는 조합이에요.
            </p>
          </div>
        </div>

        <p className="mt-5 text-center text-[10px] text-text-secondary">
          요금은 부가세 포함 예정 · 정식 오픈 시 결제가 제공됩니다 ·{" "}
          <Link href="/mypage" className="font-bold text-brand-orange">내 멤버십 보기</Link>
        </p>
      </div>
    </div>
  );
}
