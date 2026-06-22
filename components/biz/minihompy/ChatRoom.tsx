"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { track } from "@/lib/analytics";

/**
 * 미니홈피 실시간 채팅 — 3초 폴링 + 20초 접속 핑.
 * 같은 미니홈피에 동시 접속한 사람끼리 인사·대화. 로그인하면 전송 가능.
 */

interface Msg { id: string; fromUid: string; name: string; text: string; createdAt: number; }

export function ChatRoom({ ownerUid, accent = "#5b86c2" }: { ownerUid: string; accent?: string }) {
  const { user, signInWithGoogle } = useAuth();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [online, setOnline] = useState(0);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/minihome/u/${ownerUid}/chat`);
      const d = await r.json();
      if (r.ok) { setMsgs(d.messages ?? []); setOnline(d.online ?? 0); }
    } catch { /* ignore */ }
  }, [ownerUid]);

  // 폴링
  useEffect(() => { load(); const id = window.setInterval(load, 3000); return () => clearInterval(id); }, [load]);

  // 접속 핑
  useEffect(() => {
    if (!user) return;
    const ping = async () => {
      try { const t = await user.getIdToken(); await fetch(`/api/minihome/u/${ownerUid}/chat`, { method: "POST", headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" }, body: JSON.stringify({ ping: true }) }); } catch { /* */ }
    };
    ping(); const id = window.setInterval(ping, 20000); return () => clearInterval(id);
  }, [user, ownerUid]);

  // 새 메시지 시 스크롤 하단
  useEffect(() => { if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight; }, [msgs]);

  const send = async () => {
    const v = text.trim();
    if (!v || !user) return;
    setSending(true); setText("");
    try {
      const t = await user.getIdToken();
      await fetch(`/api/minihome/u/${ownerUid}/chat`, { method: "POST", headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" }, body: JSON.stringify({ text: v }) });
      track("minihome_chat_send", { owner: ownerUid });
      await load();
    } finally { setSending(false); }
  };

  return (
    <div style={{ marginTop: 12, border: "1px solid #e3d9c2", borderRadius: 10, overflow: "hidden", background: "#fffdf6" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: accent, color: "#fff", padding: "6px 11px", fontSize: 12 }}>
        <span style={{ fontWeight: 700 }}>💬 실시간 채팅</span>
        <span><span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: "#7fffa9", marginRight: 4 }} />지금 {online}명 접속중</span>
      </div>
      <div ref={boxRef} style={{ height: 168, overflowY: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 5 }}>
        {msgs.length === 0 && <div style={{ fontSize: 12, color: "#a89878", textAlign: "center", marginTop: 50 }}>아직 대화가 없어요. 인사를 건네보세요! 👋</div>}
        {msgs.map((m) => {
          const mine = m.fromUid === user?.uid;
          return (
            <div key={m.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "78%" }}>
              {!mine && <div style={{ fontSize: 10, color: "#8a7a5a", marginBottom: 1 }}>{m.name}</div>}
              <div style={{ fontSize: 13, background: mine ? accent : "#f0ece2", color: mine ? "#fff" : "#3a332a", borderRadius: 10, padding: "5px 9px", wordBreak: "break-word" }}>{m.text}</div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 6, padding: 8, borderTop: "1px solid #eee5d4" }}>
        {user ? (
          <>
            <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="메시지 입력..." style={{ flex: 1, fontSize: 13, height: 34, border: "1px solid #e3d9c2", borderRadius: 7, padding: "0 9px", background: "#fff" }} />
            <button onClick={send} disabled={sending} style={{ fontSize: 13, background: accent, color: "#fff", border: "none", borderRadius: 7, padding: "0 14px", cursor: "pointer", fontWeight: 700 }}>전송</button>
          </>
        ) : (
          <button onClick={signInWithGoogle} style={{ flex: 1, fontSize: 13, background: "#5b9e3f", color: "#fff", border: "none", borderRadius: 7, padding: "8px 0", cursor: "pointer", fontWeight: 700 }}>로그인하고 채팅하기</button>
        )}
      </div>
    </div>
  );
}
