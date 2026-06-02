import Link from "next/link";
import { CctvList } from "@/components/cctv/CctvList";
import { mockCctvs } from "@/constants/mock-cctvs";

const discoveryCards = [
  {
    title: "라이브 피드",
    description: "EXIF 기록과 감성 멘트가 결합된 여행 카드",
    label: "Mock 준비",
    color: "bg-forest-green/15 text-forest-green"
  },
  {
    title: "AI 일정 생성",
    description: "저장한 스팟을 바탕으로 여행 동선을 구성",
    label: "다음 단계",
    color: "bg-sunset-orange/20 text-text-primary"
  }
];

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="rounded-panel border border-border-soft bg-bg-secondary px-5 py-7 shadow-soft sm:px-8">
        <div className="max-w-2xl space-y-4">
          <p className="text-sm font-semibold text-forest-green">실시간 제주 여행 운영 플랫폼</p>
          <h1 className="text-3xl font-semibold leading-tight text-text-primary sm:text-5xl">
            지금 제주를 보고, 저장하고, AI로 여행을 설계하세요.
          </h1>
          <p className="text-base leading-7 text-text-secondary sm:text-lg">
            CCTV, 라이브 피드, 유튜브 요약, 저장 스팟을 하나의 여행 흐름으로 연결합니다.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/cctv"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-text-primary px-5 text-sm font-semibold text-bg-primary"
            >
              CCTV 둘러보기
            </Link>
            <Link
              href="/trip-ai"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-border-soft bg-bg-primary px-5 text-sm font-semibold text-text-primary"
            >
              AI 일정 준비
            </Link>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-sunset-orange">추천 CCTV</p>
            <h2 className="text-2xl font-semibold">실시간 제주 탐색</h2>
          </div>
          <Link href="/cctv" className="text-sm font-semibold text-text-secondary">
            전체 보기
          </Link>
        </div>
        <CctvList cctvs={mockCctvs.slice(0, 3)} />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {discoveryCards.map((card) => (
          <article
            key={card.title}
            className="rounded-card border border-border-soft bg-bg-primary p-5 shadow-soft"
          >
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${card.color}`}>
              {card.label}
            </span>
            <h3 className="mt-4 text-xl font-semibold">{card.title}</h3>
            <p className="mt-2 leading-6 text-text-secondary">{card.description}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
