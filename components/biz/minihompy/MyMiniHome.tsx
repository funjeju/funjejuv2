"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import type { MiniMiKind, RoomConcept } from "@/lib/biz/types";
import { MiniMi } from "./MiniMi";
import { MINIMI, MINIMI_ORDER, ROOM_CONCEPTS, ROOM_ORDER } from "./minimi-config";
import { SHOP_ITEMS } from "./shop-items";
import { track } from "@/lib/analytics";
import { GrowPanel } from "./GrowPanel";
import { ChatRoom } from "./ChatRoom";

/**
 * 내 계정 미니홈피 — /minihome/me. minihomes/{uid} 기반.
 * 장착(미니미·방컨셉)을 고르면 PATCH /api/minihome/me 로 내 계정에 저장.
 * 기본 6미니미·3컨셉은 무료. 상점 특별템(보유)은 적용칸 표시(에셋은 후속).
 */

interface Home { displayName: string; minimi: MiniMiKind; concept: RoomConcept; level: number; xp: number; bomal: number; ownedItems: string[]; background?: string; specialMinimi?: string; customBgUrl?: string; }

export function MyMiniHome() {
  const { user, loading, signInWithGoogle } = useAuth();
  const [home, setHome] = useState<Home | null>(null);
  const [minimi, setMinimi] = useState<MiniMiKind>("hallabong");
  const [concept, setConcept] = useState<RoomConcept>("oreum");
  const [background, setBackground] = useState<string>("");
  const [specialMinimi, setSpecialMinimi] = useState<string>("");
  const [save, setSave] = useState<"idle" | "saving" | "saved">("idle");

  const roomRef = useRef<HTMLDivElement>(null);
  const [hostLeft, setHostLeft] = useState(46);
  const [walking, setWalking] = useState(false);
  const [facing, setFacing] = useState<"left" | "right">("right");

  useEffect(() => {
    if (!user) { setHome(null); return; }
    (async () => {
      try {
        const t = await user.getIdToken();
        const r = await fetch("/api/minihome/me", { headers: { Authorization: `Bearer ${t}` } });
        const d = await r.json();
        if (r.ok) { setHome(d.home); setMinimi(d.home.minimi); setConcept(d.home.concept); setBackground(d.home.background ?? ""); setSpecialMinimi(d.home.specialMinimi ?? ""); }
      } catch { /* ignore */ }
    })();
  }, [user]);

  const onRoomClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rr = roomRef.current?.getBoundingClientRect();
    if (!rr) return;
    const pct = Math.max(2, Math.min(((e.clientX - rr.left) / rr.width) * 100 - 5, 88));
    setFacing(pct > hostLeft ? "right" : "left");
    setHostLeft(pct);
    setWalking(true);
    window.setTimeout(() => setWalking(false), 1120);
  }, [hostLeft]);

  const persist = useCallback(async (next: { minimi?: MiniMiKind; concept?: RoomConcept; background?: string; specialMinimi?: string }) => {
    if (!user) return;
    setSave("saving");
    try {
      const t = await user.getIdToken();
      const r = await fetch("/api/minihome/me", {
        method: "PATCH", headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!r.ok) throw new Error();
      const d = await r.json();
      setHome(d.home);
      track("minihome_equip", next as Record<string, string | undefined>);
      setSave("saved"); window.setTimeout(() => setSave("idle"), 1600);
    } catch { setSave("idle"); }
  }, [user]);

  const pickMinimi = (k: MiniMiKind) => { setMinimi(k); setSpecialMinimi(""); persist({ minimi: k, concept, background, specialMinimi: "" }); };
  const pickConcept = (c: RoomConcept) => { setConcept(c); persist({ minimi, concept: c, background, specialMinimi }); };
  const pickBackground = (bg: string) => { setBackground(bg); persist({ minimi, concept, background: bg, specialMinimi }); };
  const pickSpecialMinimi = (id: string) => { setSpecialMinimi(id); persist({ minimi, concept, background, specialMinimi: id }); };

  const uploadBg = useCallback(async (file: File) => {
    if (!user || !file) return;
    setSave("saving");
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const max = 1280; const scale = Math.min(1, max / Math.max(img.width, img.height));
            const c = document.createElement("canvas");
            c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
            c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
            resolve(c.toDataURL("image/jpeg", 0.85));
          };
          img.onerror = reject; img.src = reader.result as string;
        };
        reader.onerror = reject; reader.readAsDataURL(file);
      });
      const t = await user.getIdToken();
      const r = await fetch("/api/minihome/me/upload-bg", { method: "POST", headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" }, body: JSON.stringify({ imageBase64: dataUrl }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setHome((h) => (h ? { ...h, customBgUrl: d.url, background: "bg-custom" } : h));
      setBackground("bg-custom");
      setSave("saved"); window.setTimeout(() => setSave("idle"), 1600);
    } catch { setSave("idle"); }
  }, [user]);

  const room = ROOM_CONCEPTS[concept];
  const ownedBg = SHOP_ITEMS.filter((i) => i.category === "background" && i.asset && home?.ownedItems?.includes(i.id));
  const ownedSpecialMinimi = SHOP_ITEMS.filter((i) => i.category === "minimi" && i.asset && home?.ownedItems?.includes(i.id));
  const ownsCustomBg = home?.ownedItems?.includes("bg-custom");
  const bgImage = background === "bg-custom"
    ? (home?.customBgUrl || room.bgImage)
    : (background && SHOP_ITEMS.find((i) => i.id === background)?.asset) || room.bgImage;
  const customSprite = specialMinimi ? SHOP_ITEMS.find((i) => i.id === specialMinimi)?.asset : undefined;
  const ownedSpecials = SHOP_ITEMS.filter((i) => (i.category === "minimi" || i.category === "background") && !i.asset && home?.ownedItems?.includes(i.id));

  if (!loading && !user) {
    return (
      <div style={{ minHeight: "100vh", background: "#9ec46f", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Dotum',sans-serif" }}>
        <div style={{ background: "#fffdf6", border: "1px solid #e3d9c2", borderRadius: 16, padding: 28, textAlign: "center", maxWidth: 360 }}>
          <div style={{ fontSize: 36 }}>🏠</div>
          <div style={{ fontSize: 15, fontWeight: 700, margin: "8px 0" }}>내 미니홈피</div>
          <div style={{ fontSize: 13, color: "#7a6e58", marginBottom: 14 }}>로그인하면 나만의 미니홈피가 생기고<br />🐚 보말 500개를 드려요!</div>
          <button onClick={signInWithGoogle} style={{ background: "#5b9e3f", color: "#fff", border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>구글로 로그인</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: room.pageBg, transition: "background .4s", padding: 16, fontFamily: "'Dotum','Apple SD Gothic Neo',sans-serif", color: "#3a332a" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: room.accent, color: "#fff", padding: "8px 14px", borderRadius: "10px 10px 0 0", fontSize: 14 }}>
          <span style={{ fontWeight: 700 }}>🏠 {home?.displayName ?? "내"} 미니홈피</span>
          <span style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 12 }}>
            <span title={`XP ${(home?.xp ?? 0)}`}>Lv.{home?.level ?? 1}</span>
            <span style={{ width: 60, height: 7, background: "rgba(255,255,255,.35)", borderRadius: 4, overflow: "hidden" }}>
              <span style={{ display: "block", height: "100%", width: `${((home?.xp ?? 0) % 100)}%`, background: "#fff4c2" }} />
            </span>
            <span>🐚 {(home?.bomal ?? 0).toLocaleString()}</span>
            <Link href="/minihome/shop" style={{ color: "#fff", textDecoration: "underline" }}>상점</Link>
            <Link href="/minihome/map" style={{ color: "#fff", textDecoration: "underline" }}>지도</Link>
          </span>
        </div>

        <div style={{ background: "#fffdf6", border: "1px solid #e3d9c2", borderTop: 0, borderRadius: "0 0 12px 12px", padding: 14 }}>
          {/* 씬 */}
          <div ref={roomRef} onClick={onRoomClick} style={{ position: "relative", height: 300, border: "1px solid #d8cba8", borderRadius: 8, overflow: "hidden", cursor: "pointer", background: bgImage ? `center/cover no-repeat url(${bgImage}), ${room.bg}` : room.bg }}>
            <div style={{ position: "absolute", bottom: 14, left: `${hostLeft}%`, transition: "left 1.2s linear", transform: walking ? "translateY(-4px)" : "none" }}>
              <MiniMi kind={minimi} name={home?.displayName ?? "나"} pose={walking ? "side" : "front"} flip={walking && facing === "right"} customSprite={customSprite} />
            </div>
            <div style={{ position: "absolute", left: 8, bottom: 6, fontSize: 10, color: "#7a6a48", background: "rgba(255,255,255,.6)", borderRadius: 4, padding: "0 4px" }}>바닥을 클릭해 산책 🚶</div>
          </div>

          {/* 장착(꾸미기) */}
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: room.accent }}>🎨 꾸미기</span>
              <span style={{ fontSize: 11, color: save === "saved" ? "#5b9e3f" : "#a89878" }}>{save === "saving" ? "저장 중..." : save === "saved" ? "✓ 내 계정에 저장됨" : "고르면 바로 저장돼요"}</span>
            </div>

            <div style={{ fontSize: 11, color: "#8a7a5a", margin: "6px 0 4px" }}>방 컨셉</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {ROOM_ORDER.map((c) => (
                <button key={c} onClick={() => pickConcept(c)} style={chip(concept === c)}>{ROOM_CONCEPTS[c].emoji} {ROOM_CONCEPTS[c].label}</button>
              ))}
            </div>

            <div style={{ fontSize: 11, color: "#8a7a5a", margin: "10px 0 4px" }}>미니미</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {MINIMI_ORDER.map((k) => (
                <button key={k} onClick={() => pickMinimi(k)} style={chip(!specialMinimi && minimi === k)}>{MINIMI[k].emoji} {MINIMI[k].label}</button>
              ))}
              {ownedSpecialMinimi.map((i) => (
                <button key={i.id} onClick={() => pickSpecialMinimi(i.id)} style={chip(specialMinimi === i.id)}>{i.emoji} {i.name}</button>
              ))}
            </div>

            {/* 보유 배경 (구매한 커스텀 배경 장착 + 내 사진 업로드) */}
            {(ownedBg.length > 0 || ownsCustomBg) && (
              <>
                <div style={{ fontSize: 11, color: "#8a7a5a", margin: "10px 0 4px" }}>보유 배경</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <button onClick={() => pickBackground("")} style={chip(!background)}>{room.emoji} 기본({room.label})</button>
                  {ownedBg.map((i) => (
                    <button key={i.id} onClick={() => pickBackground(i.id)} style={chip(background === i.id)}>{i.emoji} {i.name}</button>
                  ))}
                  {ownsCustomBg && home?.customBgUrl && (
                    <button onClick={() => pickBackground("bg-custom")} style={chip(background === "bg-custom")}>📷 내 사진</button>
                  )}
                  {ownsCustomBg && (
                    <label style={{ fontSize: 12, padding: "5px 10px", borderRadius: 6, cursor: "pointer", border: "1px dashed #cbb890", background: "#fbf6ea", color: "#8a7a5a" }}>
                      ⬆ 사진 {home?.customBgUrl ? "변경" : "업로드"}
                      <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadBg(f); e.target.value = ""; }} />
                    </label>
                  )}
                </div>
              </>
            )}

            {/* 보유한 상점 특별템 (적용칸 — 에셋 후속) */}
            {ownedSpecials.length > 0 && (
              <>
                <div style={{ fontSize: 11, color: "#8a7a5a", margin: "10px 0 4px" }}>보유한 특별템</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {ownedSpecials.map((i) => (
                    <span key={i.id} title="적용 준비중 (에셋 추가 예정)" style={{ fontSize: 12, padding: "5px 9px", borderRadius: 6, border: "1px dashed #cbb890", background: "#fbf6ea", color: "#8a7a5a" }}>{i.emoji} {i.name} <b style={{ color: "#c08a2a" }}>적용 준비중</b></span>
                  ))}
                </div>
              </>
            )}
            <div style={{ fontSize: 10, color: "#b0a486", marginTop: 10 }}>특별 미니미·커스텀 배경은 <Link href="/minihome/shop" style={{ color: room.accent }}>상점</Link>에서 보말로 구매하세요.</div>
          </div>

          {/* 키우기 광고 */}
          <GrowPanel accent={room.accent} onProgress={(p) => setHome((h) => (h ? { ...h, xp: p.xp, level: p.level, bomal: p.bomal } : h))} />
          {user && <ChatRoom ownerUid={user.uid} accent={room.accent} />}
        </div>
      </div>
    </div>
  );
}

function chip(active: boolean): React.CSSProperties {
  return { fontSize: 12, padding: "5px 10px", borderRadius: 6, cursor: "pointer", border: active ? "2px solid #ff7aa2" : "1px solid #e3d9c2", background: active ? "#ffeef4" : "#fff", color: "#5a4a32" };
}
