"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { Content, ContentType } from "@/types/content";

const TYPE_META: Record<ContentType, { label: string; emoji: string; color: string; path: string }> = {
  webzine:  { label: "웹진",      emoji: "📰", color: "bg-brand-orange/10 text-brand-orange border-brand-orange/30", path: "/webzine" },
  briefing: { label: "모닝브리핑", emoji: "☀️", color: "bg-brand-navy/10 text-brand-navy border-brand-navy/30",     path: "/daily" },
  card_news:{ label: "카드뉴스",   emoji: "🃏", color: "bg-jeju-green/10 text-jeju-green border-jeju-green/30",     path: "/card" },
};

export default function AdminContentsPage() {
  const [items, setItems] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [activeType, setActiveType] = useState<ContentType | "all">("all");

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

  async function generate(type: ContentType) {
    setBusy(`gen-${type}`); setMsg("");
    try {
      const qs = type !== "webzine" ? `?type=${type}` : "";
      const res = await fetch(`/api/admin/contents${qs}`, { method: "POST" });
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

  const visible = activeType === "all" ? items : items.filter((c) => c.type === activeType);
  const drafts    = visible.filter((c) => c.status === "draft");
  const published = visible.filter((c) => c.status === "published");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* 헤더 */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-text-primary">📝 콘텐츠 관리</h1>
          <p className="text-sm text-text-secondary">웹진 · 모닝브리핑 · 카드뉴스 검수 → 1클릭 발행</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => generate("webzine")} disabled={busy === "gen-webzine"}
            className="rounded-full bg-brand-orange px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50">
            {busy === "gen-webzine" ? "생성 중…" : "📰 웹진 초안"}
          </button>
          <button type="button" onClick={() => generate("briefing")} disabled={busy === "gen-briefing"}
            className="rounded-full bg-brand-navy px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50">
            {busy === "gen-briefing" ? "생성 중…" : "☀️ 브리핑 생성"}
          </button>
        </div>
      </div>

      {msg && <p className="mb-4 rounded-xl bg-bg-secondary px-4 py-2 text-xs text-text-primary">{msg}</p>}

      {/* 타입 필터 탭 */}
      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
        {([["all", "전체", "🗂️"], ["webzine", "웹진", "📰"], ["briefing", "모닝브리핑", "☀️"], ["card_news", "카드뉴스", "🃏"]] as const).map(([t, label, emoji]) => (
          <button key={t} type="button" onClick={() => setActiveType(t)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              activeType === t ? "bg-text-primary text-white" : "border border-border-soft bg-bg-card text-text-secondary hover:bg-bg-secondary"
            }`}>
            {emoji} {label}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-text-secondary">불러오는 중…</p>}

      {/* 초안 */}
      <h2 className="mb-2 mt-4 text-sm font-black text-text-primary">검수 대기 ({drafts.length})</h2>
      <div className="space-y-2">
        {drafts.map((c) => {
          const meta = TYPE_META[c.type] ?? TYPE_META.webzine;
          return (
            <div key={c.id} className={`rounded-2xl border p-4 ${meta.color}`}>
              <div className="flex items-center gap-1.5">
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${meta.color}`}>
                  {meta.emoji} {meta.label}
                </span>
                {c.region && <span className="text-[10px] text-text-secondary">📍 {c.region}</span>}
                {c.menu && <span className="text-[10px] text-text-secondary">· {c.menu}</span>}
                <span className="text-[10px] text-text-secondary">섹션 {c.sections?.length ?? 0}</span>
              </div>
              <h3 className="mt-1.5 text-sm font-bold text-text-primary">{c.title}</h3>
              <p className="mt-0.5 line-clamp-2 text-[12px] text-text-secondary">{c.intro}</p>
              <div className="mt-2 flex gap-2">
                <Link href={`/admin/contents/preview/${c.slug}`}
                  className="rounded-full border-2 border-brand-navy bg-white px-3 py-1 text-[11px] font-bold !text-brand-navy hover:bg-brand-navy/5">
                  👁 미리보기
                </Link>
                <button type="button" onClick={() => publish(c.id)} disabled={busy === c.id}
                  className="rounded-full bg-jeju-green px-3 py-1 text-[11px] font-bold !text-white disabled:opacity-50">
                  🚀 배포
                </button>
                <button type="button" onClick={() => remove(c.id)} disabled={busy === c.id}
                  className="rounded-full border border-border-soft bg-white px-3 py-1 text-[11px] font-semibold text-text-secondary">
                  삭제
                </button>
              </div>
            </div>
          );
        })}
        {drafts.length === 0 && !loading && <p className="text-xs text-text-secondary">검수 대기 초안이 없어요.</p>}
      </div>

      {/* 발행됨 */}
      <h2 className="mb-2 mt-6 text-sm font-black text-text-primary">발행됨 ({published.length})</h2>
      <div className="space-y-2">
        {published.map((c) => {
          const meta = TYPE_META[c.type] ?? TYPE_META.webzine;
          return (
            <div key={c.id} className="flex items-center justify-between rounded-2xl border border-border-soft bg-bg-card p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${meta.color}`}>
                    {meta.emoji} {meta.label}
                  </span>
                  <h3 className="truncate text-sm font-bold text-text-primary">{c.title}</h3>
                </div>
                <Link href={`${meta.path}/${c.slug}`} className="mt-0.5 block text-[11px] text-brand-orange">
                  {meta.path}/{c.slug}
                </Link>
              </div>
              <button type="button" onClick={() => remove(c.id)} disabled={busy === c.id}
                className="ml-3 shrink-0 rounded-full border border-border-soft px-3 py-1 text-[11px] font-semibold text-text-secondary">
                삭제
              </button>
            </div>
          );
        })}
        {published.length === 0 && !loading && <p className="text-xs text-text-secondary">발행된 콘텐츠가 없어요.</p>}
      </div>
    </div>
  );
}
