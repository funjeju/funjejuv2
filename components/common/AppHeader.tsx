"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthButton } from "@/components/common/AuthButton";

export function AppHeader() {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border-soft bg-bg-card/95 px-4 backdrop-blur md:hidden">
      <Link href="/" className="flex items-center gap-0.5">
        <span className="text-lg font-black text-brand-orange">Fun</span>
        <span className="text-lg font-black text-brand-navy">jeju</span>
      </Link>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/search")}
          className="p-1 text-text-secondary hover:text-text-primary"
        >
          <span className="text-xl">🔍</span>
        </button>
        <Link href="/chat" className="relative p-1 text-text-secondary hover:text-text-primary">
          <span className="text-xl">🔔</span>
          <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-live-red text-[9px] font-bold text-white">
            3
          </span>
        </Link>
        <AuthButton />
      </div>
    </header>
  );
}
