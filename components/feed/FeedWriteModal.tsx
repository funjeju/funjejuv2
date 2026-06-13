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
  const [userCopy,    setUserCopy]    = useState("");
  const [category,    setCategory]    = useState("자연");
  const [filter,      setFilter]      = useState<FeedFilter>("none");
  const [region,      setRegion]      = useState<JejuRegion | null>(null);
  const [gps,         setGps]         = useState<{ lat: number; lng: number } | null>(null);
  // GPS로 매칭한 업소
  const [placeName,   setPlaceName]   = useState("");
  const [placeCands,  setPlaceCands]  = useState<{ name: string; category: string; distance: number }[]>([]);
  const [editingPlace, setEditingPlace] = useState(false);
  const [exifMissing, setExifMissing] = useState(false);
  const [exifMissingReason, setExifMissingReason] = useState<"gps" | "camera" | "both">("both");
  const [status,      setStatus]      = useState<"idle" | "analyzing" | "uploading" | "done">("idle");
  const [error,       setError]       = useState("");
  // 가로 사진 처리
  const [isLandscape, setIsLandscape] = useState(false);
  const [cropX,       setCropX]       = useState(50); // 0~100, 좌우 크롭 위치
  // 비즈 홈페이지 연결 (관리자/영업사원이 대신 올릴 때)
  const [bizSites,    setBizSites]    = useState<{ slug: string; name: string }[]>([]);
  const [homepageSlug, setHomepageSlug] = useState("");

  useEffect(() => {
    if (!open) {
      setFile(null); setPreviewUrl(null); setExif({});
      setAiCopy(""); setUserCopy(""); setFilter("none");
      setRegion(null); setGps(null); setExifMissing(false);
      setPlaceName(""); setPlaceCands([]); setEditingPlace(false);
      setIsLandscape(false); setCropX(50);
      setHomepageSlug("");
      setStatus("idle"); setError("");
    }
  }, [open]);

  // 등록된 비즈 홈페이지 목록 (있으면 피드에 연결 선택지 노출)
  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/biz/list", { headers: { Authorization: `Bearer ${token}` } });
        const d = await res.json();
        setBizSites((d.items ?? []).map((s: { slug: string; name: string }) => ({ slug: s.slug, name: s.name })));
      } catch { setBizSites([]); }
    })();
  }, [open, user]);

  if (!open) return null;

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    e.target.value = "";   // 같은 파일 재선택 허용

    setError("");
    setFile(selected);
    const objectUrl = URL.createObjectURL(selected);
    setPreviewUrl(objectUrl);
    setCropX(50);

    // 가로/세로 감지
    await new Promise<void>((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        setIsLandscape(img.naturalWidth > img.naturalHeight);
        resolve();
      };
      img.onerror = () => resolve();
      img.src = objectUrl;
    });

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
      const hasGps = typeof lat === "number" && typeof lng === "number";

      // 카메라 EXIF 정보 확인 (1개라도 있는지)
      const hasCameraExif = !!(
        data?.Make || data?.Model || data?.LensModel ||
        data?.FNumber || data?.ISO || data?.ExposureTime ||
        data?.FocalLength || data?.DateTimeOriginal
      );

      // 둘 중 하나라도 없으면 차단
      if (!hasGps || !hasCameraExif) {
        setExifMissingReason(
          !hasGps && !hasCameraExif ? "both" : !hasGps ? "gps" : "camera"
        );
        setExifMissing(true);
        setStatus("idle");
        return;
      }

      setGps({ lat: lat as number, lng: lng as number });
      const matched = findNearestRegion(lat as number, lng as number);
      if (matched) setRegion(matched);

      // 근처 업소 매칭 — "이 업소 맞나요?" 확인용
      fetch(`/api/feed/place?lat=${lat}&lng=${lng}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.candidates?.length) {
            setPlaceCands(d.candidates);
            setPlaceName(d.candidates[0].name); // 가장 가까운 곳을 기본 제안
          }
        })
        .catch(() => {});

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
        // ISO로 저장해야 FeedCard parseExifDate가 촬영일을 정확히 읽는다 (로케일 문자열 X)
        const d = new Date(data.DateTimeOriginal);
        if (!isNaN(d.getTime())) parsed.date = d.toISOString();
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

    // 이중 안전장치 — 어떤 경로로든 EXIF 없으면 차단
    if (exifMissing || !gps || (!exif.camera && !exif.fStop && !exif.iso && !exif.exposureTime)) {
      setError("EXIF(GPS·카메라) 정보가 있는 원본 사진만 올릴 수 있어요");
      return;
    }

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
        ...(placeName.trim() && { placeName: placeName.trim() }),
        ...(homepageSlug && {
          homepageSlug,
          homepageName: bizSites.find((b) => b.slug === homepageSlug)?.name,
        }),
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
              <p className="text-xs text-text-secondary text-center px-4 leading-5">
                <span className="font-bold text-brand-orange">EXIF 정보(GPS·카메라)</span>가 있는<br />
                원본 사진만 올릴 수 있어요
              </p>
              <p className="text-[10px] text-text-secondary/70 text-center px-4">
                스크린샷·카톡 사진·다운로드 이미지 ❌
              </p>
            </button>

          ) : exifMissing ? (
            <div className="flex flex-col items-center gap-4">
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-gray-900">
                <Image src={previewUrl} alt="preview" fill className="object-cover opacity-30" unoptimized />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6">
                  <span className="text-5xl">🚫</span>
                  <p className="text-center text-base font-black text-white">
                    Live Feed는 EXIF 정보가<br />있는 원본만 올릴 수 있어요
                  </p>
                  <div className="rounded-xl bg-black/40 px-3 py-2 text-center">
                    <p className="text-[11px] font-bold text-white">
                      {exifMissingReason === "gps"      && "❌ GPS 위치 정보가 없어요"}
                      {exifMissingReason === "camera"   && "❌ 카메라 정보(기종·조리개 등)가 없어요"}
                      {exifMissingReason === "both"     && "❌ GPS·카메라 정보 모두 없어요"}
                    </p>
                  </div>
                  <p className="text-xs text-white/70 leading-relaxed text-center">
                    스크린샷·카톡 사진·다운로드 이미지는 올릴 수 없어요.<br />
                    카메라·스마트폰으로 직접 촬영한 원본 사진,<br />
                    그리고 위치 정보 저장이 켜진 상태여야 해요.
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

              {/* ── 이미지 프리뷰 ── */}
              {isLandscape ? (
                /* 가로 사진: 검은 상하단 바 + 1:1 이미지 + 크롭 슬라이더 */
                <div className="overflow-hidden rounded-2xl bg-black" style={{ aspectRatio: "4/5" }}>
                  <div className="flex h-full flex-col">

                    {/* 상단 검은 바 — AI 카피 */}
                    <div className="flex shrink-0 items-center justify-end px-4 py-3" style={{ height: "22%" }}>
                      {displayCopy ? (
                        <p
                          className="text-right font-black leading-6 text-white"
                          style={{
                            fontSize: "clamp(13px, 3.5vw, 17px)",
                            textShadow: "0 1px 8px rgba(0,0,0,0.5)",
                            letterSpacing: "-0.01em",
                          }}
                        >
                          {displayCopy}
                        </p>
                      ) : (
                        <p className="text-[11px] text-white/30 italic">AI 카피가 여기 표시됩니다</p>
                      )}
                    </div>

                    {/* 중앙 1:1 이미지 영역 */}
                    <div className="relative mx-auto w-full overflow-hidden" style={{ flex: "1 1 0", aspectRatio: "1/1", maxHeight: "56%" }}>
                      <Image
                        src={previewUrl}
                        alt="preview"
                        fill
                        className="object-cover"
                        style={{
                          filter: activeFilterCss,
                          objectPosition: `${cropX}% center`,
                        }}
                        unoptimized
                      />
                      {status === "analyzing" && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 text-white">
                          <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          <p className="text-xs">AI가 사진을 보고 있어요...</p>
                        </div>
                      )}
                    </div>

                    {/* 하단 검은 바 — EXIF */}
                    <div className="shrink-0 px-4 py-2" style={{ height: "22%" }}>
                      {region && (
                        <div className="mb-1">
                          <span className="text-[9px] font-bold text-white/60">📍 {region.fullName}</span>
                        </div>
                      )}
                      {hasExif && (
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          {exif.camera && (
                            <span className="text-[9px] font-medium text-white/80">📷 {exif.camera}</span>
                          )}
                          <div className="flex items-center gap-1.5 text-[9px] text-white/60">
                            {exif.focalLength && <span>{exif.focalLength}</span>}
                            {exif.fStop        && <span>{exif.fStop}</span>}
                            {exif.iso          && <span>ISO {exif.iso}</span>}
                            {exif.exposureTime && <span>{exif.exposureTime}</span>}
                          </div>
                        </div>
                      )}
                      {!hasExif && !region && (
                        <p className="text-[9px] text-white/30 italic">EXIF 정보가 여기 표시됩니다</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* 세로/정방형 사진: 기존 방식 */
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-gray-900">
                  <Image
                    src={previewUrl}
                    alt="preview"
                    fill
                    className="object-cover"
                    style={{ filter: activeFilterCss }}
                    unoptimized
                  />
                  {displayCopy && (
                    <div className="absolute right-3 top-3 max-w-[65%]">
                      <p className="text-right font-black leading-7 text-white"
                        style={{ fontSize: "clamp(14px, 4vw, 18px)", textShadow: "0 1px 12px rgba(0,0,0,0.7)", letterSpacing: "-0.01em" }}>
                        {displayCopy}
                      </p>
                    </div>
                  )}
                  {hasExif && !status && (
                    <>
                      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                      <div className="absolute inset-x-0 bottom-0 px-4 pb-3">
                        {region && (
                          <div className="mb-1.5">
                            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold text-white">📍 {region.fullName}</span>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] font-medium">
                          {exif.camera      && <span className="text-white/90">📷 {exif.camera}</span>}
                          {exif.focalLength && <span className="text-white/75">{exif.focalLength}</span>}
                          {exif.fStop       && <span className="text-white/75">{exif.fStop}</span>}
                          {exif.iso         && <span className="text-white/75">ISO {exif.iso}</span>}
                          {exif.exposureTime && <span className="text-white/75">{exif.exposureTime}</span>}
                        </div>
                      </div>
                    </>
                  )}
                  {status === "analyzing" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 text-white">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      <p className="text-sm">AI가 사진을 보고 있어요...</p>
                    </div>
                  )}
                </div>
              )}

              {/* 가로 사진 크롭 슬라이더 */}
              {isLandscape && (
                <div className="rounded-xl bg-bg-secondary px-3 py-2.5">
                  <div className="mb-1.5 flex items-center justify-between">
                    <p className="text-[10px] font-bold text-text-secondary">↔ 좌우 위치 조정</p>
                    <span className="text-[9px] text-text-secondary">드래그로 크롭 위치 변경</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={cropX}
                    onChange={(e) => setCropX(Number(e.target.value))}
                    className="w-full accent-brand-orange"
                  />
                  <div className="mt-0.5 flex justify-between text-[9px] text-text-secondary">
                    <span>← 왼쪽</span>
                    <span>중앙</span>
                    <span>오른쪽 →</span>
                  </div>
                </div>
              )}

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

              {/* ── 업소 확인 — GPS로 매칭, 확인 또는 직접 편집 ── */}
              {(placeCands.length > 0 || placeName || editingPlace) && (
                <div className="rounded-xl border border-brand-orange/30 bg-brand-orange/5 p-3">
                  {!editingPlace ? (
                    <>
                      <p className="text-xs font-bold text-text-primary">📍 이 업소가 맞나요?</p>
                      <p className="mt-1 text-sm font-black text-brand-navy">{placeName || "(매칭된 업소 없음)"}</p>
                      <div className="mt-2 flex gap-2">
                        {placeName && <span className="rounded-full bg-jeju-green/15 px-3 py-1.5 text-[11px] font-bold text-jeju-green">✓ 맞아요 (이대로 올라가요)</span>}
                        <button type="button" onClick={() => setEditingPlace(true)} className="rounded-full border border-border-soft px-3 py-1.5 text-[11px] font-semibold text-text-secondary hover:bg-bg-secondary">✏️ 아니요, 직접 입력</button>
                      </div>
                      {placeCands.length > 1 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          <span className="text-[10px] text-text-secondary">다른 후보:</span>
                          {placeCands.slice(0, 4).map((c) => (
                            <button key={c.name} type="button" onClick={() => setPlaceName(c.name)}
                              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${placeName === c.name ? "bg-brand-navy text-white" : "bg-bg-card text-text-secondary hover:bg-bg-secondary"}`}>
                              {c.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="mb-1.5 text-xs font-bold text-text-primary">✏️ 업소명 직접 입력</p>
                      <input type="text" value={placeName} onChange={(e) => setPlaceName(e.target.value.slice(0, 30))}
                        placeholder="예: 협재 흑돼지 OO집 (비워두면 업소명 없이 올라가요)"
                        className="w-full rounded-lg border border-border-soft bg-bg-card px-3 py-2 text-sm outline-none focus:border-brand-orange" />
                      <button type="button" onClick={() => setEditingPlace(false)} className="mt-1.5 text-[11px] font-semibold text-brand-orange">완료</button>
                    </>
                  )}
                </div>
              )}

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

              {/* ── 연결할 홈페이지 (등록된 비즈 홈페이지가 있을 때만) ── */}
              {bizSites.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-bold text-text-secondary">
                    🏠 연결할 홈페이지
                    <span className="ml-1 font-normal text-text-secondary">(선택 · 피드에 바로가기 버튼이 붙어요)</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setHomepageSlug("")}
                      className={["rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                        homepageSlug === "" ? "bg-brand-navy text-white" : "border border-border-soft bg-bg-card text-text-secondary hover:bg-bg-secondary"].join(" ")}
                    >
                      연결 안 함
                    </button>
                    {bizSites.map((b) => (
                      <button key={b.slug} type="button" onClick={() => setHomepageSlug(b.slug)}
                        className={["rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                          homepageSlug === b.slug ? "bg-brand-orange text-white" : "border border-border-soft bg-bg-card text-text-secondary hover:bg-bg-secondary"].join(" ")}>
                        {b.name}
                      </button>
                    ))}
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
