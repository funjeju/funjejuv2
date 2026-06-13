"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

type BizSite = {
  slug: string;
  name: string;
  category: string;
  published: boolean;
  updatedAt?: string;
  heroImage?: string;
};

export function MyBizSites() {
  const { user } = useAuth();
  const [sites, setSites] = useState<BizSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    if (!user) { setLoading(false); return; }
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/biz/list", { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      setSites(d.items ?? []);
    } catch { setSites([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user]);

  async function remove(slug: string, name: string) {
    if (!user || !confirm(`'${name}' 홈페이지를 삭제할까요? 되돌릴 수 없어요.`)) return;
    setBusy(slug);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/biz/${encodeURIComponent(slug)}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setSites((prev) => prev.filter((s) => s.slug !== slug));
      else alert("삭제 실패");
    } catch { alert("삭제 실패"); }
    finally { setBusy(null); }
  }

  async function togglePublish(slug: string, next: boolean) {
    if (!user) return;
    setBusy(slug);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/biz/${encodeURIComponent(slug)}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ published: next }),
      });
      if (res.ok) setSites((prev) => prev.map((s) => (s.slug === slug ? { ...s, published: next } : s)));
      else alert("변경 실패");
    } catch { alert("변경 실패"); }
    finally { setBusy(null); }
  }

  if (loading || sites.length === 0) return null;

  return (
    <section className="mx-4 mb-5 md:mx-0">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-text-primary">
        🏠 내 홈페이지
        <span className="rounded-full bg-brand-orange/10 px-2 py-0.5 text-[10px] font-bold text-brand-orange">{sites.length}</span>
      </h3>
      <div className="space-y-2">
        {sites.map((s) => (
          <div key={s.slug} className="rounded-2xl border border-border-soft bg-bg-card px-4 py-3 shadow-card">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-bold text-text-primary">{s.name}</p>
                  {s.published ? (
                    <span className="shrink-0 rounded-full bg-jeju-green/10 px-1.5 py-0.5 text-[9px] font-bold text-jeju-green">발행됨</span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-bg-secondary px-1.5 py-0.5 text-[9px] font-bold text-text-secondary">비공개</span>
                  )}
                </div>
                <p className="truncate text-[10px] text-text-secondary">/biz/{s.slug}</p>
              </div>
              <Link
                href={`/biz/${s.slug}`}
                className="shrink-0 rounded-full bg-brand-orange/10 px-3 py-1.5 text-[10px] font-bold text-brand-orange hover:bg-brand-orange hover:text-white transition-colors"
              >
                열기 →
              </Link>
            </div>
            {/* 관리 버튼 */}
            <div className="mt-2 flex items-center gap-1.5 border-t border-border-soft pt-2">
              <Link
                href={`/biz/${encodeURIComponent(s.slug)}/edit`}
                className="rounded-full border border-border-soft bg-white px-2.5 py-1 text-[10px] font-bold text-text-secondary hover:bg-bg-secondary"
              >
                ✏️ 편집
              </Link>
              <button
                type="button"
                disabled={busy === s.slug}
                onClick={() => togglePublish(s.slug, !s.published)}
                className="rounded-full border border-border-soft bg-white px-2.5 py-1 text-[10px] font-bold text-text-secondary hover:bg-bg-secondary disabled:opacity-40"
              >
                {s.published ? "🙈 비공개로" : "📢 발행하기"}
              </button>
              <button
                type="button"
                disabled={busy === s.slug}
                onClick={() => remove(s.slug, s.name)}
                className="ml-auto rounded-full border border-live-red/30 bg-white px-2.5 py-1 text-[10px] font-bold text-live-red hover:bg-live-red/5 disabled:opacity-40"
              >
                🗑 삭제
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
