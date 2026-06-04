"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { uploadFeedImage, createFeed } from "@/lib/feed";
import type { ExifData, FeedFilter } from "@/types/feed";
import {
  JEJU_REGIONS,
  findNearestRegion,
  groupRegionsByCity,
  type JejuRegion,
} from "@/constants/jeju-regions";

const FILTER_OPTIONS: { id: FeedFilter; label: string; css: string }[] = [
  { id: "none", label: "원본", css: "" },
  { id: "warm", label: "웜", css: "contrast(1.1) saturate(1.2) brightness(1.05) sepia(0.1)" },
  { id: "cool", label: "쿨", css: "contrast(1.15) saturate(0.9) hue-rotate(-5deg) brightness(1.05)" },
  { id: "vivid", label: "비비드", css: "contrast(1.2) saturate(1.4) brightness(1.02)" },
  { id: "cinematic", label: "시네마", css: "contrast(1.25) saturate(1.1) brightness(0.95) sepia(0.15)" },
];

type Props = { open: boolean; onClose: () => void; onPosted?: () => void };

export function FeedWriteModal({ open, onClose, onPosted }: Props) {
  const { user, signInWithGoogle } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [exif, setExif] = useState<ExifData>({});
  const [aiCopy, setAiCopy] = useState("");
  const [category, setCategory] = useState("자연");
  const [filter, setFilter] = useState<FeedFilter>("none");
  const [region, setRegion] = useState<JejuRegion | null>(null);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [showRegionPicker, setShowRegionPicker] = useState(false);

  const [status, setStatus] = useState<"idle" | "analyzing" | "uploading" | "done">("idle");
  const [error, setError] = useState("");

  // 모달 닫힐 때 리셋
  useEffect(() => {
    if (!open) {
      setFile(null);
      setPreviewUrl(null);
      setExif({});
      setAiCopy("");
      setFilter("none");
      setRegion(null);
      setGps(null);
      setShowRegionPicker(false);
      setStatus("idle");
      setError("");
    }
  }, [open]);

  if (!open) return null;

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setError("");
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setStatus("analyzing");

    try {
      // EXIF 추출 (동적 import — 클라이언트 only)
      const exifr = await import("exifr");
      const data = await exifr.default.parse(selected, {
        pick: [
          "Make", "Model", "LensModel", "FocalLength",
          "FNumber", "ISO", "ExposureTime", "DateTimeOriginal",
          "latitude", "longitude", "GPSLatitude", "GPSLongitude",
        ],
      }).catch(() => null);

      // GPS 추출 + 제주 지역 자동 매칭
      const lat = data?.latitude ?? data?.GPSLatitude;
      const lng = data?.longitude ?? data?.GPSLongitude;
      if (typeof lat === "number" && typeof lng === "number") {
        setGps({ lat, lng });
        const matched = findNearestRegion(lat, lng);
        if (matched) setRegion(matched);
      }

      const parsed: ExifData = {};
      if (data) {
        if (data.Make || data.Model) {
          parsed.camera = `${data.Make ?? ""} ${data.Model ?? ""}`.trim();
        }
        if (data.LensModel) parsed.lens = data.LensModel;
        if (data.FocalLength) parsed.focalLength = `${Math.round(data.FocalLength)}mm`;
        if (data.FNumber) parsed.fStop = `f/${data.FNumber}`;
        if (data.ISO) parsed.iso = data.ISO;
        if (data.ExposureTime) {
          parsed.exposureTime = data.ExposureTime < 1
            ? `1/${Math.round(1 / data.ExposureTime)}s`
            : `${data.ExposureTime}s`;
        }
        if (data.DateTimeOriginal) {
          parsed.date = new Date(data.DateTimeOriginal).toLocaleDateString("ko-KR");
        }
      }
      setExif(parsed);

      // AI 카피 생성
      const base64 = await fileToBase64(selected);
      const res = await fetch("/api/feed-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: selected.type }),
      });

      if (res.ok) {
        const { copy, category: cat } = await res.json();
        setAiCopy(copy);
        setCategory(cat || "자연");
      } else {
        const { error: err } = await res.json();
        setError(`AI 카피 생성 실패: ${err}. 직접 입력해주세요.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리 실패");
    } finally {
      setStatus("idle");
    }
  }

  async function handlePost() {
    if (!user) {
      setError("로그인이 필요해요");
      return;
    }
    if (!file || !aiCopy.trim()) {
      setError("이미지와 카피가 필요해요");
      return;
    }

    setStatus("uploading");
    setError("");

    try {
      const imageUrl = await uploadFeedImage(user.uid, file);
      await createFeed({
        authorId: user.uid,
        authorName: user.displayName ?? user.email?.split("@")[0] ?? "여행자",
        authorPhoto: user.photoURL ?? null,
        imageUrl,
        exif,
        aiCopy: aiCopy.trim().slice(0, 30),
        filter,
        category,
        ...(region && {
          regionId: region.id,
          regionName: region.name,
          regionCity: region.city,
        }),
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
          <button
            type="button"
            onClick={onClose}
            className="text-2xl text-text-secondary hover:text-text-primary transition-colors"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {!user ? (
            <div className="flex flex-col items-center py-12 text-center">
              <span className="text-4xl">🗿</span>
              <p className="mt-3 text-sm font-bold text-text-primary">로그인이 필요해요</p>
              <p className="mt-1 text-xs text-text-secondary">피드를 올리려면 로그인이 필요합니다</p>
              <button
                type="button"
                onClick={signInWithGoogle}
                className="mt-4 rounded-full bg-brand-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-navy/90 transition-colors"
              >
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
                EXIF 정보가 있는 카메라/스마트폰 원본 사진을 올리면
                <br />
                기종·렌즈·조리개가 자동 표시돼요
              </p>
            </button>
          ) : (
            <div className="space-y-4">
              {/* 프리뷰 + 필터 적용 */}
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-gray-900">
                <Image
                  src={previewUrl}
                  alt="preview"
                  fill
                  className="object-cover"
                  style={{ filter: activeFilterCss }}
                  unoptimized
                />
                {aiCopy && (
                  <div className="absolute right-3 top-3 max-w-[60%]">
                    <p
                      className="text-right text-base font-bold leading-6 text-white"
                      style={{ textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}
                    >
                      {aiCopy}
                    </p>
                  </div>
                )}
                {status === "analyzing" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 text-white">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <p className="text-sm">🗿 AI가 사진을 보고 있어요...</p>
                  </div>
                )}
              </div>

              {/* 필터 선택 */}
              <div>
                <p className="mb-2 text-xs font-bold text-text-secondary">🎨 감성 필터</p>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {FILTER_OPTIONS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFilter(f.id)}
                      className={[
                        "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                        filter === f.id
                          ? "bg-brand-navy text-white"
                          : "border border-border-soft bg-bg-card text-text-secondary hover:bg-bg-secondary",
                      ].join(" ")}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* AI 카피 (수정 가능) */}
              <div>
                <p className="mb-2 text-xs font-bold text-text-secondary">
                  ✨ AI 감성 카피 <span className="text-text-secondary font-normal">({aiCopy.length}/30)</span>
                </p>
                <input
                  type="text"
                  value={aiCopy}
                  onChange={(e) => setAiCopy(e.target.value.slice(0, 30))}
                  placeholder="AI가 사진 보고 자동 생성해요..."
                  className="w-full rounded-xl border border-border-soft bg-bg-secondary px-3 py-2.5 text-sm outline-none focus:border-brand-orange"
                />
              </div>

              {/* 카테고리 */}
              <div>
                <p className="mb-2 text-xs font-bold text-text-secondary">📂 카테고리</p>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {["자연", "카페", "맛집", "액티비티", "숙소"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      className={[
                        "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                        category === c
                          ? "bg-brand-orange text-white"
                          : "border border-border-soft bg-bg-card text-text-secondary hover:bg-bg-secondary",
                      ].join(" ")}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* 지역 (GPS 자동 매칭 + 수동 선택) */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-bold text-text-secondary">
                    📍 지역
                    {gps && (
                      <span className="ml-1 rounded-full bg-jeju-green/10 px-1.5 py-0.5 text-[9px] font-bold text-jeju-green">
                        GPS 자동
                      </span>
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowRegionPicker((v) => !v)}
                    className="text-[11px] font-semibold text-brand-orange hover:underline"
                  >
                    {showRegionPicker ? "닫기" : region ? "변경" : "선택하기"}
                  </button>
                </div>

                {region && !showRegionPicker && (
                  <div className="rounded-xl bg-bg-secondary p-3">
                    <p className="text-sm font-bold text-text-primary">
                      📍 {region.fullName}
                    </p>
                    <p className="text-[10px] text-text-secondary">
                      {region.city} · {region.type}
                    </p>
                  </div>
                )}

                {(showRegionPicker || !region) && (
                  <div className="space-y-2 rounded-xl border border-border-soft bg-bg-secondary p-3">
                    {(["제주시", "서귀포시"] as const).map((city) => {
                      const regions = groupRegionsByCity()[city];
                      return (
                        <div key={city}>
                          <p className="mb-1.5 text-[10px] font-bold text-text-secondary">{city}</p>
                          <div className="flex flex-wrap gap-1">
                            {regions.map((r) => (
                              <button
                                key={r.id}
                                type="button"
                                onClick={() => {
                                  setRegion(r);
                                  setShowRegionPicker(false);
                                }}
                                className={[
                                  "rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors",
                                  region?.id === r.id
                                    ? "bg-brand-navy text-white"
                                    : "bg-bg-card border border-border-soft text-text-secondary hover:bg-bg-primary",
                                ].join(" ")}
                              >
                                {r.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* EXIF 정보 */}
              {(exif.camera || exif.fStop || exif.iso) && (
                <div className="rounded-xl bg-bg-secondary p-3">
                  <p className="mb-1.5 text-[10px] font-bold text-text-secondary">📷 자동 추출된 EXIF</p>
                  <div className="flex flex-wrap gap-1.5">
                    {exif.camera && <Pill>{exif.camera}</Pill>}
                    {exif.focalLength && <Pill>{exif.focalLength}</Pill>}
                    {exif.fStop && <Pill>{exif.fStop}</Pill>}
                    {exif.iso && <Pill>ISO {exif.iso}</Pill>}
                    {exif.exposureTime && <Pill>{exif.exposureTime}</Pill>}
                  </div>
                </div>
              )}

              {error && (
                <p className="rounded-xl bg-live-red/10 px-3 py-2 text-[11px] font-semibold text-live-red">
                  ❌ {error}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {user && previewUrl && (
          <div className="shrink-0 border-t border-border-soft p-4">
            <button
              type="button"
              onClick={handlePost}
              disabled={status === "analyzing" || status === "uploading" || !aiCopy.trim()}
              className="w-full rounded-xl bg-brand-orange py-3 text-sm font-bold text-white hover:bg-brand-orange/90 disabled:opacity-50 transition-colors"
            >
              {status === "uploading" ? "올리는 중..." : status === "done" ? "✅ 완료!" : "피드 올리기"}
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-bg-card px-2 py-0.5 text-[10px] font-medium text-text-secondary">
      {children}
    </span>
  );
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // "data:image/jpeg;base64,xxx" 에서 base64 부분만
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
