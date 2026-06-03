import { PageHeader } from "@/components/common/PageHeader";

const styles = [
  { id: "healing", emoji: "🌿", label: "힐링·휴식", desc: "자연 속에서 느리게" },
  { id: "food", emoji: "🍖", label: "맛집 탐방", desc: "제주 미식 여행" },
  { id: "activity", emoji: "🏄", label: "액티비티", desc: "서핑·트래킹·레저" },
  { id: "culture", emoji: "🏛️", label: "문화·역사", desc: "박물관·유적지" },
  { id: "cafe", emoji: "☕", label: "카페 투어", desc: "감성 카페 순례" },
  { id: "family", emoji: "👨‍👩‍👧", label: "가족 여행", desc: "아이와 함께" },
];

const savedCourses = [
  {
    id: 1,
    title: "서부 감성 힐링 코스",
    days: "1박 2일",
    spots: ["협재 해변", "한림공원", "애월 카페거리", "수월봉"],
    style: "힐링",
    emoji: "🌊",
  },
  {
    id: 2,
    title: "동부 오름 트래킹",
    days: "당일치기",
    spots: ["성산 일출봉", "다랑쉬오름", "용눈이오름"],
    style: "액티비티",
    emoji: "⛰️",
  },
];

export default function TripAiPage() {
  return (
    <div className="mx-auto max-w-screen-xl px-0 md:px-4 md:py-6">
      <PageHeader
        title="AI 여행 일정"
        subtitle="나만의 맞춤 제주 일정을 AI가 설계해드려요"
        emoji="🗓️"
      />

      {/* Main CTA Card */}
      <div className="mx-4 mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-navy to-blue-600 p-5 text-white md:mx-0">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-white/70">AI 맞춤 일정 생성</p>
            <h2 className="mt-1 text-lg font-black">제주 여행 일정,<br />나한테 맡겨봐! 🗿</h2>
            <p className="mt-1 text-xs text-white/80">저장한 스팟 + 여행 스타일로 최적 동선 생성</p>
          </div>
          <span className="text-5xl">🗿</span>
        </div>

        {/* Step inputs */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3">
            <span className="text-sm">📅</span>
            <div className="flex-1">
              <p className="text-[10px] text-white/60">여행 기간</p>
              <p className="text-sm font-semibold">1박 2일</p>
            </div>
            <span className="text-white/50">›</span>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3">
            <span className="text-sm">👥</span>
            <div className="flex-1">
              <p className="text-[10px] text-white/60">여행 인원</p>
              <p className="text-sm font-semibold">2명 (커플)</p>
            </div>
            <span className="text-white/50">›</span>
          </div>
        </div>

        <button
          type="button"
          className="mt-4 w-full rounded-xl bg-brand-yellow py-3 text-sm font-black text-brand-navy hover:bg-brand-yellow/90 transition-colors"
        >
          ✨ AI 일정 만들기
        </button>
      </div>

      {/* Travel Style */}
      <section className="px-4 md:px-0">
        <h2 className="mb-3 text-base font-bold text-text-primary">여행 스타일 선택</h2>
        <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
          {styles.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={[
                "flex flex-col items-center gap-1.5 rounded-2xl border p-3 transition-all",
                i === 0
                  ? "border-brand-orange bg-brand-orange/10 shadow-soft"
                  : "border-border-soft bg-bg-card hover:border-brand-orange/40 hover:bg-brand-orange/5",
              ].join(" ")}
            >
              <span className="text-2xl">{s.emoji}</span>
              <span className={`text-[11px] font-bold ${i === 0 ? "text-brand-orange" : "text-text-primary"}`}>
                {s.label}
              </span>
              <span className="text-[9px] text-text-secondary">{s.desc}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Saved Courses */}
      <section className="mt-6 px-4 md:px-0">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-text-primary">저장된 일정</h2>
          <span className="text-xs text-text-secondary">{savedCourses.length}개</span>
        </div>
        <div className="space-y-3">
          {savedCourses.map((course) => (
            <div
              key={course.id}
              className="flex gap-4 rounded-2xl border border-border-soft bg-bg-card p-4 shadow-card"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-bg-secondary text-3xl">
                {course.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-text-primary">{course.title}</p>
                    <p className="text-[11px] text-text-secondary">
                      {course.days} · {course.style} · 스팟 {course.spots.length}개
                    </p>
                  </div>
                  <button type="button" className="shrink-0 rounded-full bg-brand-navy px-3 py-1 text-[11px] font-bold text-white hover:bg-brand-navy/90 transition-colors">
                    보기
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {course.spots.map((spot) => (
                    <span key={spot} className="rounded-full bg-bg-secondary px-2 py-0.5 text-[10px] text-text-secondary">
                      📍 {spot}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
