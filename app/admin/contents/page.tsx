"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { Content } from "@/types/content";

export default function AdminContentsPage() {
  const [items, setItems] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/contents", { cache: "no-store" });
      const d = await res.json();
      setItems(d.items ?? []);
    } catch { setMsg("목록 조회 실패"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function generate() {
    setBusy("generate"); setMsg("");
    try {
      const res = await fetch("/api/admin/contents", { method: "POST" });
      const d = await res.json();
      setMsg(res.ok ? `초안 생성: ${d.title ?? d.error}` : `실패: ${d.error}`);
      await load();
    } catch { setMsg("생성 실패"); }
    finally { setBusy(null); }
  }

  async function publish(id: string) {
    setBusy(id);
    try {
      await fetch("/api/admin/contents", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
      });
      await load();
    } finally { setBusy(null); }
  }

  async function remove(id: string) {
    if (!confirm("삭제할까요?")) return;
    setBusy(id);
    try {
      await fetch(`/api/admin/contents?id=${id}`, { method: "DELETE" });
      await load();
    } finally { setBusy(null); }
  }

  const drafts = items.filter((c) => c.status === "draft");
  const published = items.filter((c) => c.status === "published");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-text-primary">📝 콘텐츠 관리</h1>
          <p className="text-sm text-text-secondary">웹진 초안 검수 → 1클릭 발행</p>
        </div>
        <button type="button" onClick={generate} disabled={busy === "generate"}
          className="rounded-full bg-brand-orange px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
          {busy === "generate" ? "생성 중…" : "+ 웹진 초안 생성"}
        </button>
      </div>

      {msg && <p className="mb-4 rounded-xl bg-bg-secondary px-4 py-2 text-xs text-text-primary">{msg}</p>}
      {loading && <p className="text-sm text-text-secondary">불러오는 중…</p>}

      {/* 초안 */}
      <h2 className="mb-2 mt-4 text-sm font-black text-text-primary">검수 대기 ({drafts.length})</h2>
      <div className="space-y-2">
        {drafts.map((c) => (
          <div key={c.id} className="rounded-2xl border border-brand-orange/30 bg-brand-orange/5 p-4">
            <p className="text-[10px] font-bold text-brand-orange">📍 {c.region} {c.menu} · 섹션 {c.sections.length}</p>
            <h3 className="mt-1 text-sm font-bold text-text-primary">{c.title}</h3>
            <p className="mt-0.5 line-clamp-2 text-[12px] text-text-secondary">{c.intro}</p>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => publish(c.id)} disabled={busy === c.id}
                className="rounded-full bg-jeju-green px-3 py-1 text-[11px] font-bold text-white disabled:opacity-50">
                ✓ 발행
              </button>
              <button type="button" onClick={() => remove(c.id)} disabled={busy === c.id}
                className="rounded-full border border-border-soft px-3 py-1 text-[11px] font-semibold text-text-secondary">
                삭제
              </button>
            </div>
          </div>
        ))}
        {drafts.length === 0 && !loading && <p className="text-xs text-text-secondary">검수 대기 초안이 없어요.</p>}
      </div>

      {/* 발행됨 */}
      <h2 className="mb-2 mt-6 text-sm font-black text-text-primary">발행됨 ({published.length})</h2>
      <div className="space-y-2">
        {published.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-2xl border border-border-soft bg-bg-card p-3">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold text-text-primary">{c.title}</h3>
              <Link href={`/webzine/${c.slug}`} className="text-[11px] text-brand-orange">/webzine/{c.slug}</Link>
            </div>
            <button type="button" onClick={() => remove(c.id)} disabled={busy === c.id}
              className="shrink-0 rounded-full border border-border-soft px-3 py-1 text-[11px] font-semibold text-text-secondary">
              삭제
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
