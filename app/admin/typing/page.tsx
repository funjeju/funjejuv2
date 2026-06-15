"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { TypingPassage, TypingSet } from "@/types/typing";

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
  const [aiKeyword, setAiKeyword] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState("");
  // 세트
  const [sets, setSets] = useState<TypingSet[]>([]);
  const [setTitle, setSetTitle] = useState("");
  const [setBiz, setSetBiz] = useState("");
  const [setMaxAtt, setSetMaxAtt] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const [bundleMsg, setBundleMsg] = useState("");

  const load = useCallback(async () => {
    const [r, rs] = await Promise.all([fetch("/api/admin/typing"), fetch("/api/admin/typing/set")]);
    const d = await r.json().catch(() => ({}));
    const ds = await rs.json().catch(() => ({}));
    setItems(d.items ?? []);
    setSets(ds.items ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const published = items.filter((p) => p.status === "published");
  function togglePick(id: string) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }
  async function createSet() {
    if (picked.length < 2) { setBundleMsg("지문을 2개 이상(권장 5개) 골라주세요"); return; }
    setBundleMsg("");
    const r = await fetch("/api/admin/typing/set", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: setTitle, businessName: setBiz, passageIds: picked, maxAttempts: setMaxAtt }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setBundleMsg(d.error ?? "실패"); return; }
    setSetTitle(""); setSetBiz(""); setPicked([]); setSetMaxAtt(0); setBundleMsg("✅ 세트 생성됨 (아래에서 발행)");
    load();
  }
  async function publishSet(id: string, on: boolean) {
    await fetch("/api/admin/typing/set", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, published: on }) });
    load();
  }
  async function removeSet(id: string) {
    if (!confirm("세트 삭제?")) return;
    await fetch(`/api/admin/typing/set?id=${id}`, { method: "DELETE" });
    load();
  }

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
  async function aiGenerate() {
    if (aiKeyword.trim().length < 2) { setAiMsg("키워드를 입력하세요"); return; }
    setAiBusy(true); setAiMsg("");
    const r = await fetch("/api/admin/typing/generate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword: aiKeyword, businessName, homepageUrl, homepageName }),
    });
    const d = await r.json().catch(() => ({}));
    setAiBusy(false);
    if (!r.ok) { setAiMsg(d.error ?? "실패"); return; }
    setAiMsg(`✅ ${(d.made ?? []).join("·")} 생성됨 (아래에서 검토·발행)`);
    load();
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
      <h1 className="mb-1 text-lg font-black text-text-primary">⌨️ 타자연습 지문 출제</h1>
      <p className="mb-4 text-[11px] text-text-secondary">매장·메뉴 설명을 지문으로. 발행하면 <Link href="/game/typing" className="text-brand-orange underline">타자 목록</Link>에 노출돼요. 주간순위는 점수(=타수×정확도^W) 기준.</p>

      {/* ✨ AI 생성 — 키워드 → 단문+장문 자동 출제 */}
      <div className="mb-4 space-y-2 rounded-2xl border border-brand-orange/30 bg-brand-orange/5 p-4">
        <p className="text-xs font-bold text-brand-orange">✨ AI 자동 생성 — 키워드 하나로 단문+장문 동시 출제</p>
        <div className="flex gap-2">
          <input value={aiKeyword} onChange={(e) => setAiKeyword(e.target.value)} placeholder="예: 협재 흑돼지 맛집 / 한라봉 케이크"
            className="min-w-0 flex-1 rounded-lg border border-border-soft px-3 py-2 text-sm" />
          <button onClick={aiGenerate} disabled={aiBusy} className="shrink-0 rounded-full bg-brand-orange px-4 text-sm font-bold text-white disabled:opacity-50">
            {aiBusy ? "생성 중…" : "✨ AI 생성"}
          </button>
        </div>
        <p className="text-[10px] text-text-secondary">위 업체명·홈피 칸을 채워두면 생성물에 함께 연결돼요. 결과는 draft로 들어가니 검토 후 발행.</p>
        {aiMsg && <p className="text-[11px] font-bold text-brand-orange">{aiMsg}</p>}
      </div>

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
              <Link href={`/game/typing/${p.id}`} target="_blank" rel="noopener noreferrer" className="shrink-0 text-[11px] font-semibold text-brand-orange">보기 ↗</Link>
              <button onClick={() => publish(p.id, p.status !== "published")} className="shrink-0 rounded-full bg-jeju-green px-3 py-1 text-[11px] font-bold text-white">{p.status === "published" ? "비공개" : "발행"}</button>
              <button onClick={() => remove(p.id)} className="shrink-0 rounded-full border border-border-soft px-3 py-1 text-[11px] font-semibold text-text-secondary">삭제</button>
            </div>
            <p className="mt-1 line-clamp-1 text-[11px] text-text-secondary">{p.status === "published" ? "🟢 발행" : "⚪ 대기"} · W{p.weightW} · {p.maxAttempts === 0 ? "무제한" : `주${p.maxAttempts}회`} · {p.text}</p>
          </div>
        ))}
      </div>

      {/* 🔥 묶음 세트 만들기 (발행된 지문에서 선택) */}
      <h2 className="mb-2 mt-10 text-sm font-black text-text-primary">🔥 묶음 세트 만들기</h2>
      <div className="space-y-2 rounded-2xl border border-brand-orange/30 bg-brand-orange/5 p-4">
        <p className="text-[11px] text-text-secondary">발행된 지문 중 골라 묶으면(권장 5개) 연속 플레이 + 평균 타수 랭킹이 돼요.</p>
        <div className="grid grid-cols-2 gap-2">
          <input value={setTitle} onChange={(e) => setSetTitle(e.target.value)} placeholder="세트 제목" className={inputCls} />
          <input value={setBiz} onChange={(e) => setSetBiz(e.target.value)} placeholder="업체명(표시용)" className={inputCls} />
        </div>
        <input type="number" min={0} value={setMaxAtt} onChange={(e) => setSetMaxAtt(Math.max(0, Number(e.target.value) || 0))} placeholder="주당 도전 횟수(0=무제한)" className={inputCls} />
        <div className="max-h-60 space-y-1 overflow-y-auto rounded-lg border border-border-soft bg-bg-card p-2">
          {published.length === 0 && <p className="py-2 text-center text-[11px] text-text-secondary">먼저 지문을 발행하세요</p>}
          {published.map((p) => (
            <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-[11px] hover:bg-bg-secondary">
              <input type="checkbox" checked={picked.includes(p.id)} onChange={() => togglePick(p.id)} />
              <span className="rounded bg-brand-navy px-1.5 text-[9px] font-bold text-white">{p.kind === "long" ? "장" : "단"}</span>
              <span className="min-w-0 flex-1 truncate text-text-secondary">{p.businessName ? `[${p.businessName}] ` : ""}{p.text}</span>
            </label>
          ))}
        </div>
        <p className="text-[11px] font-bold text-brand-orange">선택 {picked.length}개</p>
        {bundleMsg && <p className="text-[11px] font-bold text-brand-orange">{bundleMsg}</p>}
        <button onClick={createSet} className="w-full rounded-full bg-brand-orange py-2.5 text-sm font-bold text-white">세트 생성</button>
      </div>

      <h3 className="mb-2 mt-6 text-sm font-black text-text-primary">만든 세트 ({sets.length})</h3>
      <div className="space-y-2">
        {sets.map((s) => (
          <div key={s.id} className="flex items-center gap-2 rounded-2xl border border-border-soft bg-bg-card p-3">
            <span className="rounded-full bg-brand-orange px-2 py-0.5 text-[10px] font-bold text-white">{s.passageIds.length}개</span>
            <span className="min-w-0 flex-1 truncate text-sm font-bold text-text-primary">{s.title}</span>
            <span className="shrink-0 text-[10px] text-text-secondary">{s.status === "published" ? "🟢" : "⚪"}</span>
            <Link href={`/game/typing/set/${s.id}`} target="_blank" rel="noopener noreferrer" className="shrink-0 text-[11px] font-semibold text-brand-orange">보기 ↗</Link>
            <button onClick={() => publishSet(s.id, s.status !== "published")} className="shrink-0 rounded-full bg-jeju-green px-3 py-1 text-[11px] font-bold text-white">{s.status === "published" ? "비공개" : "발행"}</button>
            <button onClick={() => removeSet(s.id)} className="shrink-0 rounded-full border border-border-soft px-3 py-1 text-[11px] font-semibold text-text-secondary">삭제</button>
          </div>
        ))}
      </div>
    </div>
  );
}
