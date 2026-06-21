"use client";

import { useCallback, useEffect, useState } from "react";
import { CROPS, type CropType, type Campaign } from "@/lib/biz/grow";

interface Row extends Campaign { active?: boolean; createdAt?: string; }

const CROP_KEYS = Object.keys(CROPS) as CropType[];

export default function AdminGrowCampaignsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({ advertiser: "", link: "", crop: "hallabong" as CropType, growthDays: 5, reward: 120, slogan: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/admin/grow-campaigns");
    if (r.status === 401) { setMsg("⚠️ 어드민 로그인이 필요합니다 (/admin/login)"); setLoading(false); return; }
    const d = await r.json();
    setRows(d.campaigns ?? []); setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    setMsg("");
    const r = await fetch("/api/admin/grow-campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const d = await r.json();
    if (!r.ok) { setMsg(d.error || "등록 실패"); return; }
    setForm({ advertiser: "", link: "", crop: "hallabong", growthDays: 5, reward: 120, slogan: "" });
    setMsg("✓ 등록되었습니다");
    load();
  };

  const del = async (id?: string) => {
    if (!id || !confirm("삭제할까요?")) return;
    await fetch(`/api/admin/grow-campaigns?id=${id}`, { method: "DELETE" });
    load();
  };

  const toggle = async (id: string | undefined, active: boolean) => {
    if (!id) return;
    await fetch("/api/admin/grow-campaigns", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, active }) });
    load();
  };

  const input: React.CSSProperties = { width: "100%", border: "1px solid #ddd", borderRadius: 8, padding: "8px 10px", fontSize: 14, boxSizing: "border-box" };

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 20, fontFamily: "'Apple SD Gothic Neo',sans-serif" }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>🌱 키우기 광고 캠페인</h1>
      <p style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>광고주 의뢰 캠페인을 등록하면 유저 미니홈피의 &quot;기르기 시작&quot; 목록에 노출됩니다.</p>
      {msg && <div style={{ fontSize: 13, color: msg.startsWith("✓") ? "#2a8a3f" : "#c0392b", marginBottom: 12 }}>{msg}</div>}

      {/* 등록 폼 */}
      <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
          <div><label style={{ fontSize: 12, color: "#666" }}>상호(광고주)</label><input style={input} value={form.advertiser} onChange={(e) => setForm({ ...form, advertiser: e.target.value })} placeholder="성산 한라봉농장" /></div>
          <div><label style={{ fontSize: 12, color: "#666" }}>링크</label><input style={input} value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://..." /></div>
          <div><label style={{ fontSize: 12, color: "#666" }}>작물</label>
            <select style={input} value={form.crop} onChange={(e) => setForm({ ...form, crop: e.target.value as CropType })}>
              {CROP_KEYS.map((k) => <option key={k} value={k}>{CROPS[k].emoji} {CROPS[k].label}</option>)}
            </select>
          </div>
          <div><label style={{ fontSize: 12, color: "#666" }}>성장일수</label><input style={input} type="number" min={1} max={30} value={form.growthDays} onChange={(e) => setForm({ ...form, growthDays: Number(e.target.value) })} /></div>
          <div><label style={{ fontSize: 12, color: "#666" }}>완성보상(🐚보말)</label><input style={input} type="number" min={0} value={form.reward} onChange={(e) => setForm({ ...form, reward: Number(e.target.value) })} /></div>
          <div><label style={{ fontSize: 12, color: "#666" }}>슬로건</label><input style={input} value={form.slogan} onChange={(e) => setForm({ ...form, slogan: e.target.value })} placeholder="탐스러운 한라봉을 길러주세요!" /></div>
        </div>
        <button onClick={add} style={{ marginTop: 12, background: "#e8590c", color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>+ 캠페인 등록</button>
      </div>

      {/* 목록 */}
      {loading ? <div style={{ color: "#999" }}>불러오는 중...</div> : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr style={{ borderBottom: "2px solid #eee", textAlign: "left", color: "#888" }}>
            <th style={{ padding: 8 }}>작물</th><th style={{ padding: 8 }}>광고주</th><th style={{ padding: 8 }}>성장</th><th style={{ padding: 8 }}>보상</th><th style={{ padding: 8 }}>상태</th><th style={{ padding: 8 }}></th>
          </tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={{ padding: 8 }}>{CROPS[c.crop]?.emoji} {CROPS[c.crop]?.label}</td>
                <td style={{ padding: 8 }}>{c.advertiser}<div style={{ fontSize: 11, color: "#aaa" }}>{c.slogan}</div></td>
                <td style={{ padding: 8 }}>{c.growthDays}일</td>
                <td style={{ padding: 8 }}>🐚{c.reward}</td>
                <td style={{ padding: 8 }}>
                  <button onClick={() => toggle(c.id, !(c.active !== false))} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, border: "1px solid #ddd", background: c.active !== false ? "#e7f6ea" : "#f3f3f3", color: c.active !== false ? "#2a8a3f" : "#999", cursor: "pointer" }}>{c.active !== false ? "활성" : "비활성"}</button>
                </td>
                <td style={{ padding: 8 }}><button onClick={() => del(c.id)} style={{ fontSize: 11, color: "#c0392b", border: "none", background: "none", cursor: "pointer" }}>삭제</button></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} style={{ padding: 16, color: "#aaa", textAlign: "center" }}>등록된 캠페인이 없습니다 (현재 코드 시드 사용 중)</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  );
}
