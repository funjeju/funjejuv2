"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as LMap, LayerGroup, Marker as LMarker, LeafletMouseEvent } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MiniMiKind, RoomConcept } from "@/lib/biz/types";
import { useAuth } from "@/hooks/useAuth";
import { listMySpots } from "@/lib/my-spots";
import { HlsMiniPlayer } from "@/components/cctv/HlsMiniPlayer";
import { track } from "@/lib/analytics";
import { MINIMI, MINIMI_ORDER, ROOM_CONCEPTS, ROOM_ORDER } from "./minimi-config";

const CCTV_PROXY = process.env.NEXT_PUBLIC_WORKER_URL || process.env.NEXT_PUBLIC_PROXY_URL || "";

/**
 * 제주 미니홈피 지도 — OSM 위에 레이어: 미니홈피 깃발(열기구)·CCTV·도민맛집·내 마이스팟.
 * 상단 범례로 레이어 토글, 마커 클릭 → 모달(내용) → 더보기(원래 페이지). 깃발 꽂기 유지.
 */

interface Flag { id: string; name: string; lat: number; lng: number; minimi: MiniMiKind; concept: RoomConcept; level: number; message?: string; }
interface CctvPt { id: string; name: string; lat: number; lng: number; }
interface FoodPt { id: string; title: string; lat: number; lng: number; address: string; img: string; summary?: string; }
interface SpotPt { name: string; lat: number; lng: number; category?: string; address?: string; }

type Sel =
  | { kind: "flag"; title: string; sub: string; msg?: string; href: string; cta: string }
  | { kind: "cctv"; id: string; title: string; sub: string; href: string; cta: string }
  | { kind: "food"; title: string; sub: string; img?: string; summary?: string; href: string; cta: string }
  | { kind: "spot"; title: string; sub: string; href: string; cta: string };

const SPRITE_FALLBACK: Record<string, MiniMiKind> = { yuchae: "hallabong" };
const tierOf = (l: number) => (l <= 5 ? 0 : l <= 15 ? 1 : l <= 30 ? 2 : l <= 50 ? 3 : 4);
const TIER_COLORS = ["#5b9bf3", "#f47272", "#54bd73", "#f5b133", "#d96fd0"];

// 물방울(teardrop) 핀 — viewBox 24×36, 꼭짓점이 정확히 (12,36) = 바닥 중앙.
// k 배율로 크기 조절, 앵커는 항상 [width/2, height] 이라 줌해도 꼭짓점이 좌표에 고정.
function pinSvg(color: string, inner: string, k: number) {
  const w = +(24 * k).toFixed(1), h = +(36 * k).toFixed(1);
  return {
    html: `<svg width="${w}" height="${h}" viewBox="0 0 24 36" xmlns="http://www.w3.org/2000/svg" style="display:block;overflow:visible;filter:drop-shadow(0 3px 3px rgba(0,0,0,.32))">
      <path d="M12 0.8 C5.7 0.8 0.8 5.7 0.8 12 c0 8.4 9.4 19.6 11.2 22.6 c1.8 -3 11.2 -14.2 11.2 -22.6 C23.2 5.7 18.3 0.8 12 0.8 Z" fill="${color}" stroke="#ffffff" stroke-width="1.6"/>
      ${inner}
    </svg>`,
    anchor: [w / 2, h] as [number, number],
  };
}

// 미니홈피 핀 — 동그란 머리 안에 미니미 아바타 + 레벨 배지
function avatarPin(level: number, kind: MiniMiKind) {
  const tier = tierOf(level);
  const sprite = SPRITE_FALLBACK[kind] ?? kind;
  const id = "mp" + Math.random().toString(36).slice(2, 8);
  const inner = `
    <defs><clipPath id="${id}"><circle cx="12" cy="11.5" r="8.4"/></clipPath></defs>
    <circle cx="12" cy="11.5" r="8.4" fill="#ffffff"/>
    <image href="/minihompy/sprites/${sprite}-front.png" x="3" y="2.5" width="18" height="18" preserveAspectRatio="xMidYMid meet" clip-path="url(#${id})"/>
    <g><circle cx="19" cy="5" r="5" fill="${TIER_COLORS[tier]}" stroke="#fff" stroke-width="1.3"/>
    <text x="19" y="5" fill="#fff" font-size="6" font-weight="700" text-anchor="middle" dominant-baseline="central" font-family="sans-serif">${level}</text></g>`;
  return pinSvg(TIER_COLORS[tier], inner, 1.6);
}

// 이모지 핀 (CCTV·맛집·스팟) — 작은 핀 안에 이모지
function emojiPin(emoji: string, color: string) {
  const inner = `<circle cx="12" cy="11.5" r="8" fill="#ffffff"/>
    <text x="12" y="12" font-size="11" text-anchor="middle" dominant-baseline="central">${emoji}</text>`;
  return pinSvg(color, inner, 1.25);
}

const emojiIcon = (e: string, size = 24) => `<div style="font-size:${size}px;line-height:1;filter:drop-shadow(0 1px 1px rgba(0,0,0,.35));">${e}</div>`;
function esc(s: string) { return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!)); }

export function JejuMap({ cctv = [], food = [] }: { cctv?: CctvPt[]; food?: FoodPt[] }) {
  const { user, signInWithGoogle } = useAuth();
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LMap | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const tempRef = useRef<LMarker | null>(null);
  const meRef = useRef<LMarker | null>(null);
  const plantRef = useRef(false);

  const [flags, setFlags] = useState<Flag[]>([]);
  const [myspots, setMyspots] = useState<SpotPt[]>([]);
  const [show, setShow] = useState({ home: true, cctv: false, food: false, spot: false });
  const [sel, setSel] = useState<Sel | null>(null);

  // 깃발 꽂기
  const [plantMode, setPlantMode] = useState(false);
  const [picked, setPicked] = useState<[number, number] | null>(null);
  const [form, setForm] = useState<{ name: string; minimi: MiniMiKind; concept: RoomConcept; message: string }>({ name: "", minimi: "baram", concept: "oreum", message: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { plantRef.current = plantMode; }, [plantMode]);

  const dropTemp = useCallback((lat: number, lng: number) => {
    const L = LRef.current, map = mapRef.current; if (!L || !map) return;
    if (tempRef.current) tempRef.current.setLatLng([lat, lng]);
    else tempRef.current = L.marker([lat, lng], { icon: L.divIcon({ className: "", html: emojiIcon("📍", 30), iconSize: [30, 30], iconAnchor: [8, 28] }), zIndexOffset: 1000 }).addTo(map);
  }, []);

  // 지도 init
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !elRef.current || mapRef.current) return;
      LRef.current = L;
      const map = L.map(elRef.current, { center: [33.38, 126.53], zoom: 10, minZoom: 9, maxZoom: 18 });
      mapRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19 }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      map.on("click", (e: LeafletMouseEvent) => { if (!plantRef.current) return; setPicked([e.latlng.lat, e.latlng.lng]); dropTemp(e.latlng.lat, e.latlng.lng); });
      try { const d = await (await fetch("/api/minihome/flags")).json(); if (!cancelled) setFlags(d.flags ?? []); } catch { /* */ }
    })();
    return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [dropTemp]);

  // 내 마이스팟 로드 (스팟 레이어 켤 때)
  useEffect(() => {
    if (show.spot && user && myspots.length === 0) listMySpots(user.uid).then((s) => setMyspots(s.map((x) => ({ name: x.name, lat: x.lat, lng: x.lng, category: x.category, address: x.address })))).catch(() => {});
  }, [show.spot, user, myspots.length]);

  // 레이어 렌더
  useEffect(() => {
    const L = LRef.current, layer = layerRef.current; if (!L || !layer) return;
    layer.clearLayers();
    const mk = (lat: number, lng: number, pin: { html: string; anchor: [number, number] }, onClick: () => void, z = 0) =>
      L.marker([lat, lng], { icon: L.divIcon({ className: "", html: pin.html, iconSize: [pin.anchor[0] * 2, pin.anchor[1]], iconAnchor: pin.anchor }), zIndexOffset: z }).on("click", onClick).addTo(layer);
    const select = (s: Sel) => { track("map_marker", { kind: s.kind }); setSel(s); };

    if (show.home) flags.forEach((f) => mk(f.lat, f.lng, avatarPin(f.level, f.minimi), () => select({ kind: "flag", title: f.name, sub: `Lv.${f.level} · ${ROOM_CONCEPTS[f.concept].label}`, msg: f.message, href: `/minihome/u/${f.id}`, cta: "미니홈피 입장" }), 500));
    if (show.cctv) cctv.forEach((c) => mk(c.lat, c.lng, emojiPin("📷", "#3b82f6"), () => select({ kind: "cctv", id: c.id, title: c.name, sub: "실시간 CCTV", href: `/cctv/${c.id}`, cta: "전체 화면" })));
    if (show.food) food.forEach((f) => mk(f.lat, f.lng, emojiPin("🍴", "#ef4444"), () => select({ kind: "food", title: f.title, sub: f.address, img: f.img, summary: f.summary, href: `/food/${f.id}`, cta: "맛집 보기" })));
    if (show.spot) myspots.forEach((s) => mk(s.lat, s.lng, emojiPin("⭐", "#f59e0b"), () => select({ kind: "spot", title: s.name, sub: `${s.category ?? ""} ${s.address ?? ""}`.trim(), href: "/mypage", cta: "마이페이지에서 보기" })));
  }, [show, flags, cctv, food, myspots]);

  const toggle = (k: keyof typeof show) => setShow((s) => { if (!s[k]) track("map_layer_on", { layer: k }); return { ...s, [k]: !s[k] }; });

  const startPlant = () => { if (!user) { signInWithGoogle(); return; } setPlantMode(true); setErr(""); };
  const cancelPlant = () => { setPlantMode(false); setPicked(null); if (tempRef.current && mapRef.current) { tempRef.current.remove(); tempRef.current = null; } };
  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude, lng = pos.coords.longitude; const L = LRef.current, map = mapRef.current;
      if (L && map) { if (meRef.current) meRef.current.remove(); meRef.current = L.marker([lat, lng], { icon: L.divIcon({ className: "", html: emojiIcon("🧍", 22), iconSize: [22, 22], iconAnchor: [11, 20] }) }).addTo(map); map.flyTo([lat, lng], 14); }
      if (plantRef.current) { setPicked([lat, lng]); dropTemp(lat, lng); }
    }, () => alert("위치를 가져올 수 없어요."), { enableHighAccuracy: true, timeout: 8000 });
  };
  const saveFlag = async () => {
    if (!picked) { setErr("지도를 눌러 위치를 골라주세요"); return; }
    if (!form.name.trim()) { setErr("이름을 입력해주세요"); return; }
    if (!user) { signInWithGoogle(); return; }
    setSaving(true); setErr("");
    try {
      const tk = await user.getIdToken();
      const r = await fetch("/api/minihome/flags", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${tk}` }, body: JSON.stringify({ name: form.name, lat: picked[0], lng: picked[1], minimi: form.minimi, concept: form.concept, message: form.message }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || "꽂기 실패");
      setFlags((p) => [d.flag, ...p.filter((f) => f.id !== d.flag.id)]); track("flag_plant", { minimi: form.minimi, concept: form.concept }); cancelPlant(); setForm({ name: "", minimi: "baram", concept: "oreum", message: "" });
    } catch (e) { setErr(e instanceof Error ? e.message : "꽂기 실패"); } finally { setSaving(false); }
  };

  const LEG: { k: keyof typeof show; label: string }[] = [
    { k: "home", label: `🎈 미니홈피 ${flags.length}` }, { k: "cctv", label: "📷 CCTV" }, { k: "food", label: "🍴 도민맛집" }, { k: "spot", label: "⭐ 내 스팟" },
  ];

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", fontFamily: "'Dotum','Apple SD Gothic Neo',sans-serif" }}>
      <style>{`@keyframes mhbob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}`}</style>
      <div ref={elRef} style={{ position: "absolute", inset: 0, background: "#cfe6f0", cursor: plantMode ? "crosshair" : "" }} />

      {/* 상단 범례(레이어 토글) */}
      <div style={{ position: "absolute", top: 12, left: 12, right: 12, zIndex: 1000, display: "flex", gap: 6, flexWrap: "wrap" }}>
        {LEG.map(({ k, label }) => (
          <button key={k} onClick={() => toggle(k)} style={{ fontSize: 12, fontWeight: 700, border: "1px solid #cdd8e2", borderRadius: 999, padding: "6px 11px", cursor: "pointer", background: show[k] ? "#3f8fc4" : "rgba(255,255,255,.95)", color: show[k] ? "#fff" : "#5a6a7a", boxShadow: "0 1px 4px rgba(0,0,0,.15)" }}>{label}</button>
        ))}
        {plantMode && <span style={{ fontSize: 11, alignSelf: "center", background: "rgba(255,255,255,.95)", borderRadius: 8, padding: "5px 9px", color: "#3f8fc4" }}>지도를 눌러 깃발 위치 선택 ✨</span>}
      </div>

      {/* 깃발 꽂기 버튼 */}
      {!plantMode && (
        <button onClick={startPlant} style={{ position: "absolute", bottom: 22, left: "50%", transform: "translateX(-50%)", zIndex: 1000, background: "#3f8fc4", color: "#fff", border: "none", borderRadius: 999, padding: "11px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,.25)" }}>🚩 내 미니홈피 깃발 꽂기</button>
      )}

      {/* 마커 클릭 모달 */}
      {sel && (
        <div onClick={() => setSel(null)} style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, padding: 18, width: 320, maxWidth: "90vw", boxShadow: "0 8px 30px rgba(0,0,0,.3)" }}>
            {sel.kind === "cctv" && (
              <div style={{ marginBottom: 10 }}>
                <HlsMiniPlayer id={sel.id} name={sel.title} proxyUrl={CCTV_PROXY ? `${CCTV_PROXY}/cctv/${sel.id}` : null} forcePlay />
              </div>
            )}
            {sel.kind === "food" && sel.img && <div style={{ height: 140, borderRadius: 10, background: `center/cover no-repeat url(${sel.img})`, marginBottom: 10 }} />}
            <div style={{ fontSize: 16, fontWeight: 800, color: "#2b3a52" }}>{sel.title}</div>
            <div style={{ fontSize: 12, color: "#7a6e58", marginTop: 3 }}>{sel.sub}</div>
            {sel.kind === "food" && sel.summary && <div style={{ fontSize: 12, color: "#5a4a32", marginTop: 6, lineHeight: 1.5 }}>{sel.summary}…</div>}
            {sel.kind === "flag" && sel.msg && <div style={{ fontSize: 12, color: "#5a4a32", marginTop: 6, background: "#fffae0", borderRadius: 8, padding: "6px 9px" }}>“{sel.msg}”</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              {"href" in sel && (
                <a href={sel.href} onClick={() => track("map_outbound", { kind: sel.kind })} style={{ flex: 1, textAlign: "center", background: "#3f8fc4", color: "#fff", borderRadius: 8, padding: "9px 0", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>{sel.cta} →</a>
              )}
              <button onClick={() => setSel(null)} style={{ background: "#f0ece2", border: "none", borderRadius: 8, padding: "9px 14px", fontSize: 13, cursor: "pointer" }}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {/* 깃발 꽂기 폼 */}
      {plantMode && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 1000, background: "#fffdf6", borderTop: "1px solid #e3d9c2", padding: 14, boxShadow: "0 -2px 10px rgba(0,0,0,.12)" }}>
          <div style={{ maxWidth: 520, margin: "0 auto" }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>🚩 깃발 꽂기 {picked ? <span style={{ color: "#3f8fc4", fontSize: 11 }}>· 위치 선택됨</span> : <span style={{ color: "#c0392b", fontSize: 11 }}>· 지도를 눌러 위치 선택</span>}</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="미니홈피 이름" style={{ flex: 1, fontSize: 13, height: 34, border: "1px solid #cfe0f2", borderRadius: 7, padding: "0 9px" }} />
              <button onClick={useMyLocation} style={{ fontSize: 12, background: "#fff", border: "1px solid #3f8fc4", color: "#3f8fc4", borderRadius: 7, padding: "0 10px", cursor: "pointer", whiteSpace: "nowrap" }}>📍 내 위치</button>
            </div>
            <input value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} placeholder="한 줄 메시지 (선택)" style={{ width: "100%", boxSizing: "border-box", fontSize: 12, height: 32, border: "1px solid #cfe0f2", borderRadius: 7, padding: "0 9px", marginBottom: 8 }} />
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 6 }}>
              {MINIMI_ORDER.map((k) => (<button key={k} onClick={() => setForm((f) => ({ ...f, minimi: k }))} style={{ fontSize: 12, padding: "4px 9px", borderRadius: 6, cursor: "pointer", border: form.minimi === k ? "2px solid #ff7aa2" : "1px solid #e3d9c2", background: form.minimi === k ? "#ffeef4" : "#fff" }}>{MINIMI[k].emoji} {MINIMI[k].label}</button>))}
            </div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
              {ROOM_ORDER.map((c) => (<button key={c} onClick={() => setForm((f) => ({ ...f, concept: c }))} style={{ fontSize: 12, padding: "4px 9px", borderRadius: 6, cursor: "pointer", border: form.concept === c ? "2px solid #ff7aa2" : "1px solid #e3d9c2", background: form.concept === c ? "#ffeef4" : "#fff" }}>{ROOM_CONCEPTS[c].emoji} {ROOM_CONCEPTS[c].label}</button>))}
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
