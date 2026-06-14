"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type BizRow = {
  slug: string;
  name: string;
  category: string;
  address: string;
  ownerId: string;
  published: boolean;
  heroImage: string;
  createdAt: string;
};

export default function AdminBizPage() {
  const [items, setItems] = useState<BizRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/admin/biz", { cache: "no-store" });
    const d = await r.json().catch(() => ({ items: [] }));
    setItems(d.items ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function togglePublish(s: BizRow) {
    setBusy(s.slug);
    await fetch("/api/admin/biz", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: s.slug, published: !s.published }),
    });
    setItems((prev) => prev.map((x) => (x.slug === s.slug ? { ...x, published: !x.published } : x)));
    setBusy(null);
  }

  async function remove(s: BizRow) {
    if (!confirm(`'${s.name}' 홈페이지를 삭제할까요? 되돌릴 수 없어요.`)) return;
    setBusy(s.slug);
    const r = await fetch(`/api/admin/biz?slug=${encodeURIComponent(s.slug)}`, { method: "DELETE" });
    if (r.ok) {
      setItems((prev) => prev.filter((x) => x.slug !== s.slug));
      setMsg(`🗑️ '${s.name}' 삭제됨`);
    } else {
      setMsg("삭제 실패");
    }
    setBusy(null);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-text-primary">🏠 비즈 홈페이지 관리</h1>
          <p className="text-xs text-text-secondary">전체 {items.length}개 · 모든 사업자 계정 홈페이지 제어</p>
        </div>
        <button onClick={load} className="rounded-full border border-border-soft px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-bg-secondary">새로고침</button>
      </div>

      {msg && <p className="mb-3 rounded-lg bg-bg-secondary px-3 py-2 text-xs text-text-secondary">{msg}</p>}

      {loading ? (
        <p className="py-10 text-center text-sm text-text-secondary">불러오는 중…</p>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-sm text-text-secondary">생성된 홈페이지가 없어요</p>
      ) : (
        <div className="space-y-2">
          {items.map((s) => (
            <div key={s.slug} className="flex items-center gap-3 rounded-xl border border-border-soft bg-bg-card p-3">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-bg-secondary">
                {s.heroImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.heroImage} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg opacity-40">🏠</div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-bold text-text-primary">{s.name}</p>
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${s.published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {s.published ? "공개" : "비공개"}
                  </span>
                </div>
                <p className="truncate text-[11px] text-text-secondary">{s.category} · {s.address || "주소 없음"}</p>
                <p className="truncate text-[10px] text-text-secondary/70">/{s.slug} · owner {s.ownerId.slice(0, 8)}…</p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Link href={`/biz/${encodeURIComponent(s.slug)}`} target="_blank" className="rounded-full bg-bg-secondary px-2.5 py-1.5 text-[11px] font-semibold text-text-secondary hover:bg-bg-primary">보기</Link>
                <Link href={`/biz/${encodeURIComponent(s.slug)}/edit`} className="rounded-full bg-brand-navy/10 px-2.5 py-1.5 text-[11px] font-semibold text-brand-navy hover:bg-brand-navy/20">수정</Link>
                <button onClick={() => togglePublish(s)} disabled={busy === s.slug} className="rounded-full bg-bg-secondary px-2.5 py-1.5 text-[11px] font-semibold text-text-secondary hover:bg-bg-primary disabled:opacity-40">
                  {s.published ? "비공개로" : "공개로"}
                </button>
                <button onClick={() => remove(s)} disabled={busy === s.slug} className="rounded-full bg-live-red/10 px-2.5 py-1.5 text-[11px] font-semibold text-live-red hover:bg-live-red/20 disabled:opacity-40">삭제</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-[11px] text-text-secondary">
        ⚠️ '수정'은 편집기로 이동합니다. 어드민 본인(naggu1999@gmail.com)으로 <b>구글 로그인</b>돼 있어야 다른 계정 홈페이지도 저장돼요.
      </p>
    </div>
  );
}
