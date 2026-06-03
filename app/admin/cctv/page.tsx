"use client";

import { useState, useEffect, useCallback } from "react";
import type { CctvEntry } from "@/lib/cloudflare-kv";

const CATEGORIES = ["해변", "오름", "드라이브", "관광지", "마을", "항구", "포구", "공항", "기타"];
const REGIONS = ["제주시", "제주시 구좌읍", "제주시 조천읍", "제주시 애월읍", "제주시 한림읍", "제주시 한경면", "제주시 우도면", "제주시 삼양동", "제주시 용담동", "제주시 탑동", "제주시 도두동", "제주시 추자면", "서귀포시", "서귀포시 성산읍", "서귀포시 남원읍", "서귀포시 안덕면", "서귀포시 대정읍", "서귀포시 중문동", "서귀포시 보목동", "서귀포시 서홍동", "서귀포시 하예동"];

const EMPTY_FORM = {
  id: "",
  name: "",
  region: "제주시",
  category: "해변",
  originUrl: "",
  active: true,
};

export default function AdminCctvPage() {
  const [entries, setEntries] = useState<CctvEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const apiHeaders = {
    "Content-Type": "application/json",
  };

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/cctv", { headers: apiHeaders });
    if (res.ok) setEntries(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function notify(type: "ok" | "err", text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }

  async function handleSave() {
    if (!form.id || !form.name || !form.originUrl) {
      return notify("err", "ID, 이름, 원본 URL은 필수입니다");
    }
    setSaving(true);
    const res = await fetch("/api/admin/cctv", {
      method: "POST",
      headers: apiHeaders,
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      notify("ok", editingId ? "수정 완료!" : "추가 완료!");
      setForm(EMPTY_FORM);
      setEditingId(null);
      load();
    } else {
      const { error } = await res.json();
      notify("err", error ?? "저장 실패");
    }
  }

  async function handleToggle(entry: CctvEntry) {
    await fetch("/api/admin/cctv", {
      method: "PATCH",
      headers: apiHeaders,
      body: JSON.stringify({ id: entry.id, active: !entry.active }),
    });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm(`"${id}" CCTV를 삭제할까요?`)) return;
    await fetch("/api/admin/cctv", {
      method: "DELETE",
      headers: apiHeaders,
      body: JSON.stringify({ id }),
    });
    notify("ok", "삭제 완료");
    load();
  }

  function startEdit(entry: CctvEntry) {
    setForm({
      id: entry.id,
      name: entry.name,
      region: entry.region,
      category: entry.category,
      originUrl: entry.originUrl,
      active: entry.active,
    });
    setEditingId(entry.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-text-primary">📡 CCTV 관리</h1>
          <p className="text-sm text-text-secondary">원본 스트림 주소를 등록하면 프록시를 통해 자동 재생됩니다</p>
        </div>
        <span className="rounded-full bg-jeju-green/10 px-3 py-1.5 text-xs font-bold text-jeju-green border border-jeju-green/20">
          총 {entries.length}개
        </span>
      </div>

      {/* 알림 메시지 */}
      {message && (
        <div className={[
          "mb-4 rounded-xl px-4 py-3 text-sm font-semibold",
          message.type === "ok" ? "bg-jeju-green/10 text-jeju-green border border-jeju-green/20" : "bg-live-red/10 text-live-red border border-live-red/20"
        ].join(" ")}>
          {message.type === "ok" ? "✅" : "❌"} {message.text}
        </div>
      )}

      {/* 추가/수정 폼 */}
      <div className="mb-8 rounded-2xl border border-border-soft bg-bg-card p-5 shadow-card">
        <h2 className="mb-4 text-sm font-bold text-text-primary">
          {editingId ? `✏️ 수정 중: ${editingId}` : "➕ CCTV 추가"}
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-text-secondary">ID (영문, 고유값)</label>
            <input
              value={form.id}
              onChange={(e) => setForm({ ...form, id: e.target.value.toLowerCase().replace(/\s/g, "_") })}
              disabled={!!editingId}
              placeholder="예: hamdeok, seongsan_01"
              className="w-full rounded-xl border border-border-soft bg-bg-secondary px-3 py-2.5 text-sm outline-none focus:border-brand-orange disabled:opacity-50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-text-secondary">CCTV 이름</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="예: 함덕 해변 CCTV"
              className="w-full rounded-xl border border-border-soft bg-bg-secondary px-3 py-2.5 text-sm outline-none focus:border-brand-orange"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-text-secondary">지역</label>
            <select
              value={form.region}
              onChange={(e) => setForm({ ...form, region: e.target.value })}
              className="w-full rounded-xl border border-border-soft bg-bg-secondary px-3 py-2.5 text-sm outline-none"
            >
              {REGIONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-text-secondary">카테고리</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full rounded-xl border border-border-soft bg-bg-secondary px-3 py-2.5 text-sm outline-none"
            >
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-text-secondary">
              원본 스트림 URL <span className="text-live-red">(서버에만 저장, 외부 노출 안됨)</span>
            </label>
            <input
              value={form.originUrl}
              onChange={(e) => setForm({ ...form, originUrl: e.target.value })}
              placeholder="http://211.xxx.xxx.xxx/live.m3u8"
              className="w-full rounded-xl border border-border-soft bg-bg-secondary px-3 py-2.5 font-mono text-sm outline-none focus:border-brand-orange"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="h-4 w-4 accent-brand-orange"
            />
            <label htmlFor="active" className="text-sm font-medium text-text-primary">활성화</label>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-brand-orange px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-orange/90 disabled:opacity-50 transition-colors"
          >
            {saving ? "저장 중..." : editingId ? "수정 저장" : "추가하기"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => { setForm(EMPTY_FORM); setEditingId(null); }}
              className="rounded-xl border border-border-soft bg-bg-secondary px-5 py-2.5 text-sm font-semibold text-text-secondary hover:bg-bg-primary transition-colors"
            >
              취소
            </button>
          )}
        </div>
      </div>

      {/* 등록된 CCTV 목록 */}
      <div className="rounded-2xl border border-border-soft bg-bg-card shadow-card overflow-hidden">
        <div className="border-b border-border-soft px-5 py-4">
          <h2 className="text-sm font-bold text-text-primary">등록된 CCTV 목록</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-text-secondary text-sm">
            불러오는 중...
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <p className="text-3xl">📡</p>
            <p className="mt-3 text-sm font-bold text-text-primary">등록된 CCTV가 없습니다</p>
            <p className="text-xs text-text-secondary">위 폼에서 첫 번째 CCTV를 추가해보세요</p>
          </div>
        ) : (
          <div className="divide-y divide-border-soft">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-start gap-4 px-5 py-4 hover:bg-bg-secondary transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-text-primary">{entry.name}</span>
                    <span className="rounded-full bg-bg-secondary px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                      {entry.region}
                    </span>
                    <span className="rounded-full bg-bg-secondary px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                      {entry.category}
                    </span>
                    <span className={[
                      "rounded-full px-2 py-0.5 text-[10px] font-bold",
                      entry.active
                        ? "bg-jeju-green/10 text-jeju-green"
                        : "bg-gray-100 text-gray-400"
                    ].join(" ")}>
                      {entry.active ? "● 활성" : "○ 비활성"}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-text-secondary truncate">
                    ID: {entry.id}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-live-red/70 truncate">
                    {entry.originUrl}
                  </p>
                  {entry.addedAt && (
                    <p className="mt-0.5 text-[10px] text-text-secondary">
                      등록: {new Date(entry.addedAt).toLocaleString("ko-KR")}
                    </p>
                  )}
                  {/* 프록시 URL 복사 */}
                  <p className="mt-1 text-[11px] text-brand-navy font-mono truncate">
                    프록시: {process.env.NEXT_PUBLIC_WORKER_URL}/cctv/{entry.id}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleToggle(entry)}
                    className={[
                      "rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors",
                      entry.active
                        ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        : "bg-jeju-green/10 text-jeju-green hover:bg-jeju-green/20"
                    ].join(" ")}
                  >
                    {entry.active ? "비활성화" : "활성화"}
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(entry)}
                    className="rounded-lg bg-brand-navy/10 px-3 py-1.5 text-[11px] font-bold text-brand-navy hover:bg-brand-navy/20 transition-colors"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(entry.id)}
                    className="rounded-lg bg-live-red/10 px-3 py-1.5 text-[11px] font-bold text-live-red hover:bg-live-red/20 transition-colors"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
