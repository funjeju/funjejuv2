"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { CROPS, type CropType } from "@/lib/biz/grow";

interface Grow {
  id: string; advertiser: string; link: string; crop: CropType;
  growthDays: number; stage: number; cheers: number; completed: boolean;
}

/** 남의 미니홈 방문 시 키우기 구경 + 응원(👏). 로그인하면 응원 가능. */
export function VisitGrows({ ownerUid, grows: initial }: { ownerUid: string; grows: Grow[] }) {
  const { user, signInWithGoogle } = useAuth();
  const [grows, setGrows] = useState<Grow[]>(initial);
  const [busy, setBusy] = useState("");
  const [toast, setToast] = useState("");

  const cheer = async (growId: string) => {
    if (!user) { signInWithGoogle(); return; }
    setBusy(growId);
    try {
      const t = await user.getIdToken();
      const r = await fetch(`/api/minihome/u/${ownerUid}/cheer`, {
        method: "POST", headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify({ growId }),
      });
      const d = await r.json();
      if (!r.ok) { setToast(d.error || "실패"); window.setTimeout(() => setToast(""), 1600); return; }
      setGrows((gs) => gs.map((g) => (g.id === growId ? { ...g, cheers: d.cheers } : g)));
      setToast("응원했어요! 👏"); window.setTimeout(() => setToast(""), 1400);
    } finally { setBusy(""); }
  };

  if (grows.length === 0) return <div style={{ fontSize: 12, color: "#a89878", marginTop: 12 }}>아직 기르는 게 없어요.</div>;

  return (
    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#5b9e3f" }}>🌱 키우는 중 — 응원해주세요!</div>
      {grows.map((g) => {
        const pct = Math.round((g.stage / g.growthDays) * 100);
        return (
          <div key={g.id} style={{ border: "1px solid #e3d9c2", borderRadius: 10, padding: 11, background: "#fffdf6", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 34 }}>{g.stage === 0 ? "🌱" : CROPS[g.crop].emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{CROPS[g.crop].label} <span style={{ fontSize: 11, color: "#8a7a5a" }}>{g.stage}/{g.growthDays}일{g.completed ? " · 완성🎉" : ""}</span></div>
              <a href={g.link} target="_blank" rel="noopener noreferrer sponsored" style={{ display: "inline-block", fontSize: 10, background: "#fff3dc", color: "#a06a2c", border: "1px solid #ecdda3", borderRadius: 5, padding: "1px 6px", marginTop: 3, textDecoration: "none" }}>🏷️ {g.advertiser} (광고)</a>
              <div style={{ height: 6, background: "#eee5d4", borderRadius: 4, marginTop: 5, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: "#5b9e3f" }} />
              </div>
            </div>
            <button onClick={() => cheer(g.id)} disabled={busy === g.id} style={{ fontSize: 13, background: "#ffe0ec", color: "#c44b73", border: "1px solid #f5b8cd", borderRadius: 999, padding: "8px 12px", cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap" }}>👏 {g.cheers}</button>
          </div>
        );
      })}
      {toast && <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#3a332a", color: "#fff", borderRadius: 999, padding: "9px 20px", fontSize: 13, zIndex: 100 }}>{toast}</div>}
    </div>
  );
}
