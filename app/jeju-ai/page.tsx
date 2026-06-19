import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/common/PageHeader";

const SITE = "https://funjeju.com";

export const metadata: Metadata = {
  title: "제주여행 AI — AI 도슨트 챗봇·AI 여행 일정 | 펀제주",
  description: "제주 여행, AI에게 물어보세요. 도민맛집·코스·명소를 추천하는 AI 도슨트 챗봇과, 일정을 짜주는 AI 여행 일정 플래너.",
  alternates: { canonical: `${SITE}/jeju-ai` },
  keywords: ["제주여행 AI", "제주 AI 챗봇", "제주 AI 여행일정", "제주 여행 추천", "AI 도슨트", "펀제주"],
  openGraph: { type: "website", url: `${SITE}/jeju-ai`, title: "제주여행 AI — 챗봇·여행일정", description: "제주 여행을 AI가 도와드려요", siteName: "펀제주" },
};

const CHAT_SAMPLES = ["성산 흑돼지 맛집", "애월 카페 추천", "한라산 코스", "비 오는 날 가볼 곳"];

export default function JejuAiPage() {
  return (
    <div className="mx-auto max-w-screen-md px-4 py-6">
      <PageHeader title="제주여행 AI" subtitle="물어보고, 일정까지 — AI가 제주 여행을 도와드려요" emoji="🤖" />

      {/* AI 도슨트 챗봇 */}
      <section className="mt-6 rounded-2xl border border-border-soft bg-bg-card p-5 shadow-card">
        <h2 className="text-lg font-black text-text-primary">🤖 AI 도슨트 챗봇</h2>
        <p className="mt-1.5 text-sm leading-7 text-text-secondary">
          제주 어디가 좋은지, 뭘 먹을지 망설여질 때. 도민맛집 데이터와 실시간 정보를 바탕으로 AI 도슨트 <b>돌AI</b>가 맛집·명소·코스를 추천하고, 제주어로도 대화해요.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {CHAT_SAMPLES.map((s) => (
            <Link key={s} href={`/chat?q=${encodeURIComponent(s)}`} className="rounded-full border border-brand-navy/30 bg-white px-3 py-1 text-xs font-bold text-brand-navy hover:bg-brand-navy hover:text-white hover:border-brand-navy transition-colors">{s}</Link>
          ))}
        </div>
        <Link href="/chat" className="mt-4 inline-block rounded-full bg-brand-navy px-5 py-2.5 text-sm font-bold text-white hover:brightness-110">💬 챗봇 시작하기 →</Link>
      </section>

      {/* AI 여행 일정 */}
      <section className="mt-4 rounded-2xl border border-border-soft bg-bg-card p-5 shadow-card">
        <h2 className="text-lg font-black text-text-primary">🗓️ AI 여행 일정</h2>
        <p className="mt-1.5 text-sm leading-7 text-text-secondary">
          여행 기간·도착시간·취향만 입력하면 AI가 동선까지 고려해 <b>날짜별 제주 여행 일정</b>을 짜드려요. 찜한 스팟·숙소를 반영하고, 일정은 저장·수정할 수 있어요.
        </p>
        <Link href="/trip-ai" className="mt-4 inline-block rounded-full bg-brand-orange px-5 py-2.5 text-sm font-bold text-white hover:brightness-110">🗓️ 여행 일정 만들기 →</Link>
      </section>
    </div>
  );
}
