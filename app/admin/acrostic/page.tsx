"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { uploadFeedImage, resizeImageForUpload } from "@/lib/feed";
import type { AcrosticTopic } from "@/types/acrostic";

export default function AdminAcrosticPage() {
  const { user } = useAuth();
  const [word, setWord] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [homepageUrl, setHomepageUrl] = useState("");
  const [homepageName, setHomepageName] = useState("");
  const [image, setImage] = useState("");
  const [maxEntriesPerUser, setMax] = useState(1);
  const [endsAt, setEndsAt] = useState(""); // datetime-local
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [topics, setTopics] = useState<AcrosticTopic[]>([]);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/acrostic");
    const d = await r.json().catch(() => ({}));
    setTopics(d.items ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function upload(file: File | null) {
    if (!file || !user) return;
    setBusy(true);
    try { setImage(await uploadFeedImage(user.uid, await resizeImageForUpload(file))); }
    catch { setMsg("이미지 업로드 실패"); }
    finally { setBusy(false); }
  }

  async function create() {
    if (!word.trim()) { setMsg("주제 단어를 입력하세요"); return; }
    setBusy(true); setMsg("");
    const r = await fetch("/api/admin/acrostic", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        word, businessName, homepageUrl, homepageName, image,
        maxEntriesPerUser,
        endsAt: endsAt ? new Date(endsAt).getTime() : undefined,
      }),
    });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setMsg(d.error ?? "실패"); return; }
    setWord(""); setBusinessName(""); setHomepageUrl(""); setHomepageName(""); setImage(""); setMax(1); setEndsAt("");
    setMsg("✅ 주제 생성됨 (아래에서 발행)");
    load();
  }

  async function publish(id: string, on: boolean) {
    await fetch("/api/admin/acrostic", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, published: on }) });
    load();
  }
  async function remove(id: string) {
    if (!confirm("삭제할까요?")) return;
    await fetch(`/api/admin/acrostic?id=${id}`, { method: "DELETE" });
    load();
  }

  const inputCls = "w-full rounded-lg border border-border-soft px-3 py-2 text-sm";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-lg font-black text-text-primary">✍️ 삼행시 주제 출제</h1>
      <p className="mb-4 text-[11px] text-text-secondary">상호·메뉴명으로 주제를 만들고 발행하면 <Link href="/game/acrostic" className="text-brand-orange underline">삼행시 갤러리</Link>에 노출돼요.</p>

      <div className="space-y-2 rounded-2xl border border-border-soft bg-bg-card p-4 shadow-card">
        <label className="block text-xs font-bold text-text-secondary">주제 단어 (각 글자가 행 첫 글자)</label>
        <input value={word} onChange={(e) => setWord(e.target.value)} placeholder="예: 협재 / 흑돼지" className={inputCls} />

        <div className="grid grid-cols-2 gap-2">
          <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="업체명(표시용)" className={inputCls} />
          <input type="number" min={1} value={maxEntriesPerUser} onChange={(e) => setMax(Math.max(1, Number(e.target.value) || 1))} placeholder="1인 엔트리 수" className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input value={homepageUrl} onChange={(e) => setHomepageUrl(e.target.value)} placeholder="홈피 URL (/biz/슬러그)" className={inputCls} />
          <input value={homepageName} onChange={(e) => setHomepageName(e.target.value)} placeholder="CTA 업체명" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-bold text-text-secondary">마감(선택)</label>
          <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-bold text-text-secondary">주제 이미지(선택)</label>
          <input type="file" accept="image/*" onChange={(e) => upload(e.target.files?.[0] ?? null)} className="text-xs" />
          {image && <img src={image} alt="" className="mt-2 h-24 rounded-lg object-cover" />}
        </div>
        {msg && <p className="text-[11px] font-bold text-brand-orange">{msg}</p>}
        <button onClick={create} disabled={busy} className="w-full rounded-full bg-brand-orange py-2.5 text-sm font-bold text-white disabled:opacity-50">
          {busy ? "처리 중…" : "주제 생성"}
        </button>
      </div>

      <h2 className="mb-2 mt-8 text-sm font-black text-text-primary">출제된 주제 ({topics.length})</h2>
      <div className="space-y-2">
        {topics.map((t) => (
          <div key={t.id} className="flex items-center gap-3 rounded-2xl border border-border-soft bg-bg-card p-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-navy text-sm font-black text-white">{t.word.slice(0, 3)}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-text-primary">{t.businessName || t.word} · {t.word}</p>
              <p className="text-[11px] text-text-secondary">{t.status === "published" ? "🟢 발행" : "⚪ 대기"} · 1인 {t.maxEntriesPerUser}개 · 참여 {t.entryCount ?? 0}</p>
            </div>
            <Link href={`/game/acrostic/${t.id}`} target="_blank" rel="noopener noreferrer" className="shrink-0 text-[11px] font-semibold text-brand-orange">보기 ↗</Link>
            <button onClick={() => publish(t.id, t.status !== "published")} className="shrink-0 rounded-full bg-jeju-green px-3 py-1 text-[11px] font-bold text-white">{t.status === "published" ? "비공개" : "발행"}</button>
            <button onClick={() => remove(t.id)} className="shrink-0 rounded-full border border-border-soft px-3 py-1 text-[11px] font-semibold text-text-secondary">삭제</button>
          </div>
        ))}
      </div>
    </div>
  );
}
