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

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/biz/list", { headers: { Authorization: `Bearer ${token}` } });
        const d = await res.json();
        setSites(d.items ?? []);
      } catch { setSites([]); }
      finally { setLoading(false); }
    })();
  }, [user]);

  if (loading || sites.length === 0) return null;

  return (
    <section className="mx-4 mb-5 md:mx-0">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-text-primary">
        🏠 내 홈페이지
        <span className="rounded-full bg-brand-orange/10 px-2 py-0.5 text-[10px] font-bold text-brand-orange">{sites.length}</span>
      </h3>
      <div className="space-y-2">
        {sites.map((s) => (
          <div key={s.slug} className="flex items-center gap-3 rounded-2xl border border-border-soft bg-bg-card px-4 py-3 shadow-card">
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
        ))}
      </div>
    </section>
  );
}
