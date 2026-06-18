"use client";

import { useEffect, useState } from "react";

type ShopRequest = {
  id: string;
  shopName: string;
  keywords: string;
  images: string[];
  status: "new" | "done";
  createdAt: number;
};

export default function AdminShopRequestsPage() {
  const [items, setItems] = useState<ShopRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      const res = await fetch("/api/shop-request", { cache: "no-store" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "조회 실패");
      setItems(d.items ?? []);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, []);

  async function setStatus(id: string, status: "new" | "done") {
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    await fetch("/api/shop-request", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    }).catch(() => {});
  }

  async function remove(id: string) {
    if (!confirm("이 접수를 삭제할까요?")) return;
    setItems((prev) => prev.filter((r) => r.id !== id));
    await fetch(`/api/shop-request?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
  }

  const newCount = items.filter((r) => r.status === "new").length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-text-primary">🏪 가게 신청 접수</h1>
          <p className="text-xs text-text-secondary">틀린그림찾기 &lsquo;우리 가게도 만들어주세요&rsquo; 접수 · 신규 {newCount}건</p>
        </div>
        <button type="button" onClick={load} className="rounded-full bg-brand-navy px-3 py-1.5 text-xs font-bold text-white">🔄 새로고침</button>
      </div>

      {error && <p className="mb-3 text-xs font-semibold text-live-red">❌ {error}</p>}
      {loading ? (
        <p className="py-16 text-center text-sm text-text-secondary">불러오는 중…</p>
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border-soft p-10 text-center text-sm text-text-secondary">아직 접수된 신청이 없어요.</p>
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <div key={r.id} className={`rounded-2xl border bg-bg-card p-4 shadow-card ${r.status === "new" ? "border-brand-orange/40" : "border-border-soft opacity-70"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${r.status === "new" ? "bg-brand-orange text-white" : "bg-bg-secondary text-text-secondary"}`}>
                      {r.status === "new" ? "신규" : "완료"}
                    </span>
                    <p className="text-sm font-black text-text-primary">{r.shopName}</p>
                  </div>
                  {r.keywords && <p className="mt-1 text-xs text-text-secondary">🔑 {r.keywords}</p>}
                  <p className="mt-0.5 text-[10px] text-text-secondary">{new Date(r.createdAt).toLocaleString("ko-KR")}</p>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  {r.status === "new" ? (
                    <button type="button" onClick={() => setStatus(r.id, "done")}
                      className="rounded-full bg-jeju-green px-2.5 py-1 text-[11px] font-bold text-white">완료 처리</button>
                  ) : (
                    <button type="button" onClick={() => setStatus(r.id, "new")}
                      className="rounded-full border border-border-soft px-2.5 py-1 text-[11px] text-text-secondary">신규로</button>
                  )}
                  <button type="button" onClick={() => remove(r.id)}
                    className="rounded-full border border-border-soft px-2.5 py-1 text-[11px] text-text-secondary hover:border-live-red hover:text-live-red">삭제</button>
                </div>
              </div>
              {r.images?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.images.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="h-24 w-24 rounded-lg object-cover" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
