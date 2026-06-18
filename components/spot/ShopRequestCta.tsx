"use client";

import { useState } from "react";
import { ShopRequestModal } from "./ShopRequestModal";

/** 틀린그림찾기 목록의 "우리 가게도 만들어주세요" CTA → 접수 모달 */
export function ShopRequestCta() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-4 mb-4 flex w-[calc(100%-2rem)] items-center justify-between gap-3 rounded-2xl border border-brand-orange/30 bg-gradient-to-r from-brand-orange/10 to-brand-yellow/10 p-4 text-left transition-colors hover:from-brand-orange/15 hover:to-brand-yellow/15 md:mx-0 md:w-full"
      >
        <div className="min-w-0">
          <p className="text-sm font-black text-text-primary">🏪 우리 가게도 만들어주세요!</p>
          <p className="mt-0.5 text-xs text-text-secondary">가게명·키워드·사진만 남기면 담당자가 우리 가게 틀린그림찾기를 만들어 드려요.</p>
        </div>
        <span className="shrink-0 rounded-full bg-brand-orange px-3 py-2 text-xs font-bold text-white">신청하기 →</span>
      </button>
      {open && <ShopRequestModal onClose={() => setOpen(false)} />}
    </>
  );
}
