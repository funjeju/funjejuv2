"use client";

import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { ShareButton } from "@/components/common/ShareButton";

/**
 * 카드뉴스 뷰어 — og 라우트로 렌더된 카드 N장을 캐러셀로 보여주고
 * 장별/전체 PNG 다운로드 + 공유. (인스타/스레드 업로드용)
 */
export function CardNewsViewer({ slug, total, title, subtitle }: { slug: string; total: number; title: string; subtitle?: string }) {
  const [idx, setIdx] = useState(0);
  const [downloading, setDownloading] = useState(false);

  const src = (i: number) => `/api/og/cardnews?slug=${slug}&i=${i}`;

  async function downloadOne(i: number) {
    const res = await fetch(src(i));
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${slug}-${String(i + 1).padStart(2, "0")}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function downloadAll() {
    setDownloading(true);
    try {
      for (let i = 0; i < total; i++) {
        await downloadOne(i);
        await new Promise((r) => setTimeout(r, 350)); // 브라우저 다운로드 큐 여유
      }
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="mx-auto max-w-screen-sm px-4 py-6">
      <div className="mb-3 flex items-center justify-between">
        <PageHeader title={title} subtitle={subtitle} emoji="🃏" />
        <ShareButton title={`${title} | 펀제주`} />
      </div>

      {/* 카드 뷰어 */}
      <div className="relative overflow-hidden rounded-2xl border border-border-soft bg-bg-secondary">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src(idx)} alt={`카드 ${idx + 1}`} className="block w-full" width={1080} height={1350} />
        {idx > 0 && (
          <button type="button" onClick={() => setIdx((i) => Math.max(0, i - 1))}
            className="absolute left-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-lg text-white">‹</button>
        )}
        {idx < total - 1 && (
          <button type="button" onClick={() => setIdx((i) => Math.min(total - 1, i + 1))}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-lg text-white">›</button>
        )}
        <div className="absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-bold text-white">{idx + 1} / {total}</div>
      </div>

      {/* 인디케이터 */}
      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <button key={i} type="button" onClick={() => setIdx(i)}
            className={`h-2 rounded-full transition-all ${i === idx ? "w-5 bg-brand-orange" : "w-2 bg-border-soft"}`} aria-label={`${i + 1}번 카드`} />
        ))}
      </div>

      {/* 다운로드 */}
      <div className="mt-5 flex gap-2">
        <button type="button" onClick={() => downloadOne(idx)}
          className="flex-1 rounded-xl bg-bg-secondary py-2.5 text-sm font-bold text-text-primary hover:bg-border-soft">⬇️ 이 카드 저장</button>
        <button type="button" onClick={downloadAll} disabled={downloading}
          className="flex-1 rounded-xl bg-brand-orange py-2.5 text-sm font-bold text-white disabled:opacity-50">
          {downloading ? "저장 중…" : `⬇️ 전체 ${total}장 저장`}</button>
      </div>
      <p className="mt-2 text-center text-[11px] text-text-secondary">저장한 이미지를 인스타·스레드에 캐러셀로 올려보세요 (4:5 · 1080×1350)</p>
    </div>
  );
}
