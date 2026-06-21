"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { CROPS, type Campaign, type CropType } from "@/lib/biz/grow";

/**
 * 키우기 광고 패널 — 내 미니홈피(/minihome/me)에 표시.
 * 캠페인 선택 → 키우기 시작 → 하루 1회 물주기(서버 24h 검증) → 완성 이벤트 → 보말 보상 + SNS 공유.
 * 자라는 동안 광고주 상호+링크 노출(네이티브 광고).
 */

interface Grow {
  id: string; campaignId: string; advertiser: string; link: string; crop: CropType;
  growthDays: number; reward: number; stage: number; cheers: number;
  lastWateredAt: number; completed: boolean; rewardClaimed: boolean;
}

const COOLDOWN = 24 * 60 * 60 * 1000;

function fmtWait(ms: number) {
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}시간 ${m}분 후` : `${m}분 후`;
}

interface Progress { xp: number; level: number; bomal: number; leveledUp: boolean; }

export function GrowPanel({ accent, onProgress }: { accent: string; onProgress?: (p: Progress) => void }) {
  const { user } = useAuth();
  const [grows, setGrows] = useState<Grow[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState<string>("");
  const [toast, setToast] = useState("");

  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(""), 2200); };
  const token = useCallback(async () => (user ? user.getIdToken() : ""), [user]);

  const load = useCallback(async () => {
    if (!user) return;
    const t = await token();
    const r = await fetch("/api/minihome/me/grow", { headers: { Authorization: `Bearer ${t}` } });
    const d = await r.json();
    if (r.ok) { setGrows(d.grows ?? []); setCampaigns(d.campaigns ?? []); }
  }, [user, token]);

  useEffect(() => { load(); }, [load]);

  const start = async (campaignId: string) => {
    setBusy(campaignId);
    try {
      const t = await token();
      const r = await fetch("/api/minihome/me/grow", { method: "POST", headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" }, body: JSON.stringify({ campaignId }) });
      const d = await r.json();
      if (!r.ok) { flash(d.error || "시작 실패"); return; }
      setGrows((g) => [d.grow, ...g]); setPicking(false); flash("키우기를 시작했어요! 🌱");
    } finally { setBusy(""); }
  };

  const water = async (growId: string) => {
    setBusy(growId);
    try {
      const t = await token();
      const r = await fetch("/api/minihome/me/grow/water", { method: "POST", headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" }, body: JSON.stringify({ growId }) });
      const d = await r.json();
      if (!r.ok) { flash(d.nextWaterInMs ? `${fmtWait(d.nextWaterInMs)}에 줄 수 있어요 ⏳` : (d.error || "실패")); return; }
      setGrows((gs) => gs.map((g) => (g.id === growId ? d.grow : g)));
      if (d.progress && onProgress) onProgress(d.progress);
      flash(d.progress?.leveledUp ? `🎊 레벨 업! Lv.${d.progress.level}` : d.grow.completed ? "🎉 다 자랐어요! 보상을 받으세요" : "쑥쑥 자랐어요! 🌿 +10XP");
    } finally { setBusy(""); }
  };

  const claim = async (growId: string) => {
    setBusy(growId);
    try {
      const t = await token();
      const r = await fetch("/api/minihome/me/grow/claim", { method: "POST", headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" }, body: JSON.stringify({ growId }) });
      const d = await r.json();
      if (!r.ok) { flash(d.error || "실패"); return; }
      setGrows((gs) => gs.map((g) => (g.id === growId ? { ...g, rewardClaimed: true } : g)));
      if (d.progress && onProgress) onProgress(d.progress);
      flash(`🐚 보말 ${d.reward} 획득! +30XP`);
    } finally { setBusy(""); }
  };

  const share = (g: Grow) => {
    const text = `제주 미니홈피에서 ${g.advertiser}의 ${CROPS[g.crop].label}을 다 길렀어요! 🎉 #펀제주 #미니홈피`;
    if (navigator.share) navigator.share({ title: "펀제주 미니홈피", text, url: g.link }).catch(() => {});
    else { navigator.clipboard?.writeText(`${text} ${g.link}`); flash("공유 문구를 복사했어요!"); }
  };

  if (!user) return null;

  return (
    <div style={{ marginTop: 14, borderTop: "1px dashed #e3d9c2", paddingTop: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: accent }}>🌱 키우기 (광고)</span>
        <button onClick={() => setPicking((p) => !p)} style={{ fontSize: 12, background: accent, color: "#fff", border: "none", borderRadius: 7, padding: "5px 12px", cursor: "pointer" }}>{picking ? "닫기" : "+ 기르기 시작"}</button>
      </div>

      {picking && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 8, marginBottom: 12 }}>
          {campaigns.map((c) => (
            <div key={c.id} style={{ border: "1px solid #e3d9c2", borderRadius: 9, padding: 9, background: "#fffdf6" }}>
              <div style={{ fontSize: 22 }}>{CROPS[c.crop].emoji}</div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>{CROPS[c.crop].label}</div>
              <div style={{ fontSize: 10, color: "#8a7a5a", margin: "2px 0 6px" }}>{c.advertiser} · {c.growthDays}일 · 🐚{c.reward}</div>
              <button onClick={() => start(c.id)} disabled={busy === c.id} style={{ width: "100%", fontSize: 11, background: "#5b9e3f", color: "#fff", border: "none", borderRadius: 6, padding: "5px 0", cursor: "pointer", fontWeight: 700 }}>기르기</button>
            </div>
          ))}
        </div>
      )}

      {grows.length === 0 && !picking && <div style={{ fontSize: 11, color: "#a89878" }}>아직 기르는 게 없어요. 캠페인을 골라 시작해보세요!</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {grows.map((g) => {
          const pct = Math.round((g.stage / g.growthDays) * 100);
          const ready = Date.now() - (g.lastWateredAt || 0) >= COOLDOWN;
          const size = 22 + g.stage * 6;
          return (
            <div key={g.id} style={{ border: "1px solid #e3d9c2", borderRadius: 10, padding: 11, background: "#fffdf6" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 56, textAlign: "center", fontSize: size, lineHeight: 1 }}>{g.stage === 0 ? "🌱" : CROPS[g.crop].emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{CROPS[g.crop].label} <span style={{ fontSize: 11, color: "#8a7a5a" }}>{g.stage}/{g.growthDays}일</span></div>
                  {/* 네이티브 광고 배지 */}
                  <a href={g.link} target="_blank" rel="noopener noreferrer sponsored" style={{ display: "inline-block", fontSize: 10, background: "#fff3dc", color: "#a06a2c", border: "1px solid #ecdda3", borderRadius: 5, padding: "1px 6px", marginTop: 3, textDecoration: "none" }}>🏷️ {g.advertiser} (광고)</a>
                  <div style={{ height: 6, background: "#eee5d4", borderRadius: 4, marginTop: 5, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: accent, transition: "width .4s" }} />
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 9 }}>
                {g.completed ? (
                  g.rewardClaimed ? (
                    <>
                      <span style={{ fontSize: 12, color: "#5b9e3f", fontWeight: 700, flex: 1 }}>🎉 완성! 보상 받음</span>
                      <button onClick={() => share(g)} style={{ fontSize: 12, background: "#1d9bf0", color: "#fff", border: "none", borderRadius: 7, padding: "6px 12px", cursor: "pointer", fontWeight: 700 }}>📸 SNS 공유</button>
                    </>
                  ) : (
                    <button onClick={() => claim(g.id)} disabled={busy === g.id} style={{ flex: 1, fontSize: 13, background: "#e0890a", color: "#fff", border: "none", borderRadius: 7, padding: "8px 0", cursor: "pointer", fontWeight: 700 }}>🎁 보말 {g.reward} 받기</button>
                  )
                ) : (
                  <>
                    <button onClick={() => water(g.id)} disabled={busy === g.id || !ready} style={{ flex: 1, fontSize: 13, background: ready ? "#3f8fc4" : "#cdd8e2", color: "#fff", border: "none", borderRadius: 7, padding: "8px 0", cursor: ready ? "pointer" : "default", fontWeight: 700 }}>
                      💧 {CROPS[g.crop].verb} {ready ? "" : `(${fmtWait(COOLDOWN - (Date.now() - (g.lastWateredAt || 0)))})`}
                    </button>
                    <span style={{ fontSize: 11, color: "#c44b73" }}>👏 {g.cheers}</span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {toast && <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#3a332a", color: "#fff", borderRadius: 999, padding: "9px 20px", fontSize: 13, boxShadow: "0 2px 10px rgba(0,0,0,.3)", zIndex: 100 }}>{toast}</div>}
    </div>
  );
}
