import Link from "next/link";
import { DolmangyiIcon } from "@/components/common/DolmangyiIcon";
import { NotFoundTracker } from "@/components/common/NotFoundTracker";

// 매칭 안 되는 모든 경로(옛 URL 포함)는 깨진 화면 대신 이 친절한 안내로.
// HTTP 404를 그대로 반환해 검색엔진엔 "없는 페이지"로 정확히 알리되, 사용자는 길을 잃지 않게.
export default function NotFound() {
  const links = [
    { href: "/", label: "🏠 홈" },
    { href: "/cctv", label: "📷 실시간 CCTV" },
    { href: "/food", label: "🍽️ 도민맛집" },
    { href: "/feed", label: "🖼️ 라이브 피드" },
    { href: "/jeju-ai", label: "🤖 제주여행 AI" },
    { href: "/magazine", label: "📖 제주 매거진" },
  ];
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <NotFoundTracker />
      <DolmangyiIcon size={72} />
      <h1 className="mt-5 text-xl font-black text-text-primary">앗, 페이지를 찾을 수 없어요</h1>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">
        주소가 바뀌었거나 사라진 페이지예요.<br />
        아래에서 원하시는 곳으로 바로 가보세요!
      </p>
      <div className="mt-6 grid w-full grid-cols-2 gap-2">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-xl border border-border-soft bg-bg-card py-3 text-sm font-bold text-text-primary shadow-card transition-colors hover:border-brand-orange hover:text-brand-orange"
          >
            {l.label}
          </Link>
        ))}
      </div>
      <Link href="/" className="mt-6 rounded-full bg-brand-orange px-6 py-3 text-sm font-bold text-white hover:bg-brand-orange/90">
        홈으로 돌아가기 →
      </Link>
    </div>
  );
}
