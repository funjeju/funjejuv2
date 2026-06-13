"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { sidebarItems } from "@/constants/navigation";
import { useAuth } from "@/hooks/useAuth";
import { DolmangyiIcon } from "@/components/common/DolmangyiIcon";

export function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, loading, signInWithGoogle, logout } = useAuth();

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <aside className="hidden md:flex md:w-52 md:flex-col md:shrink-0">
      <div className="sticky top-0 flex h-screen flex-col overflow-y-auto border-r border-border-soft bg-bg-card">

        {/* Logo */}
        <div className="px-5 py-5">
          <Link href="/" className="flex items-center gap-2">
            <DolmangyiIcon size={32} className="shrink-0" />
            <div>
              <div className="flex items-center gap-0.5">
                <span className="text-xl font-black text-brand-orange">Fun</span>
                <span className="text-xl font-black text-brand-navy">jeju</span>
              </div>
              <p className="text-[9px] text-text-secondary leading-none">제주가 더 FUN해지는 여행</p>
            </div>
          </Link>
        </div>

        {/* Search */}
        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={() => router.push("/search")}
            className="flex w-full items-center gap-2 rounded-xl border border-border-soft bg-bg-secondary px-3 py-2 text-xs text-text-secondary hover:border-brand-orange/40 transition-colors"
          >
            <span>🔍</span>
            <span>제주에서 검색...</span>
          </button>
        </div>

        {/* Auth */}
        <div className="px-3 pb-3">
          {loading ? (
            <div className="h-9 animate-pulse rounded-xl bg-bg-secondary" />
          ) : user ? (
            <div className="flex items-center gap-2 rounded-xl border border-border-soft bg-bg-secondary px-2 py-1.5">
              <Link href="/mypage" className="flex min-w-0 flex-1 items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-orange/20">
                  {user.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.photoURL} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[11px] font-bold text-brand-orange">
                      {(user.displayName ?? user.email ?? "U")[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="min-w-0 truncate text-[11px] font-semibold text-text-primary">
                  {user.displayName ?? user.email}
                </span>
              </Link>
              <button
                type="button"
                onClick={logout}
                title="로그아웃"
                className="shrink-0 rounded-full p-1 text-text-secondary hover:bg-bg-primary hover:text-live-red transition-colors"
              >
                ⎋
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={signInWithGoogle}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border-soft bg-bg-card px-3 py-2 text-xs font-semibold text-text-primary shadow-card hover:bg-bg-secondary transition-colors"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google 로그인
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-3">
          {sidebarItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "bg-brand-orange/10 text-brand-orange font-semibold"
                  : "text-text-secondary hover:bg-bg-secondary hover:text-text-primary",
              ].join(" ")}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* 돌맹이 마스코트 */}
        <div className="px-4 py-5 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center">
            <DolmangyiIcon size={56} />
          </div>
          <p className="mt-2 text-xs font-medium text-text-primary">안녕하세요!</p>
          <p className="text-[10px] text-text-secondary">제주 여행 AI 도슨트</p>
          <p className="text-[10px] text-text-secondary">오늘도 즐거운 여행 되세요!</p>
          <Link
            href="/chat"
            className="mt-3 block w-full rounded-full border border-border-soft bg-bg-secondary py-1.5 text-center text-[11px] font-medium text-text-secondary hover:bg-bg-primary transition-colors"
          >
            도슨트에게 물어보기 💬
          </Link>
          <div className="mt-3 flex justify-center gap-2 text-sm text-text-secondary">
            <span>📸</span>
            <span>▶️</span>
            <span>🎵</span>
          </div>
          <p className="mt-3 text-[9px] text-text-secondary">© 2025 FunJeju</p>
        </div>
      </div>
    </aside>
  );
}
