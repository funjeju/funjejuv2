import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/common/PageHeader";
import { listLocations } from "@/lib/cctv-location";

// 제주 실시간 Q&A 허브 — 펀제주 1차 데이터(실시간 CCTV·날씨·맛집)로 질문에 직답.
// AEO/GEO: 질문형 H2 + 40~60자 직답 + FAQPage 스키마 + 내부링크 → AI 답변엔진 인용 최적.
export const revalidate = 3600;

const SITE = "https://funjeju.com";

export const metadata: Metadata = {
  title: "제주 실시간 Q&A — 지금 날씨·실시간 CCTV·도민맛집 질문 모음 | 펀제주",
  description: "제주 실시간 날씨·CCTV·도민맛집·여행에 대한 자주 묻는 질문에 펀제주의 실시간 데이터로 바로 답합니다.",
  alternates: { canonical: `${SITE}/qna` },
  keywords: ["제주 실시간", "제주 지금 날씨", "제주 실시간 CCTV", "제주 질문", "제주 여행 FAQ", "펀제주"],
  openGraph: { type: "website", url: `${SITE}/qna`, title: "제주 실시간 Q&A — 펀제주", description: "제주 실시간 날씨·CCTV·맛집 질문에 바로 답", siteName: "펀제주" },
};

type QA = { q: string; a: string; href?: string; hrefLabel?: string };

// 큐레이션 메타 Q&A (펀제주 고유 데이터 기반 직답)
const CURATED: { group: string; items: QA[] }[] = [
  {
    group: "실시간 · 날씨",
    items: [
      { q: "제주 실시간 날씨를 어떻게 확인하나요?", a: "제주 실시간 날씨는 펀제주의 실시간 CCTV로 확인합니다. 협재·함덕·성산 등 제주 전역 57개 지점의 현재 하늘·바다·도로 상황을 지연 없이 볼 수 있습니다.", href: "/cctv", hrefLabel: "실시간 CCTV 보기" },
      { q: "지금 제주에 비가 오나요?", a: "제주는 지역마다 날씨가 크게 다릅니다. 실시간 CCTV로 가고 싶은 해변·도로의 현재 강수·하늘 상태를 직접 눈으로 확인하는 것이 가장 정확합니다.", href: "/cctv", hrefLabel: "지역별 실시간 확인" },
      { q: "여러 지역 제주 날씨를 한눈에 보려면?", a: "펀제주 멀티뷰로 최대 4개 지역의 실시간 CCTV를 동시에 볼 수 있습니다. 어느 해변이 맑은지 한 화면에서 비교됩니다.", href: "/cctv/multiview", hrefLabel: "멀티뷰로 보기" },
    ],
  },
  {
    group: "맛집 · 여행",
    items: [
      { q: "제주 도민(현지인) 추천 맛집은 어디서 찾나요?", a: "펀제주 도민맛집에서 제주 현지인이 추천하는 맛집 589곳을 지역·메뉴별로 찾을 수 있습니다. 관광지 식당이 아닌 동네 단골집 위주입니다.", href: "/food", hrefLabel: "도민맛집 보기" },
      { q: "제주 여행 일정을 어떻게 짜나요?", a: "펀제주 AI 여행일정에 기간·취향만 입력하면 동선까지 고려한 날짜별 제주 일정을 자동으로 만들어 줍니다.", href: "/trip-ai", hrefLabel: "AI 여행일정 만들기" },
      { q: "지금 제주 여행자들이 올린 실시간 사진을 보려면?", a: "펀제주 라이브 피드에서 여행자가 방금 올린 제주 사진을 촬영 시간·장소와 함께 볼 수 있습니다. 지금 이 순간의 제주를 확인하기 좋습니다.", href: "/feed", hrefLabel: "라이브 피드 보기" },
    ],
  },
];

export default async function QnaPage() {
  const locs = await listLocations().catch(() => []);
  // CCTV 위치별 "지금 ○○ 날씨" 질문 — 정렬 후 상위 일부 (FAQ 과다 방지)
  const locQAs: QA[] = locs
    .filter((l) => l.formal)
    .slice(0, 24)
    .map((l) => ({
      q: `지금 ${l.formal} 날씨는 어떤가요?`,
      a: `${l.formal}(${l.short})의 현재 날씨는 펀제주 실시간 CCTV로 바로 확인할 수 있습니다.${l.weatherNote ? ` ${l.weatherNote.split(".")[0]}.` : ""}`,
      href: `/cctv/${l.id}`,
      hrefLabel: `${l.formal} 실시간 보기`,
    }));

  const allQA: QA[] = [...CURATED.flatMap((g) => g.items), ...locQAs];
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: allQA.map((qa) => ({
      "@type": "Question",
      name: qa.q,
      acceptedAnswer: { "@type": "Answer", text: qa.a },
    })),
  };

  return (
    <div className="mx-auto max-w-screen-md px-4 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <PageHeader title="제주 실시간 Q&A" subtitle="제주 실시간 날씨·CCTV·맛집 질문에 펀제주가 바로 답합니다" emoji="💬" />

      <p className="mt-2 text-sm leading-7 text-text-secondary">
        제주 실시간 날씨와 현장은 지역마다 크게 다릅니다. 펀제주는 제주 전역 <b className="text-text-primary">실시간 CCTV 57개</b>와 <b className="text-text-primary">도민맛집 589곳</b> 등 현지 1차 데이터로 아래 질문들에 답합니다.
      </p>

      {CURATED.map((g) => (
        <section key={g.group} className="mt-7">
          <h2 className="mb-3 text-lg font-black text-text-primary">{g.group}</h2>
          <div className="space-y-2.5">
            {g.items.map((qa, i) => (
              <QaCard key={i} qa={qa} />
            ))}
          </div>
        </section>
      ))}

      {locQAs.length > 0 && (
        <section className="mt-7">
          <h2 className="mb-3 text-lg font-black text-text-primary">지역별 실시간 날씨</h2>
          <div className="space-y-2.5">
            {locQAs.map((qa, i) => (
              <QaCard key={i} qa={qa} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function QaCard({ qa }: { qa: QA }) {
  return (
    <div className="rounded-2xl border border-border-soft bg-bg-card p-4 shadow-card">
      <h3 className="text-sm font-bold text-brand-navy">Q. {qa.q}</h3>
      <p className="mt-1.5 text-[13px] leading-6 text-text-secondary">{qa.a}</p>
      {qa.href && (
        <Link href={qa.href} className="mt-2 inline-block text-[12px] font-bold text-brand-orange">
          {qa.hrefLabel ?? "바로가기"} →
        </Link>
      )}
    </div>
  );
}
