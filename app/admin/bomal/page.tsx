"use client";

import { useState } from "react";

/** 어드민 보말 수동 지급 — uid에 보말 가산/차감(음수). 운영·보상·CS·테스트용. */
export default function AdminBomalPage() {
  const [uid, setUid] = useState("");
  const [amount, setAmount] = useState(100);
  const [msg, setMsg] = useState("");

  const grant = async () => {
    setMsg("");
    const r = await fetch("/api/admin/grant-bomal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uid, amount }) });
    if (r.status === 401) { setMsg("⚠️ 어드민 로그인이 필요합니다"); return; }
    const d = await r.json();
    if (!r.ok) { setMsg(d.error || "실패"); return; }
    setMsg(`✓ 지급 완료 — 현재 잔액 🐚 ${d.bomal}`);
  };

  const input: React.CSSProperties = { width: "100%", border: "1px solid #ddd", borderRadius: 8, padding: "9px 11px", fontSize: 14, boxSizing: "border-box" };

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: 20, fontFamily: "'Apple SD Gothic Neo',sans-serif" }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>🐚 보말 수동 지급</h1>
      <p style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>유저 uid에 보말을 가산(음수=차감)합니다. 실제 충전(현금 결제)은 PG 연동 후 billing/webhook으로 자동 적립됩니다.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div><label style={{ fontSize: 12, color: "#666" }}>유저 uid</label><input style={input} value={uid} onChange={(e) => setUid(e.target.value)} placeholder="Firebase uid" /></div>
        <div><label style={{ fontSize: 12, color: "#666" }}>보말 (음수=차감)</label><input style={input} type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></div>
        <button onClick={grant} style={{ background: "#e8590c", color: "#fff", border: "none", borderRadius: 8, padding: "10px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>지급</button>
        {msg && <div style={{ fontSize: 13, color: msg.startsWith("✓") ? "#2a8a3f" : "#c0392b" }}>{msg}</div>}
      </div>
    </div>
  );
}
