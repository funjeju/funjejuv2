"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { uploadFeedImage, createFeed } from "@/lib/feed";
import type { ExifData, FeedFilter } from "@/types/feed";
import { findNearestRegion, type JejuRegion } from "@/constants/jeju-regions";

const FILTER_OPTIONS: { id: FeedFilter; label: string; css: string }[] = [
  { id: "none",     label: "원본",   css: "" },
  { id: "warm",     label: "웜",     css: "contrast(1.1) saturate(1.2) brightness(1.05) sepia(0.1)" },
  { id: "cool",     label: "쿨",     css: "contrast(1.15) saturate(0.9) hue-rotate(-5deg) brightness(1.05)" },
  { id: "vivid",    label: "비비드", css: "contrast(1.2) saturate(1.4) brightness(1.02)" },
  { id: "cinematic",label: "시네마", css: "contrast(1.25) saturate(1.1) brightness(0.95) sepia(0.15)" },
];

type Props = { open: boolean; onClose: () => void; onPosted?: () => void };

export function FeedWriteModal({ open, onClose, onPosted }: Props) {
  const { user, signInWithGoogle } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file,        setFile]        = useState<File | null>(null);
  const [previewUrl,  setPreviewUrl]  = useState<string | null>(null);
  const [exif,        setExif]        = useState<ExifData>({});
  const [aiCopy,      setAiCopy]      = useState("");
  const [userCopy,    setUserCopy]    = useState("");   // 유저 직접 입력 카피
  const [category,    setCategory]    = useState("자연");
  const [filter,      setFilter]      = useState<FeedFilter>("none");
  const [region,      setRegion]      = useState<JejuRegion | null>(null);
  const [gps,         setGps]         = useState<{ lat: number; lng: number } | null>(null);
  const [exifMissing, setExifMissing] = useState(false);
  const [status,      setStatus]      = useState<"idle" | "analyzing" | "uploading" | "done">("idle");
  const [error,       setError]       = useState("");

  useEffect(() => {
    if (!open) {
      setFile(null); setPreviewUrl(null); setExif({});
      setAiCopy(""); setUserCopy(""); setFilter("none");
      setRegion(null); setGps(null); setExifMissing(false);
      setStatus("idle"); setError("");
    }
  }, [open]);

  if (!open) return null;

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    e.target.value = "";   // 같은 파일 재선택 허용

    setError("");
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setStatus("analyzing");

    try {
      // EXIF 추출
      const exifr = await import("exifr");
      const data = await exifr.default.parse(selected, {
        pick: ["Make","Model","LensModel","FocalLength","FNumber","ISO",
               "ExposureTime","DateTimeOriginal","latitude","longitude",
               "GPSLatitude","GPSLongitude"],
      }).catch(() => null);

      const lat = data?.latitude ?? data?.GPSLatitude;
      const lng = data?.longitude ?? data?.GPSLongitude;
      if (typeof lat !== "number" || typeof lng !== "number") {
        setExifMissing(true);
        setStatus("idle");
        return;
      }

      setGps({ lat, lng });
      const matched = findNearestRegion(lat, lng);
      if (matched) setRegion(matched);

      const parsed: ExifData = {};
      if (data.Make || data.Model) parsed.camera = `${data.Make ?? ""} ${data.Model ?? ""}`.trim();
      if (data.LensModel)     parsed.lens         = data.LensModel;
      if (data.FocalLength)   parsed.focalLength  = `${Math.round(data.FocalLength)}mm`;
      if (data.FNumber)       parsed.fStop        = `f/${data.FNumber}`;
      if (data.ISO)           parsed.iso          = data.ISO;
      if (data.ExposureTime) {
        parsed.exposureTime = data.ExposureTime < 1
          ? `1/${Math.round(1 / data.ExposureTime)}s`
          : `${data.ExposureTime}s`;
      }
      if (data.DateTimeOriginal) {
        parsed.date = new Date(data.DateTimeOriginal).toLocaleDateString("ko-KR");
      }
      setExif(parsed);

      // 이미지 압축 후 AI 카피 생성 (413 방지: max 1024px, 80% JPEG)
      const base64 = await compressToBase64(selected, 1024, 0.8);
      const res = await fetch("/api/feed-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: "image/jpeg" }),
      });

      if (res.ok) {
        const { copy, category: cat } = await res.json();
        setAiCopy(copy ?? "");
        setCategory(cat || "자연");
      } else {
        const text = await res.text();
        let msg = "AI 카피 생성 실패";
        try { msg = JSON.parse(text).error ?? msg; } catch { /* noop */ }
        setError(`${msg} — 직접 입력해주세요`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리 실패");
    } finally {
      setStatus("idle");
    }
  }

  async function handlePost() {
    if (!user || !file) return;
    const finalCopy = (userCopy.trim() || aiCopy.trim()).slice(0, 30);
    if (!finalCopy) { setError("카피를 입력해주세요"); return; }

    setStatus("uploading");
    setError("");
    try {
      const imageUrl = await uploadFeedImage(user.uid, file);
      await createFeed({
        authorId: user.uid,
        authorName: user.displayName ?? user.email?.split("@")[0] ?? "여행자",
        authorPhoto: user.photoURL ?? null,
        imageUrl, exif, aiCopy: finalCopy, filter, category,
        ...(region && { regionId: region.id, regionName: region.name, regionCity: region.city }),
        ...(gps && { gps }),
      });
      setStatus("done");
      onPosted?.();
      setTimeout(onClose, 800);
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드 실패");
      setStatus("idle");
    }
  }

  const activeFilterCss = FILTER_OPTIONS.find((f) => f.id === filter)?.css ?? "";
  // 이미지 위에 표시할 카피: 유저 카피 우선
  const displayCopy = userCopy.trim() || aiCopy;
  const hasExif = !!(exif.camera || exif.fStop || exif.iso);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-bg-card shadow-2xl md:rounded-3xl"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border-soft px-5 py-4">
          <h2 className="text-base font-black text-text-primary">✨ 피드 올리기</h2>
          <button type="button" onClick={onClose} className="text-2xl text-text-secondary hover:text-text-primary">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {!user ? (
            <div className="flex flex-col items-center py-12 text-center">
              <span className="text-4xl">🗿</span>
              <p className="mt-3 text-sm font-bold text-text-primary">로그인이 필요해요</p>
              <button type="button" onClick={signInWithGoogle}
                className="mt-4 rounded-full bg-brand-navy px-5 py-2.5 text-sm font-bold text-white">
                Google 로그인
              </button>
            </div>

          ) : !previewUrl ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border-soft bg-bg-secondary hover:border-brand-orange hover:bg-brand-orange/5 transition-colors"
            >
              <span className="text-5xl">📷</span>
              <p className="text-sm font-bold text-text-primary">사진 선택하기</p>
              <p className="text-xs text-text-secondary text-center px-4">
                GPS가 포함된 카메라·스마트폰 원본 사진만 올릴 수 있어요
              </p>
            </button>

          ) : exifMissing ? (
            <div className="flex flex-col items-center gap-4">
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-gray-900">
                <Image src={previewUrl} alt="preview" fill className="object-cover opacity-30" unoptimized />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6">
                  <span className="text-5xl">🚫</span>
                  <p className="text-base font-black text-white">Live Feed는 EXIF 설정이 필수입니다</p>
                  <p className="text-xs text-white/70 leading-relaxed text-center">
                    이 사진에는 GPS 위치 정보가 없어요.<br />
                    카메라·스마트폰 설정에서 위치 정보 저장을 켜고<br />
                    다시 촬영한 사진을 올려주세요.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setExifMissing(false); setPreviewUrl(null); setFile(null); fileInputRef.current?.click(); }}
                className="w-full rounded-xl border border-border-soft bg-bg-secondary py-3 text-sm font-semibold text-text-secondary hover:bg-bg-primary transition-colors"
              >
                다른 사진 선택하기
              </button>
            </div>

          ) : (
            <div className="space-y-4">

              {/* ── 이미지 프리뷰 + 오버레이 ── */}
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-gray-900">
                <Image
                  src={previewUrl}
                  alt="preview"
                  fill
                  className="object-cover"
                  style={{ filter: activeFilterCss }}
                  unoptimized
                />

                {/* AI 감성 카피 오버레이 — 상단 우측 */}
                {displayCopy && (
                  <div className="absolute right-3 top-3 max-w-[65%]">
                    <p
                      className="text-right font-black leading-7 text-white"
                      style={{
                        fontSize: "clamp(14px, 4vw, 18px)",
                        textShadow: "0 1px 12px rgba(0,0,0,0.7), 0 0 24px rgba(0,0,0,0.4)",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {displayCopy}
                    </p>
                  </div>
                )}

                {/* EXIF 오버레이 — 하단 */}
                {hasExif && !status && (
                  <>
                    {/* 그라데이션 */}
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                    {/* 지역 + EXIF 정보 */}
                    <div className="absolute inset-x-0 bottom-0 px-4 pb-3">
                      {region && (
                        <div className="mb-1.5 flex items-center gap-1">
                          <span className="rounded-full bg-white/20 backdrop-blur-sm px-2 py-0.5 text-[9px] font-bold text-white">
                            📍 {region.fullName}
                          </span>
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        {exif.camera && (
                          <span className="flex items-center gap-1 text-[10px] font-medium text-white/90">
                            <span className="text-xs">📷</span> {exif.camera}
                          </span>
                        )}
                        <div className="flex items-center gap-2 text-[10px] font-medium text-white/75">
                          {exif.focalLength && <span>{exif.focalLength}</span>}
                          {exif.fStop &&       <span>{exif.fStop}</span>}
                          {exif.iso &&         <span>ISO {exif.iso}</span>}
                          {exif.exposureTime && <span>{exif.exposureTime}</span>}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* AI 분석 중 */}
                {status === "analyzing" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 text-white">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <p className="text-sm">🗿 AI가 사진을 보고 있어요...</p>
                  </div>
                )}
              </div>

              {/* ── 감성 필터 ── */}
              <div>
                <p className="mb-2 text-xs font-bold text-text-secondary">🎨 감성 필터</p>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {FILTER_OPTIONS.map((f) => (
                    <button key={f.id} type="button" onClick={() => setFilter(f.id)}
                      className={["shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                        filter === f.id ? "bg-brand-navy text-white" : "border border-border-soft bg-bg-card text-text-secondary hover:bg-bg-secondary"].join(" ")}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── AI 감성 카피 ── */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-bold text-text-secondary">
                    ✨ AI 감성 카피
                    <span className="ml-1 font-normal">({aiCopy.length}/30)</span>
                  </p>
                  {aiCopy && (
                    <span className="text-[10px] text-jeju-green font-medium">AI 자동 생성됨</span>
                  )}
                </div>
                <input
                  type="text"
                  value={aiCopy}
                  onChange={(e) => setAiCopy(e.target.value.slice(0, 30))}
                  placeholder={status === "analyzing" ? "AI 분석 중..." : "AI가 사진 보고 자동 생성해요..."}
                  disabled={status === "analyzing"}
                  className="w-full rounded-xl border border-border-soft bg-bg-secondary px-3 py-2.5 text-sm outline-none focus:border-brand-orange disabled:opacity-50"
                />
              </div>

              {/* ── 나만의 카피 (선택) ── */}
              <div>
                <p className="mb-2 text-xs font-bold text-text-secondary">
                  ✏️ 나만의 카피
                  <span className="ml-1 font-normal text-text-secondary">(입력 시 AI 카피 대신 사용 · 선택)</span>
                </p>
                <input
                  type="text"
                  value={userCopy}
                  onChange={(e) => setUserCopy(e.target.value.slice(0, 30))}
                  placeholder="직접 쓰고 싶은 문구..."
                  className="w-full rounded-xl border border-border-soft bg-bg-secondary px-3 py-2.5 text-sm outline-none focus:border-brand-orange"
                />
                {userCopy && (
                  <p className="mt-1 text-[10px] text-brand-orange font-medium">
                    👆 이 카피가 사진 위에 표시됩니다
                  </p>
                )}
              </div>

              {/* ── 카테고리 — AI 자동, 수정 가능 ── */}
              <div>
                <p className="mb-2 text-xs font-bold text-text-secondary">
                  📂 카테고리
                  <span className="ml-1 font-normal text-brand-orange">AI 자동 · 수정 가능</span>
                </p>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {["자연", "카페", "맛집", "액티비티", "숙소"].map((c) => (
                    <button key={c} type="button" onClick={() => setCategory(c)}
                      className={["shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                        category === c ? "bg-brand-orange text-white" : "border border-border-soft bg-bg-card text-text-secondary hover:bg-bg-secondary"].join(" ")}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p className="rounded-xl bg-live-red/10 px-3 py-2 text-[11px] font-semibold text-live-red">
                  ❌ {error}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {user && previewUrl && !exifMissing && (
          <div className="shrink-0 border-t border-border-soft p-4">
            <button
              type="button"
              onClick={handlePost}
              disabled={status === "analyzing" || status === "uploading" || (!aiCopy.trim() && !userCopy.trim())}
              className="w-full rounded-xl bg-brand-orange py-3 text-sm font-bold text-white hover:bg-brand-orange/90 disabled:opacity-50 transition-colors"
            >
              {status === "uploading" ? "올리는 중..." : status === "done" ? "✅ 완료!" : "피드 올리기"}
            </button>
          </div>
        )}

        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
      </div>
    </div>
  );
}

/** 캔버스로 이미지 압축 → base64 (413 방지) */
async function compressToBase64(file: File, maxWidth: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > maxWidth) { h = Math.round(h * (maxWidth / w)); w = maxWidth; }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("canvas context")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      URL.revokeObjectURL(url);
      resolve(dataUrl.split(",")[1]);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image load")); };
    img.src = url;
  });
}
