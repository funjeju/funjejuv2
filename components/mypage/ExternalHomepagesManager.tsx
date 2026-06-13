"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getAuthor, updateUserProfile } from "@/lib/feed";

type Link = { name: string; url: string };

/**
 * 외부 홈페이지 링크 관리 — 우리 사이트에서 만든 홈페이지 외에,
 * 별도 URL의 홈페이지(블로그·스마트스토어·자사몰 등)를 여러 개 등록.
 * 등록한 링크는 피드 올릴 때 "연결할 홈페이지" 선택지에 함께 노출된다.
 */
export function ExternalHomepagesManager() {
  const { user } = useAuth();
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    getAuthor(user.uid).then((a) => { setLinks(a?.externalHomepages ?? []); setLoading(false); });
  }, [user]);

  async function persist(next: Link[]) {
    if (!user) return;
    setLinks(next);
    try {
      await updateUserProfile(user.uid, { externalHomepages: next });
      setSavedMsg("✅ 저장됨");
      setTimeout(() => setSavedMsg(""), 1500);
    } catch { setSavedMsg("❌ 저장 실패"); }
  }

  function add() {
    const n = name.trim(), u = url.trim();
    if (!n || !u) return;
    const normalized = /^https?:\/\//.test(u) ? u : `https://${u}`;
    persist([...links, { name: n.slice(0, 20), url: normalized }].slice(0, 10));
    setName(""); setUrl("");
  }

  if (!user || loading) return null;

  return (
    <section className="mx-4 mb-5 rounded-2xl border border-border-soft bg-bg-card p-4 shadow-card md:mx-0">
      <h3 className="mb-1 text-sm font-bold text-text-primary">🔗 외부 홈페이지 링크</h3>
      <p className="mb-3 text-[11px] text-text-secondary">
        블로그·스마트스토어·자사몰 등 다른 URL의 홈페이지를 등록하세요. 피드 올릴 때 연결 대상으로 선택할 수 있어요.
      </p>

      {links.length > 0 && (
        <div className="mb-3 space-y-1.5">
          {links.map((l, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl bg-bg-secondary px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-text-primary">{l.name}</p>
                <p className="truncate text-[10px] text-text-secondary">{l.url}</p>
              </div>
              <button type="button" onClick={() => persist(links.filter((_, idx) => idx !== i))}
                className="shrink-0 text-xs text-text-secondary hover:text-live-red">✕</button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름 (예: 우리 블로그)" maxLength={20}
          className="rounded-xl border border-border-soft bg-bg-secondary px-3 py-2 text-xs outline-none focus:border-brand-orange" />
        <div className="flex gap-2">
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." onKeyDown={(e) => { if (e.key === "Enter") add(); }}
            className="min-w-0 flex-1 rounded-xl border border-border-soft bg-bg-secondary px-3 py-2 text-xs outline-none focus:border-brand-orange" />
          <button type="button" onClick={add} disabled={!name.trim() || !url.trim()}
            className="shrink-0 rounded-xl bg-brand-navy px-4 py-2 text-xs font-bold text-white disabled:opacity-40">추가</button>
        </div>
      </div>
      {savedMsg && <p className="mt-2 text-center text-[11px] font-semibold text-jeju-green">{savedMsg}</p>}
    </section>
  );
}
