"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { uploadFeedImage, resizeImageForUpload } from "@/lib/feed";
import { VIBES, type SiteSchema, type SiteBlock } from "@/lib/biz/types";
import { ensureGalleryBlock } from "@/lib/biz/utils";

const BLOCK_LABEL: Record<string, string> = {
  Hero: "대표 배너", Menu: "메뉴", FeaturedCard: "추천/특징", Gallery: "사진 갤러리",
  Review: "리뷰", Map: "위치 지도", CTA: "예약/문의 배너", Contact: "연락처",
  Announcement: "공지", PriceList: "가격표", BusinessHours: "영업시간",
  BlogReviews: "블로그 후기", AttractionInfo: "탐방 정보",
};
function blockLabel(t: string): string {
  const key = Object.keys(BLOCK_LABEL).find((k) => t.startsWith(k));
  return key ? BLOCK_LABEL[key] : t;
}

export default function BizEditPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const [site, setSite] = useState<SiteSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"hero" | "gallery" | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/biz/${encodeURIComponent(slug)}`, { headers: { Authorization: `Bearer ${token}` } });
        const d = await res.json();
        if (res.ok && d.site) setSite(ensureGalleryBlock(d.site));
        else setMsg(d.error ?? "불러오기 실패");
      } catch { setMsg("불러오기 실패"); }
      finally { setLoading(false); }
    })();
  }, [user, authLoading, slug]);

  function patchSite(p: Partial<SiteSchema>) {
    setSite((prev) => (prev ? { ...prev, ...p } : prev));
  }

  async function handleUpload(kind: "hero" | "gallery", files: FileList | null) {
    if (!files?.length || !user || !site) return;
    setUploading(kind);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) {
        urls.push(await uploadFeedImage(user.uid, await resizeImageForUpload(f)));
      }
      if (kind === "hero") {
        patchSite({ contentAssets: { ...site.contentAssets, heroImage: urls[0] } });
      } else {
        const next = { ...site, contentAssets: { ...site.contentAssets, galleryImages: [...(site.contentAssets.galleryImages ?? []), ...urls].slice(0, 12) } };
        // 첫 사진 업로드 시 갤러리 블록이 없으면 자동 추가 (섹션 목록·홈페이지에 노출)
        setSite(ensureGalleryBlock(next));
      }
    } catch { setMsg("이미지 업로드 실패"); }
    finally { setUploading(null); }
  }

  function removeGallery(i: number) {
    if (!site) return;
    patchSite({ contentAssets: { ...site.contentAssets, galleryImages: site.contentAssets.galleryImages.filter((_, idx) => idx !== i) } });
  }

  function toggleBlock(i: number) {
    if (!site) return;
    const layout: SiteBlock[] = site.layout.map((b, idx) => (idx === i ? { ...b, visible: b.visible === false ? true : false } : b));
    patchSite({ layout });
  }

  function moveBlock(i: number, dir: -1 | 1) {
    if (!site) return;
    const j = i + dir;
    if (j < 0 || j >= site.layout.length) return;
    const layout = [...site.layout];
    [layout[i], layout[j]] = [layout[j], layout[i]];
    patchSite({ layout });
  }

  async function save() {
    if (!user || !site) return;
    setSaving(true); setMsg("");
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/biz/${encodeURIComponent(slug)}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ patch: { designTokens: site.designTokens, contentAssets: site.contentAssets, layout: site.layout } }),
      });
      if (!res.ok) throw new Error();
      setMsg("✅ 저장 완료!");
      setTimeout(() => router.push(`/biz/${slug}`), 700);
    } catch { setMsg("저장 실패"); setSaving(false); }
  }

  if (authLoading || loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">불러오는 중…</div>;
  }
  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm font-bold">로그인이 필요해요</p>
        <button onClick={signInWithGoogle} className="rounded-full bg-gray-900 px-5 py-2.5 text-sm font-bold text-white">Google 로그인</button>
      </div>
    );
  }
  if (!site) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">{msg || "홈페이지를 찾을 수 없어요"}</div>;
  }

  const ca = site.contentAssets;

  return (
    <div className="mx-auto min-h-screen max-w-screen-sm bg-bg-primary px-4 py-5 pb-28">
      <div className="mb-4 flex items-center justify-between">
        <Link href={`/biz/${slug}`} className="text-sm font-bold text-brand-orange">← 홈페이지로</Link>
        <h1 className="text-base font-black text-text-primary">간단 편집</h1>
        <span className="w-16" />
      </div>

      {/* 테마 색상 */}
      <section className="mb-5 rounded-2xl border border-border-soft bg-bg-card p-4 shadow-card">
        <h2 className="mb-2 text-sm font-bold text-text-primary">🎨 테마 색상</h2>
        <div className="flex flex-wrap gap-2">
          {VIBES.map((v) => (
            <button key={v.id} type="button"
              onClick={() => patchSite({ designTokens: { ...site.designTokens, themeId: v.id } })}
              className={["flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-bold transition-colors",
                site.designTokens.themeId === v.id ? "border-brand-orange text-brand-orange" : "border-border-soft text-text-secondary"].join(" ")}>
              <span className="h-3 w-3 rounded-full" style={{ background: v.primaryColor }} />
              {v.label}
            </button>
          ))}
        </div>
      </section>

      {/* 대표 이미지 */}
      <section className="mb-5 rounded-2xl border border-border-soft bg-bg-card p-4 shadow-card">
        <h2 className="mb-2 text-sm font-bold text-text-primary">🖼️ 대표 이미지(상단 배너)</h2>
        {ca.heroImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ca.heroImage} alt="hero" className="mb-2 h-32 w-full rounded-xl object-cover" />
        ) : (
          <p className="mb-2 text-[11px] text-text-secondary">아직 이미지가 없어요. 매장 대표 사진을 올려보세요.</p>
        )}
        <label className="inline-block cursor-pointer rounded-full bg-brand-navy px-3 py-1.5 text-xs font-bold text-white">
          {uploading === "hero" ? "업로드 중…" : "사진 선택"}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload("hero", e.target.files)} />
        </label>
      </section>

      {/* 사진 갤러리 */}
      <section className="mb-5 rounded-2xl border border-border-soft bg-bg-card p-4 shadow-card">
        <h2 className="mb-2 text-sm font-bold text-text-primary">📸 매장·메뉴 사진 ({ca.galleryImages?.length ?? 0}/12)</h2>
        <div className="mb-2 flex flex-wrap gap-2">
          {(ca.galleryImages ?? []).map((src, i) => (
            <div key={src} className="relative h-16 w-16 overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`사진${i}`} className="h-full w-full object-cover" />
              <button type="button" onClick={() => removeGallery(i)} className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-[9px] text-white">✕</button>
            </div>
          ))}
        </div>
        <label className="inline-block cursor-pointer rounded-full bg-brand-navy px-3 py-1.5 text-xs font-bold text-white">
          {uploading === "gallery" ? "업로드 중…" : "사진 추가"}
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUpload("gallery", e.target.files)} />
        </label>
        <p className="mt-1.5 text-[10px] text-text-secondary">사진을 올리면 갤러리 섹션이 켜져 있을 때 홈페이지에 노출돼요.</p>
      </section>

      {/* 섹션(블록) 표시/순서 */}
      <section className="mb-5 rounded-2xl border border-border-soft bg-bg-card p-4 shadow-card">
        <h2 className="mb-2 text-sm font-bold text-text-primary">🧩 섹션 표시·순서</h2>
        <div className="space-y-1.5">
          {site.layout.map((b, i) => (
            <div key={b.blockId} className="flex items-center gap-2 rounded-xl bg-bg-secondary px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-text-primary">{blockLabel(b.componentType)}</span>
              <button type="button" onClick={() => moveBlock(i, -1)} disabled={i === 0} className="rounded px-1.5 text-text-secondary disabled:opacity-30">↑</button>
              <button type="button" onClick={() => moveBlock(i, 1)} disabled={i === site.layout.length - 1} className="rounded px-1.5 text-text-secondary disabled:opacity-30">↓</button>
              <button type="button" onClick={() => toggleBlock(i)}
                className={["rounded-full px-2.5 py-1 text-[10px] font-bold", b.visible === false ? "bg-bg-card text-text-secondary border border-border-soft" : "bg-jeju-green/15 text-jeju-green"].join(" ")}>
                {b.visible === false ? "숨김" : "표시"}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 저장 바 */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border-soft bg-bg-card/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-screen-sm items-center gap-2">
          {msg && <span className="text-xs font-semibold text-jeju-green">{msg}</span>}
          <button onClick={save} disabled={saving} className="ml-auto rounded-2xl bg-brand-orange px-6 py-3 text-sm font-bold text-white disabled:opacity-60">
            {saving ? "저장 중…" : "💾 저장하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
