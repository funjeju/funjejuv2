"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as LMap, LayerGroup, Marker as LMarker, LeafletMouseEvent } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MiniMiKind, RoomConcept } from "@/lib/biz/types";
import { useAuth } from "@/hooks/useAuth";
import { MINIMI, MINIMI_ORDER, ROOM_CONCEPTS, ROOM_ORDER } from "./minimi-config";

/**
 * 제주 미니홈피 지도 — OSM(Leaflet) 위에 "열기구" 깃발들.
 * 깃발 꽂기: 지도 클릭(or GPS)으로 위치 선택 → 이름·미니미·컨셉 입력 → /api/minihome/flags 저장.
 * 깃발 클릭 → 이름·레벨·메시지 팝업(+입장 링크).
 */

interface Flag {
  id: string; name: string; lat: number; lng: number;
  minimi: MiniMiKind; concept: RoomConcept; level: number; message?: string; link?: string;
}

const SPRITE_FALLBACK: Record<string, MiniMiKind> = { yuchae: "hallabong" };

function tierOf(level: number) {
  return level <= 5 ? 0 : level <= 15 ? 1 : level <= 30 ? 2 : level <= 50 ? 3 : 4;
}

function balloonHtml(level: number, kind: MiniMiKind) {
  const tier = tierOf(level);
  const colors = ["#8fc0ff", "#ff9f9f", "#9fd6a9", "#ffd66b", "#f3b3e0"];
  const deco = ["", "🚩", "🎏", "🌿", "✨"][tier];
  const sprite = SPRITE_FALLBACK[kind] ?? kind;
  const env = tier >= 2 ? `repeating-linear-gradient(90deg, ${colors[tier]} 0 8px, #ffffff 8px 16px)` : colors[tier];
  return `
    <div style="position:relative;width:64px;height:92px;filter:drop-shadow(0 2px 2px rgba(0,0,0,.25));">
      <div style="position:absolute;top:0;left:13px;width:38px;height:44px;background:${env};border-radius:50% 50% 46% 46%;border:2px solid rgba(0,0,0,.12);"></div>
      ${deco ? `<div style="position:absolute;top:-6px;left:40px;font-size:15px;">${deco}</div>` : ""}
      <div style="position:absolute;top:43px;left:24px;width:2px;height:14px;background:#b98a4a;transform:rotate(12deg);"></div>
      <div style="position:absolute;top:43px;left:39px;width:2px;height:14px;background:#b98a4a;transform:rotate(-12deg);"></div>
      <div style="position:absolute;top:56px;left:20px;width:26px;height:15px;background:#caa06a;border-radius:3px;border:1px solid #a9824f;z-index:1;"></div>
      <img src="/minihompy/sprites/${sprite}-front.png" alt="" style="position:absolute;top:40px;left:22px;width:22px;height:auto;z-index:2;" />
    </div>`;
}

const pinHtml = `<div style="font-size:30px;line-height:1;filter:drop-shadow(0 2px 2px rgba(0,0,0,.35));">📍</div>`;
const meHtml = `<div style="font-size:22px;line-height:1;filter:drop-shadow(0 1px 1px rgba(0,0,0,.3));">🧍</div>`;

function esc(s: string) { return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!)); }

export function JejuMap() {
  const { user, signInWithGoogle } = useAuth();
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LMap | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const flagLayerRef = useRef<LayerGroup | null>(null);
  const tempRef = useRef<LMarker | null>(null);
  const meRef = useRef<LMarker | null>(null);
  const plantRef = useRef(false);

  const [flags, setFlags] = useState<Flag[]>([]);
  const [plantMode, setPlantMode] = useState(false);
  const [picked, setPicked] = useState<[number, number] | null>(null);
  const [form, setForm] = useState<{ name: string; minimi: MiniMiKind; concept: RoomConcept; message: string }>({ name: "", minimi: "baram", concept: "oreum", message: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { plantRef.current = plantMode; }, [plantMode]);

  const dropTemp = useCallback((lat: number, lng: number) => {
    const L = LRef.current, map = mapRef.current;
    if (!L || !map) return;
    if (tempRef.current) tempRef.current.setLatLng([lat, lng]);
    else tempRef.current = L.marker([lat, lng], { icon: L.divIcon({ className: "", html: pinHtml, iconSize: [30, 30], iconAnchor: [8, 28] }), zIndexOffset: 1000 }).addTo(map);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !elRef.current || mapRef.current) return;
      LRef.current = L;
      const map = L.map(elRef.current, { center: [33.38, 126.53], zoom: 10, minZoom: 9, maxZoom: 18 });
      mapRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19,
      }).addTo(map);
      flagLayerRef.current = L.layerGroup().addTo(map);

      map.on("click", (e: LeafletMouseEvent) => {
        if (!plantRef.current) return;
        setPicked([e.latlng.lat, e.latlng.lng]);
        dropTemp(e.latlng.lat, e.latlng.lng);
      });

      try {
        const r = await fetch("/api/minihome/flags");
        const d = await r.json();
        if (!cancelled) setFlags(d.flags ?? []);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [dropTemp]);

  // 깃발 렌더
  useEffect(() => {
    const L = LRef.current, layer = flagLayerRef.current;
    if (!L || !layer) return;
    layer.clearLayers();
    for (const f of flags) {
      const mk = L.marker([f.lat, f.lng], { icon: L.divIcon({ className: "", html: balloonHtml(f.level, f.minimi), iconSize: [64, 92], iconAnchor: [32, 90], popupAnchor: [0, -80] }) });
      const link = f.link ? `<br><a href="${esc(f.link)}" style="color:#3f8fc4">→ 입장</a>` : "";
      const msg = f.message ? `<br>${esc(f.message)}` : "";
      mk.bindPopup(`<b>${esc(f.name)}</b> <span style="color:#888">Lv.${f.level}</span><br>${ROOM_CONCEPTS[f.concept].label} · ${MINIMI[f.minimi].label}${msg}${link}`);
      mk.addTo(layer);
    }
  }, [flags]);

  const startPlant = () => {
    if (!user) { signInWithGoogle(); return; }
    setPlantMode(true); setErr("");
  };
  const cancelPlant = () => {
    setPlantMode(false); setPicked(null);
    if (tempRef.current && mapRef.current) { tempRef.current.remove(); tempRef.current = null; }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude, lng = pos.coords.longitude;
      const L = LRef.current, map = mapRef.current;
      if (L && map) {
        if (meRef.current) meRef.current.remove();
        meRef.current = L.marker([lat, lng], { icon: L.divIcon({ className: "", html: meHtml, iconSize: [22, 22], iconAnchor: [11, 20] }) }).addTo(map);
        map.flyTo([lat, lng], 14);
      }
      if (plantRef.current) { setPicked([lat, lng]); dropTemp(lat, lng); }
    }, () => alert("위치를 가져올 수 없어요. 권한을 확인해주세요."), { enableHighAccuracy: true, timeout: 8000 });
  };

  const saveFlag = async () => {
    if (!picked) { setErr("지도를 눌러 위치를 먼저 골라주세요"); return; }
    if (!form.name.trim()) { setErr("이름을 입력해주세요"); return; }
    if (!user) { signInWithGoogle(); return; }
    setSaving(true); setErr("");
    try {
      const tk = await user.getIdToken();
      const r = await fetch("/api/minihome/flags", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${tk}` },
        body: JSON.stringify({ name: form.name, lat: picked[0], lng: picked[1], minimi: form.minimi, concept: form.concept, message: form.message }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "꽂기 실패");
      setFlags((p) => [d.flag, ...p.filter((f) => f.id !== d.flag.id)]);
      cancelPlant();
      setForm({ name: "", minimi: "baram", concept: "oreum", message: "" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "꽂기 실패");
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", fontFamily: "'Dotum','Apple SD Gothic Neo',sans-serif" }}>
      <div ref={elRef} style={{ position: "absolute", inset: 0, background: "#cfe6f0", cursor: plantMode ? "crosshair" : "" }} />

      {/* 상단 안내 */}
      <div style={{ position: "absolute", top: 12, left: 12, zIndex: 1000, background: "rgba(255,255,255,.95)", border: "1px solid #cdd8e2", borderRadius: 10, padding: "8px 12px", maxWidth: 250 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#3f6fa0" }}>🎈 제주 미니홈피 {flags.length}개</div>
        <div style={{ fontSize: 10, color: "#8aa", marginTop: 2 }}>{plantMode ? "지도를 눌러 깃발 위치를 골라요 ✨" : "열기구를 눌러 미니홈피를 구경하세요"}</div>
      </div>

      {/* 깃발 꽂기 버튼 */}
      {!plantMode && (
        <button onClick={startPlant} style={{ position: "absolute", bottom: 22, left: "50%", transform: "translateX(-50%)", zIndex: 1000, background: "#3f8fc4", color: "#fff", border: "none", borderRadius: 999, padding: "11px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,.25)" }}>
          🚩 내 미니홈피 깃발 꽂기
        </button>
      )}

      {/* 꽂기 폼 */}
      {plantMode && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 1000, background: "#fffdf6", borderTop: "1px solid #e3d9c2", padding: 14, boxShadow: "0 -2px 10px rgba(0,0,0,.12)" }}>
          <div style={{ maxWidth: 520, margin: "0 auto" }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
              🚩 깃발 꽂기 {picked ? <span style={{ color: "#3f8fc4", fontSize: 11 }}>· 위치 선택됨 ({picked[0].toFixed(3)}, {picked[1].toFixed(3)})</span> : <span style={{ color: "#c0392b", fontSize: 11 }}>· 지도를 눌러 위치 선택</span>}
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="미니홈피 이름" style={{ flex: 1, fontSize: 13, height: 34, border: "1px solid #cfe0f2", borderRadius: 7, padding: "0 9px" }} />
              <button onClick={useMyLocation} style={{ fontSize: 12, background: "#fff", border: "1px solid #3f8fc4", color: "#3f8fc4", borderRadius: 7, padding: "0 10px", cursor: "pointer", whiteSpace: "nowrap" }}>📍 내 위치</button>
            </div>
            <input value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} placeholder="한 줄 메시지 (선택)" style={{ width: "100%", boxSizing: "border-box", fontSize: 12, height: 32, border: "1px solid #cfe0f2", borderRadius: 7, padding: "0 9px", marginBottom: 8 }} />
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 6 }}>
              {MINIMI_ORDER.map((k) => (
                <button key={k} onClick={() => setForm((f) => ({ ...f, minimi: k }))} style={{ fontSize: 12, padding: "4px 9px", borderRadius: 6, cursor: "pointer", border: form.minimi === k ? "2px solid #ff7aa2" : "1px solid #e3d9c2", background: form.minimi === k ? "#ffeef4" : "#fff" }}>{MINIMI[k].emoji} {MINIMI[k].label}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
              {ROOM_ORDER.map((c) => (
                <button key={c} onClick={() => setForm((f) => ({ ...f, concept: c }))} style={{ fontSize: 12, padding: "4px 9px", borderRadius: 6, cursor: "pointer", border: form.concept === c ? "2px solid #ff7aa2" : "1px solid #e3d9c2", background: form.concept === c ? "#ffeef4" : "#fff" }}>{ROOM_CONCEPTS[c].emoji} {ROOM_CONCEPTS[c].label}</button>
              ))}
            </div>
            {err && <div style={{ fontSize: 11, color: "#c0392b", marginBottom: 6 }}>{err}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveFlag} disabled={saving} style={{ flex: 1, background: "#3f8fc4", color: "#fff", border: "none", borderRadius: 8, padding: "10px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{saving ? "꽂는 중..." : "🚩 여기에 꽂기"}</button>
              <button onClick={cancelPlant} style={{ background: "#fff", border: "1px solid #ccc", borderRadius: 8, padding: "10px 16px", fontSize: 13, cursor: "pointer" }}>취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
