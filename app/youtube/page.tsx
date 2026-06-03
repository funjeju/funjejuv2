import { PageHeader } from "@/components/common/PageHeader";

const categories = ["전체", "드라이브", "오름", "맛집", "카페", "힐링", "액티비티"];

const videos = [
  {
    id: 1,
    title: "제주 서쪽 감성 여행",
    channel: "제주감성여행",
    duration: "3:25",
    spots: 12,
    summary: "애월 해안도로 → 협재 해수욕장 → 한림공원 → 수월봉 노을 순서로 제주 서부의 핵심 감성 코스를 담았습니다.",
    tags: ["드라이브", "감성"],
    thumb: "🌅",
  },
  {
    id: 2,
    title: "제주 오름 BEST 5",
    channel: "오름탐방대",
    duration: "4:11",
    spots: 8,
    summary: "새별오름, 다랑쉬오름, 용눈이오름, 성산일출봉, 한라산 백록담까지 난이도별로 소개합니다.",
    tags: ["오름", "트래킹"],
    thumb: "⛰️",
  },
  {
    id: 3,
    title: "제주 흑돼지 맛집 TOP 10",
    channel: "제주맛집탐방",
    duration: "7:33",
    spots: 10,
    summary: "제주시와 서귀포시 흑돼지 맛집 10곳. 가성비, 맛, 대기시간 기준으로 랭킹을 매겼습니다.",
    tags: ["맛집", "흑돼지"],
    thumb: "🍖",
  },
  {
    id: 4,
    title: "제주 카페 투어 브이로그",
    channel: "jeju_cafe_lover",
    duration: "12:08",
    spots: 7,
    summary: "오션뷰 카페부터 귤밭 속 숨은 카페까지. 직접 다녀온 감성 카페 7곳의 솔직 리뷰.",
    tags: ["카페", "브이로그"],
    thumb: "☕",
  },
  {
    id: 5,
    title: "제주 서핑 입문 완벽 가이드",
    channel: "surf_jeju",
    duration: "8:55",
    spots: 5,
    summary: "중문, 이호테우, 협재 등 서핑 포인트와 강습 업체 비교. 초보자도 따라할 수 있는 팁 정리.",
    tags: ["액티비티", "서핑"],
    thumb: "🏄",
  },
  {
    id: 6,
    title: "한달살기 제주 현실 후기",
    channel: "slow_jeju_life",
    duration: "18:22",
    spots: 15,
    summary: "제주 한달살기 숙소 선정부터 마트 위치, 동네 카페, 일상 루틴까지 현실적인 정보 총정리.",
    tags: ["힐링", "한달살기"],
    thumb: "🏡",
  },
];

export default function YoutubePage() {
  return (
    <div className="mx-auto max-w-screen-xl px-0 md:px-4 md:py-6">
      <PageHeader
        title="유튜브 요약"
        subtitle="제주 관련 유튜브를 AI가 스팟 단위로 요약해드려요"
        emoji="▶️"
      />

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-3 md:px-0">
        {categories.map((cat, i) => (
          <button
            key={cat}
            type="button"
            className={[
              "shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors",
              i === 0
                ? "bg-live-red text-white"
                : "border border-border-soft bg-bg-card text-text-secondary hover:bg-bg-secondary",
            ].join(" ")}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Video list */}
      <div className="space-y-3 px-4 md:px-0">
        {videos.map((v) => (
          <div
            key={v.id}
            className="flex gap-4 rounded-2xl border border-border-soft bg-bg-card p-4 shadow-card transition-transform hover:scale-[1.01]"
          >
            {/* Thumbnail */}
            <div className="flex h-20 w-32 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-4xl md:h-24 md:w-40">
              {v.thumb}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                  <span className="ml-0.5 text-white text-sm">▶</span>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-1 mb-1.5">
                {v.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-live-red/10 px-2 py-0.5 text-[10px] font-semibold text-live-red">
                    {tag}
                  </span>
                ))}
              </div>
              <h3 className="text-sm font-bold text-text-primary">{v.title}</h3>
              <p className="mt-0.5 text-[11px] text-text-secondary">{v.channel} · {v.duration} · 스팟 {v.spots}개</p>
              <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-text-secondary">{v.summary}</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  className="rounded-full bg-brand-navy px-3 py-1 text-[11px] font-semibold text-white hover:bg-brand-navy/90 transition-colors"
                >
                  스팟 보기
                </button>
                <button
                  type="button"
                  className="rounded-full border border-border-soft bg-bg-secondary px-3 py-1 text-[11px] font-medium text-text-secondary hover:bg-bg-primary transition-colors"
                >
                  ⭐ 저장
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* YouTube URL 직접 입력 */}
      <div className="mx-4 mt-6 rounded-2xl border border-dashed border-brand-navy/30 bg-brand-navy/5 p-4 md:mx-0">
        <p className="mb-2 text-sm font-bold text-brand-navy">유튜브 URL 직접 요약하기</p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="https://youtube.com/watch?v=..."
            className="flex-1 rounded-full border border-border-soft bg-bg-card px-4 py-2 text-sm text-text-primary placeholder:text-text-secondary outline-none"
          />
          <button
            type="button"
            className="rounded-full bg-live-red px-4 py-2 text-xs font-bold text-white hover:bg-live-red/90 transition-colors"
          >
            요약하기
          </button>
        </div>
      </div>
    </div>
  );
}
