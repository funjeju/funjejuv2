"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usageHeaders } from "@/lib/client-usage";
import type { AcrosticEntry, AcrosticTopic } from "@/types/acrostic";

export function AcrosticPlay({ topic }: { topic: AcrosticTopic }) {
  const { user } = useAuth();
  const chars = [...topic.word];
  const closed = !!topic.endsAt && Date.now() > topic.endsAt;

  const [entries, setEntries] = useState<AcrosticEntry[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [myCount, setMyCount] = useState(0);
  const [myUserId, setMyUserId] = useState("");
  const [parts, setParts] = useState<string[]>(chars.map(() => ""));
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => { if (user?.displayName) setName(user.displayName); }, [user]);

  const load = useCallback(async () => {
    const h = await usageHeaders(user);
    const r = await fetch(`/api/acrostic?topicId=${topic.id}`, { headers: h });
    const d = await r.json();
    setEntries(d.entries ?? []);
    setLikedIds(new Set(d.likedIds ?? []));
    setMyCount(d.myEntryCount ?? 0);
    setMyUserId(d.userId ?? "");
  }, [user, topic.id]);

  useEffect(() => { load(); }, [load]);

  async function submit() {
    if (parts.some((p) => !p.trim())) { setMsg("모든 행을 채워주세요"); return; }
    setBusy(true); setMsg("");
    const lines = chars.map((c, i) => `${c}${parts[i].trim()}`);
    const h = await usageHeaders(user);
    const body = JSON.stringify(
      editId
        ? { action: "edit", entryId: editId, lines }
        : { action: "submit", topicId: topic.id, lines, authorName: name }
    );
    const r = await fetch("/api/acrostic", { method: "POST", headers: { ...h, "Content-Type": "application/json" }, body });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setMsg(d.error ?? "실패"); return; }
    setParts(chars.map(() => "")); setEditId(null); setMsg(editId ? "수정됐어요!" : "등록됐어요!");
    load();
  }

  async function like(entryId: string) {
    // 낙관적 갱신
    const liked = likedIds.has(entryId);
    setLikedIds((s) => { const n = new Set(s); liked ? n.delete(entryId) : n.add(entryId); return n; });
    setEntries((es) => es.map((e) => e.id === entryId ? { ...e, likes: e.likes + (liked ? -1 : 1) } : e));
    const h = await usageHeaders(user);
    await fetch("/api/acrostic", { method: "POST", headers: { ...h, "Content-Type": "application/json" }, body: JSON.stringify({ action: "like", entryId }) }).catch(() => {});
    load();
  }

  async function remove(entryId: string) {
    if (!confirm("삭제할까요?")) return;
    const h = await usageHeaders(user);
    await fetch("/api/acrostic", { method: "POST", headers: { ...h, "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", entryId }) });
    load();
  }

  function startEdit(e: AcrosticEntry) {
    setEditId(e.id);
    setParts(chars.map((c, i) => (e.lines[i] ?? "").replace(new RegExp(`^${c}`), "")));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const sorted = [...entries].sort((a, b) => b.likes - a.likes || a.createdAt - b.createdAt);
  const canSubmit = !closed && (editId || myCount < topic.maxEntriesPerUser);

  return (
    <div>
      {/* 주제 이미지 */}
      {topic.image && (
        <div className="overflow-hidden rounded-2xl border border-border-soft">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={topic.image} alt={topic.word} className="w-full object-cover" />
        </div>
      )}
      <div className="mt-3 rounded-2xl bg-brand-navy px-4 py-3 text-center text-white">
        <p className="text-[11px] text-white/70">{topic.businessName || "삼행시 주제"}</p>
        <p className="text-2xl font-black tracking-widest">{topic.word}</p>
        <p className="mt-0.5 text-[11px] text-brand-yellow">
          {closed ? "🔒 마감됐어요" : `좋아요 많이 받으면 우승! · 1인 ${topic.maxEntriesPerUser}개`}
        </p>
      </div>

      {/* 작성기 */}
      {canSubmit ? (
        <div className="mt-3 rounded-2xl border border-border-soft bg-bg-card p-3 shadow-card">
          <p className="mb-2 text-xs font-bold text-text-primary">{editId ? "✏️ 내 삼행시 수정" : "✍️ 삼행시 짓기"}</p>
          <div className="space-y-1.5">
            {chars.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-orange text-base font-black text-white">{c}</span>
                <input
                  value={parts[i]}
                  onChange={(e) => setParts((p) => p.map((x, j) => j === i ? e.target.value : x))}
                  placeholder="이어서 입력…"
                  maxLength={40}
                  className="flex-1 rounded-lg border border-border-soft px-3 py-2 text-sm"
                />
              </div>
            ))}
          </div>
          {!user && (
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="닉네임(선택)" maxLength={20}
              className="mt-2 w-full rounded-lg border border-border-soft px-3 py-2 text-xs" />
          )}
          {msg && <p className="mt-1.5 text-[11px] font-bold text-brand-orange">{msg}</p>}
          <div className="mt-2 flex gap-2">
            <button onClick={submit} disabled={busy} className="flex-1 rounded-full bg-brand-orange py-2.5 text-sm font-bold text-white disabled:opacity-50">
              {busy ? "…" : editId ? "수정 저장" : "등록하기"}
            </button>
            {editId && <button onClick={() => { setEditId(null); setParts(chars.map(() => "")); }} className="rounded-full border border-border-soft px-4 text-sm font-semibold text-text-secondary">취소</button>}
          </div>
        </div>
      ) : (
        !closed && <p className="mt-3 rounded-xl bg-bg-secondary px-4 py-2.5 text-center text-[12px] text-text-secondary">이 주제는 다 참여했어요 (내 글 수정만 가능) ✏️</p>
      )}

      {/* 엔트리 목록 (좋아요순) */}
      <div className="mt-4 space-y-2">
        <p className="text-xs font-bold text-text-secondary">🏆 {sorted.length}개 · 좋아요순</p>
        {sorted.map((e, idx) => {
          const liked = likedIds.has(e.id);
          const mine = !!myUserId && e.userId === myUserId;
          return (
            <div key={e.id} className={`rounded-2xl border bg-bg-card p-3 shadow-card ${idx === 0 && e.likes > 0 ? "border-brand-orange" : "border-border-soft"}`}>
              <div className="flex items-start gap-3">
                <span className="shrink-0 text-sm font-black text-text-secondary">{idx === 0 && e.likes > 0 ? "👑" : `${idx + 1}`}</span>
                <div className="min-w-0 flex-1">
                  {e.lines.map((ln, i) => (
                    <p key={i} className="text-sm leading-6 text-text-primary">
                      <b className="text-brand-orange">{chars[i]}</b>{ln.replace(new RegExp(`^${chars[i]}`), "")}
                    </p>
                  ))}
                  <p className="mt-1 text-[10px] text-text-secondary">— {e.authorName}{e.updatedAt ? " (수정됨)" : ""}</p>
                </div>
                <button onClick={() => like(e.id)} className="flex shrink-0 flex-col items-center">
                  <span className={`text-xl ${liked ? "" : "grayscale opacity-50"}`}>{liked ? "❤️" : "🤍"}</span>
                  <span className={`text-[11px] font-bold ${liked ? "text-live-red" : "text-text-secondary"}`}>{e.likes}</span>
                </button>
              </div>
              {/* 본인 글만 수정/삭제 */}
              {mine && (
                <div className="mt-1.5 flex justify-end gap-2">
                  <button onClick={() => startEdit(e)} className="text-[10px] font-semibold text-text-secondary hover:text-brand-orange">수정</button>
                  <button onClick={() => remove(e.id)} className="text-[10px] font-semibold text-text-secondary hover:text-live-red">삭제</button>
                </div>
              )}
            </div>
          );
        })}
        {sorted.length === 0 && <p className="py-8 text-center text-sm text-text-secondary">첫 삼행시의 주인공이 되어보세요!</p>}
      </div>
    </div>
  );
}
