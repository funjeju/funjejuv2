"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

/** 남의 미니홈 방문 시: 방문 기록(자동) + 방명록 남기기. */
interface Post { name: string; text: string }

export function VisitGuestbook({ ownerUid, accent = "#5b9e3f" }: { ownerUid: string; accent?: string }) {
  const { user, signInWithGoogle } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [text, setText] = useState("");

  // 방명록 로드
  useEffect(() => { fetch(`/api/minihome/u/${ownerUid}/guestbook`).then((r) => r.json()).then((d) => setPosts(d.posts ?? [])).catch(() => {}); }, [ownerUid]);

  // 방문 기록(로그인 시, 1회)
  useEffect(() => {
    if (!user) return;
    (async () => { try { const t = await user.getIdToken(); fetch(`/api/minihome/u/${ownerUid}/visit`, { method: "POST", headers: { Authorization: `Bearer ${t}` } }); } catch { /* */ } })();
  }, [user, ownerUid]);

  const send = useCallback(async () => {
    const v = text.trim(); if (!v) return;
    if (!user) { signInWithGoogle(); return; }
    setText("");
    try {
      const t = await user.getIdToken();
      const r = await fetch(`/api/minihome/u/${ownerUid}/guestbook`, { method: "POST", headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" }, body: JSON.stringify({ text: v }) });
      const d = await r.json(); if (d.post) setPosts((p) => [d.post, ...p]);
    } catch { /* */ }
  }, [text, user, ownerUid, signInWithGoogle]);

  return (
    <div style={{ marginTop: 12, border: "1px solid #e3d9c2", borderRadius: 10, background: "#fffdf6", padding: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#c44b73", borderBottom: "1px solid #ffd6e2", paddingBottom: 4, marginBottom: 6 }}>💬 방명록 남기기</div>
      <div style={{ fontSize: 12, lineHeight: 1.7, minHeight: 50 }}>
        {posts.length === 0 ? <p style={{ color: "#a89878", textAlign: "center", padding: "12px 0" }}>첫 방명록을 남겨보세요! ✍️</p> : posts.map((p, i) => <div key={i} style={{ borderBottom: "1px dashed #eee", padding: "3px 0" }}><b style={{ color: accent }}>{p.name}</b> {p.text}</div>)}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder={user ? "방명록 남기기..." : "로그인하고 방명록 남기기"} style={{ flex: 1, fontSize: 12, height: 32, border: "1px solid #e3d9c2", borderRadius: 7, padding: "0 8px", background: "#fff" }} />
        <button onClick={send} style={{ fontSize: 12, background: accent, color: "#fff", border: "none", borderRadius: 7, padding: "0 14px", cursor: "pointer", fontWeight: 700 }}>등록</button>
      </div>
    </div>
  );
}
