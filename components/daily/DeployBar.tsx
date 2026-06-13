"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** 미리보기 하단 고정 — 초안을 데일리제주로 배포하는 버튼. */
export function DeployBar({ id, slug, published }: { id: string; slug: string; published: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function deploy() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/contents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      // 발행 직후 데일리 상세로 이동
      router.push(`/daily/${slug}`);
    } catch {
      setBusy(false);
      alert("배포에 실패했어요. 다시 시도해주세요.");
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border-soft bg-bg-card/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-2">
        {published ? (
          <a
            href={`/daily/${slug}`}
            className="flex-1 rounded-2xl bg-brand-navy py-3 text-center text-sm font-bold text-white"
          >
            데일리에서 보기 →
          </a>
        ) : (
          <button
            type="button"
            onClick={deploy}
            disabled={busy}
            className="flex-1 rounded-2xl bg-jeju-green py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {busy ? "배포 중…" : "🚀 데일리제주에 배포하기"}
          </button>
        )}
      </div>
    </div>
  );
}
