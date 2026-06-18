"use client";

import { useState } from "react";

const MAX_IMAGES = 3;

/** 클라에서 이미지 리사이즈 → dataURL(base64) (전송 용량 절감) */
async function fileToResizedDataUrl(file: File, max = 1280, quality = 0.8): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

export function ShopRequestModal({ onClose }: { onClose: () => void }) {
  const [shopName, setShopName] = useState("");
  const [keywords, setKeywords] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function addImages(files: FileList | null) {
    if (!files) return;
    const room = MAX_IMAGES - images.length;
    if (room <= 0) return;
    try {
      const picked = Array.from(files).slice(0, room);
      const urls = await Promise.all(picked.map((f) => fileToResizedDataUrl(f)));
      setImages((prev) => [...prev, ...urls].slice(0, MAX_IMAGES));
    } catch {
      setError("이미지를 불러오지 못했어요.");
    }
  }

  async function submit() {
    if (!shopName.trim() || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/shop-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopName: shopName.trim(), keywords: keywords.trim(), images }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? "전송 실패"); }
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "전송에 실패했어요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-bg-card p-5 shadow-card" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <div className="py-6 text-center">
            <div className="text-4xl">✅</div>
            <p className="mt-3 text-base font-black text-text-primary">접수되었습니다!</p>
            <p className="mt-1.5 text-sm text-text-secondary">담당자가 확인 후 우리 가게 틀린그림찾기를 만들어 드릴게요.</p>
            <button type="button" onClick={onClose}
              className="mt-5 w-full rounded-full bg-brand-navy py-3 text-sm font-bold text-white">닫기</button>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-black text-text-primary">🏪 우리 가게도 만들어주세요</h3>
              <button type="button" onClick={onClose} className="text-xl text-text-secondary">×</button>
            </div>
            <p className="mb-4 text-xs text-text-secondary">정보를 남겨주시면 담당자가 확인 후 우리 가게 틀린그림찾기를 만들어 드려요.</p>

            <label className="mb-1 block text-xs font-bold text-text-primary">가게명 *</label>
            <input type="text" value={shopName} onChange={(e) => setShopName(e.target.value.slice(0, 50))}
              placeholder="예: 돌담카페"
              className="mb-3 w-full rounded-xl border border-border-soft bg-bg-secondary px-3 py-2.5 text-sm outline-none focus:border-brand-orange" />

            <label className="mb-1 block text-xs font-bold text-text-primary">주요 키워드</label>
            <input type="text" value={keywords} onChange={(e) => setKeywords(e.target.value.slice(0, 200))}
              placeholder="예: 오션뷰, 흑돼지, 애월, 주차가능"
              className="mb-1 w-full rounded-xl border border-border-soft bg-bg-secondary px-3 py-2.5 text-sm outline-none focus:border-brand-orange" />
            <p className="mb-3 text-[11px] text-text-secondary">게임·홍보에 노출되면 좋을 키워드를 쉼표로 적어주세요.</p>

            <label className="mb-1 block text-xs font-bold text-text-primary">사진 ({images.length}/{MAX_IMAGES})</label>
            <div className="mb-1 flex flex-wrap gap-2">
              {images.map((url, i) => (
                <div key={i} className="relative h-16 w-16 overflow-hidden rounded-lg border border-border-soft">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => setImages((p) => p.filter((_, idx) => idx !== i))}
                    className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-[10px] font-bold text-white">×</button>
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border-soft text-text-secondary hover:border-brand-orange hover:text-brand-orange">
                  <span className="text-lg">＋</span>
                  <input type="file" accept="image/*" multiple className="hidden"
                    onChange={(e) => { addImages(e.target.files); e.target.value = ""; }} />
                </label>
              )}
            </div>
            <p className="mb-4 text-[11px] text-text-secondary">가게 사진 최대 {MAX_IMAGES}장.</p>

            {error && <p className="mb-2 text-xs font-semibold text-live-red">❌ {error}</p>}

            <button type="button" onClick={submit} disabled={!shopName.trim() || submitting}
              className="w-full rounded-full bg-brand-orange py-3 text-sm font-bold text-white disabled:opacity-40">
              {submitting ? "전송 중…" : "전송하기"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
