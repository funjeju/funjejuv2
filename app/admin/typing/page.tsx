"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { TypingPassage } from "@/types/typing";

export default function AdminTypingPage() {
  const [text, setText] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [homepageUrl, setHomepageUrl] = useState("");
  const [homepageName, setHomepageName] = useState("");
  const [kind, setKind] = useState<"short" | "long">("short");
  const [weightW, setWeightW] = useState(1);
  const [maxAttempts, setMaxAttempts] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [items, setItems] = useState<TypingPassage[]>([]);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/typing");
    const d = await r.json().catch(() => ({}));
    setItems(d.items ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function create() {
    if (text.trim().length < 4) { setMsg("지문이 너무 짧아요"); return; }
    setBusy(true); setMsg("");
    const r = await fetch("/api/admin/typing", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, businessName, homepageUrl, homepageName, kind, weightW, maxAttempts }),
    });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setMsg(d.error ?? "실패"); return; }
    setText(""); setBusinessName(""); setHomepageUrl(""); setHomepageName(""); setKind("short"); setWeightW(1); setMaxAttempts(0);
    setMsg("✅ 지문 생성됨 (아래에서 발행)"); load();
  }
  async function publish(id: string, on: boolean) {
    await fetch("/api/admin/typing", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, published: on }) });
    load();
  }
  async function remove(id: string) {
    if (!confirm("삭제할까요?")) return;
    await fetch(`/api/admin/typing?id=${id}`, { method: "DELETE" });
    load();
  }

  const inputCls = "w-full rounded-lg border border-border-soft px-3 py-2 text-sm";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-lg font-black text-text-primary">⌨️ 한컴타자 지문 출제</h1>
      <p className="mb-4 text-[11px] text-text-secondary">매장·메뉴 설명을 지문으로. 발행하면 <Link href="/game/typing" className="text-brand-orange underline">타자 목록</Link>에 노출돼요. 주간순위는 점수(=타수×정확도^W) 기준.</p>

      <div className="space-y-2 rounded-2xl border border-border-soft bg-bg-card p-4 shadow-card">
        <label className="block text-xs font-bold text-text-secondary">지문 (매장/메뉴 설명·병맛 문장)</label>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="예: 협재 바다 앞 흑돼지 맛집, 두툼한 오겹살을 참숯에…" className={inputCls} />
        <div className="grid grid-cols-2 gap-2">
          <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="업체명(표시용)" className={inputCls} />
          <select value={kind} onChange={(e) => setKind(e.target.value as "short" | "long")} className={inputCls}>
            <option value="short">단문</option>
            <option value="long">장문</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input value={homepageUrl} onChange={(e) => setHomepageUrl(e.target.value)} placeholder="홈피 URL (/biz/슬러그)" className={inputCls} />
          <input value={homepageName} onChange={(e) => setHomepageName(e.target.value)} placeholder="CTA 업체명" className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-text-secondary">오타 가중치 W (기본 1, 클수록 오타에 민감)</label>
            <input type="number" min={0.5} step={0.5} value={weightW} onChange={(e) => setWeightW(Number(e.target.value) || 1)} className={inputCls} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-text-secondary">주당 도전 횟수 (0=무제한)</label>
            <input type="number" min={0} value={maxAttempts} onChange={(e) => setMaxAttempts(Math.max(0, Number(e.target.value) || 0))} className={inputCls} />
          </div>
        </div>
        {msg && <p className="text-[11px] font-bold text-brand-orange">{msg}</p>}
        <button onClick={create} disabled={busy} className="w-full rounded-full bg-brand-orange py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? "처리 중…" : "지문 생성"}</button>
      </div>

      <h2 className="mb-2 mt-8 text-sm font-black text-text-primary">출제된 지문 ({items.length})</h2>
      <div className="space-y-2">
        {items.map((p) => (
          <div key={p.id} className="rounded-2xl border border-border-soft bg-bg-card p-3">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-brand-navy px-2 py-0.5 text-[10px] font-bold text-white">{p.kind === "long" ? "장문" : "단문"}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-bold text-text-primary">{p.businessName || "제주 매장"}</span>
              <Link href={`/game/typing/${p.id}`} className="shrink-0 text-[11px] font-semibold text-brand-orange">보기</Link>
              <button onClick={() => publish(p.id, p.status !== "published")} className="shrink-0 rounded-full bg-jeju-green px-3 py-1 text-[11px] font-bold text-white">{p.status === "published" ? "비공개" : "발행"}</button>
              <button onClick={() => remove(p.id)} className="shrink-0 rounded-full border border-border-soft px-3 py-1 text-[11px] font-semibold text-text-secondary">삭제</button>
            </div>
            <p className="mt-1 line-clamp-1 text-[11px] text-text-secondary">{p.status === "published" ? "🟢 발행" : "⚪ 대기"} · W{p.weightW} · {p.maxAttempts === 0 ? "무제한" : `주${p.maxAttempts}회`} · {p.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
