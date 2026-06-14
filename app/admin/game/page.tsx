import Link from "next/link";

const GAMES = [
  {
    emoji: "🔍",
    title: "틀린그림찾기",
    desc: "사진 2장 속 다른 곳 찾기 · 메뉴/매장 강제 관찰형 광고",
    author: "/admin/spot-diff",
    play: "/game/spot",
  },
  {
    emoji: "✍️",
    title: "삼행시 짓기",
    desc: "상호·메뉴명으로 N행시 → 좋아요 투표로 우승 · 업체명 각인",
    author: "/admin/acrostic",
    play: "/game/acrostic",
  },
  {
    emoji: "⌨️",
    title: "타자연습",
    desc: "매장 설명 타이핑 → 타수×정확도 점수 · 주간순위 · 메뉴 각인",
    author: "/admin/typing",
    play: "/game/typing",
  },
];

export default function AdminGameHub() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-lg font-black text-text-primary">🎮 게임 출제·테스트</h1>
      <p className="mb-5 mt-1 text-[12px] text-text-secondary">
        게임을 출제하고, <b>유저 화면으로 직접 플레이</b>해 검수하세요. 완성되면 메인 게임화면에 노출됩니다(예정).
      </p>

      <div className="space-y-3">
        {GAMES.map((g) => (
          <div key={g.title} className="rounded-2xl border border-border-soft bg-bg-card p-4 shadow-card">
            <div className="flex items-start gap-3">
              <span className="text-3xl">{g.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="text-base font-black text-text-primary">{g.title}</p>
                <p className="mt-0.5 text-[12px] leading-5 text-text-secondary">{g.desc}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link
                href={g.author}
                className="flex items-center justify-center gap-1 rounded-xl bg-brand-orange py-2.5 text-sm font-bold text-white hover:bg-brand-orange/90 transition-colors"
              >
                ✏️ 출제하기
              </Link>
              <Link
                href={g.play}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 rounded-xl border border-brand-navy/30 py-2.5 text-sm font-bold text-brand-navy hover:bg-brand-navy/5 transition-colors"
              >
                ▶ 유저화면 해보기
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-dashed border-border-soft bg-bg-secondary/50 p-4">
        <p className="text-[12px] font-bold text-text-secondary">📌 TODO — 메인 노출</p>
        <p className="mt-1 text-[11px] leading-5 text-text-secondary">
          게임이 충분히 쌓이면 앱 메인에 <b>&lt;게임&gt; 단일 메뉴</b>를 노출하고, 그 화면 안에서 3종(틀린그림·삼행시·타자연습)을 탭/카드로 고를 수 있게 통합 예정. (현재는 사이드바에서 숨김)
        </p>
      </div>
    </div>
  );
}
