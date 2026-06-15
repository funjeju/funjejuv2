"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useCctvs } from "@/hooks/useCctvs";
import { CCTV_GROUPS } from "@/types/cctv-location";
import type { CctvLocation, CctvFaq } from "@/types/cctv-location";

type Editable = CctvLocation;

const EMPTY = (id: string, formal: string): Editable => ({
  id, formal, short: "", facility: [], group: "", weatherNote: "", checkPoints: [], faq: [], nearby: [], needsReview: true,
});

export default function AdminCctvSeoPage() {
  const { cctvs } = useCctvs();
  const [locs, setLocs] = useState<Record<string, CctvLocation>>({});
  const [sel, setSel] = useState<string>("");
  const [form, setForm] = useState<Editable | null>(null);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/cctv-seo");
    const d = await res.json();
    const map: Record<string, CctvLocation> = {};
    for (const l of (d.locations ?? []) as CctvLocation[]) map[l.id] = l;
    setLocs(map);
  }, []);
  useEffect(() => { load(); }, [load]);

  function pick(id: string) {
    setSel(id);
    const cam = cctvs.find((c) => c.id === id);
    setForm(locs[id] ? { ...locs[id] } : EMPTY(id, cam?.name?.replace(/\s+/g, "") || id));
    setMsg("");
  }

  async function save() {
    if (!form) return;
    setSaving(true); setMsg("");
    try {
      const res = await fetch("/api/admin/cctv-seo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const d = await res.json();
      setMsg(res.ok ? "✅ 저장됨" : `⚠️ ${d.error}`);
      if (res.ok) await load();
    } finally { setSaving(false); }
  }

  const counts = useMemo(() => {
    const done = Object.keys(locs).length;
    const review = Object.values(locs).filter((l) => l.needsReview).length;
    return { done, review, total: cctvs.length };
  }, [locs, cctvs]);

  const set = <K extends keyof Editable>(k: K, v: Editable[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-black text-text-primary">📍 CCTV 지역 SEO</h1>
      <p className="mb-4 text-sm text-text-secondary">
        작성 {counts.done}/{counts.total} · 검수대기 {counts.review} · weatherNote는 <b>변하지 않는 기후·지형</b>만(실시간 단정 금지)
      </p>

      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
        {/* 카메라 목록 */}
        <div className="max-h-[70vh] overflow-y-auto rounded-2xl border border-border-soft bg-bg-card p-2">
          {cctvs.map((c) => {
            const l = locs[c.id];
            return (
              <button key={c.id} type="button" onClick={() => pick(c.id)}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs ${sel === c.id ? "bg-brand-navy text-white" : "hover:bg-bg-secondary text-text-primary"}`}>
                <span className="truncate">{c.name}</span>
                <span className="shrink-0">
                  {l ? (l.needsReview ? "🟡" : "🟢") : "⚪"}
                </span>
              </button>
            );
          })}
        </div>

        {/* 편집 폼 */}
        <div className="rounded-2xl border border-border-soft bg-bg-card p-4">
          {!form ? (
            <p className="py-12 text-center text-sm text-text-secondary">왼쪽에서 카메라를 선택하세요.<br />🟢 작성완료 · 🟡 검수대기 · ⚪ 미작성</p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Field label="정식명 formal"><input value={form.formal} onChange={(e) => set("formal", e.target.value)} className="inp" /></Field>
                <Field label="약칭 short"><input value={form.short} onChange={(e) => set("short", e.target.value)} className="inp" /></Field>
              </div>
              <Field label="시설명/별칭 (줄당 1개)"><textarea value={form.facility.join("\n")} onChange={(e) => set("facility", lines(e.target.value))} rows={2} className="inp" /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="지역군 group">
                  <select value={form.group} onChange={(e) => set("group", e.target.value)} className="inp">
                    <option value="">선택…</option>
                    {CCTV_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </Field>
                <Field label="title 앞 형태 (titleLead, 선택)"><input value={form.titleLead ?? ""} onChange={(e) => set("titleLead", e.target.value || undefined)} className="inp" placeholder="비우면 formal" /></Field>
              </div>
              <Field label="🌤️ 날씨 특징 (evergreen — 기후·지형만, 실시간 금지)">
                <textarea value={form.weatherNote} onChange={(e) => set("weatherNote", e.target.value)} rows={4} className="inp" />
              </Field>
              <Field label="확인 포인트 (줄당 1개)"><textarea value={form.checkPoints.join("\n")} onChange={(e) => set("checkPoints", lines(e.target.value))} rows={3} className="inp" /></Field>

              {/* FAQ */}
              <div>
                <p className="mb-1 text-[11px] font-bold text-text-secondary">FAQ (질문형 롱테일 3~5개)</p>
                <div className="space-y-2">
                  {form.faq.map((f, i) => (
                    <div key={i} className="rounded-lg border border-border-soft p-2">
                      <input value={f.q} onChange={(e) => set("faq", form.faq.map((x, j) => j === i ? { ...x, q: e.target.value } : x))} placeholder="질문 (검색 문장 그대로)" className="inp mb-1" />
                      <textarea value={f.a} onChange={(e) => set("faq", form.faq.map((x, j) => j === i ? { ...x, a: e.target.value } : x))} rows={2} placeholder="답변" className="inp" />
                      <button type="button" onClick={() => set("faq", form.faq.filter((_, j) => j !== i))} className="mt-1 text-[11px] text-red-500">삭제</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => set("faq", [...form.faq, { q: "", a: "" } as CctvFaq])} className="rounded-full bg-bg-secondary px-3 py-1 text-[11px] font-bold text-text-primary">+ FAQ 추가</button>
                </div>
              </div>

              {/* nearby 선택 */}
              <Field label="주변 CCTV (내부링크 · 3~5개)">
                <div className="flex flex-wrap gap-1">
                  {cctvs.filter((c) => c.id !== form.id).map((c) => {
                    const on = form.nearby.includes(c.id);
                    return (
                      <button key={c.id} type="button"
                        onClick={() => set("nearby", on ? form.nearby.filter((x) => x !== c.id) : [...form.nearby, c.id])}
                        className={`rounded-full px-2 py-0.5 text-[10px] ${on ? "bg-jeju-green text-white" : "bg-bg-secondary text-text-secondary"}`}>{c.name}</button>
                    );
                  })}
                </div>
              </Field>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!form.needsReview} onChange={(e) => set("needsReview", e.target.checked)} />
                <span className="font-bold text-text-primary">검수 필요 (NEEDS_REVIEW)</span>
              </label>

              <div className="flex items-center gap-2">
                <button type="button" onClick={save} disabled={saving} className="rounded-full bg-brand-orange px-5 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? "저장 중…" : "저장"}</button>
                {msg && <span className="text-xs text-text-secondary">{msg}</span>}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`.inp{width:100%;border:1px solid var(--border-soft);border-radius:8px;padding:6px 10px;font-size:13px;background:var(--bg-card);color:var(--text-primary)}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-[11px] font-bold text-text-secondary">{label}</span>
      {children}
    </label>
  );
}
