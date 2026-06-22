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
 * 싸이월드 스프레드: 좌 MY PROFILE / 중앙 미니룸(2D 산책)+탭내용 / 우 메뉴(홈·꾸미기·키우기·채팅).
 */

interface Home { displayName: string; minimi: MiniMiKind; concept: RoomConcept; level: number; xp: number; bomal: number; ownedItems: string[]; background?: string; specialMinimi?: string; customBgUrl?: string; }
type Tab = "home" | "style" | "grow" | "chat";
const MENU: { id: Tab; ko: string; en: string }[] = [
  { id: "home", ko: "홈", en: "HOME" },
  { id: "style", ko: "꾸미기", en: "STYLE" },
  { id: "grow", ko: "키우기", en: "GROW" },
  { id: "chat", ko: "채팅", en: "CHAT" },
];

export function MyMiniHome() {
  const { user, loading, signInWithGoogle } = useAuth();
  const [home, setHome] = useState<Home | null>(null);
  const [minimi, setMinimi] = useState<MiniMiKind>("hallabong");
  const [concept, setConcept] = useState<RoomConcept>("oreum");
  const [background, setBackground] = useState<string>("");
  const [specialMinimi, setSpecialMinimi] = useState<string>("");
  const [save, setSave] = useState<"idle" | "saving" | "saved">("idle");
  const [tab, setTab] = useState<Tab>("home");

  const roomRef = useRef<HTMLDivElement>(null);
  const [hostX, setHostX] = useState(50);
  const [hostY, setHostY] = useState(84);
  const [walking, setWalking] = useState(false);
  const [facing, setFacing] = useState<"left" | "right">("right");
  const [bubble, setBubble] = useState<string | null>(null);
  const [speakOpen, setSpeakOpen] = useState(false);
  const [speakText, setSpeakText] = useState("");

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

  // 미니미 2D 이동 — 배경 어디든 클릭하면 그 지점으로
  const onRoomClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rr = roomRef.current?.getBoundingClientRect();
    if (!rr) return;
    const x = Math.max(6, Math.min(((e.clientX - rr.left) / rr.width) * 100, 94));
    const y = Math.max(34, Math.min(((e.clientY - rr.top) / rr.height) * 100, 95));
    setFacing(x > hostX ? "right" : "left");
    setHostX(x); setHostY(y); setWalking(true);
    window.setTimeout(() => setWalking(false), 1120);
  }, [hostX]);

  const speak = useCallback(() => {
    const v = speakText.trim(); if (!v) return;
    setBubble(v); window.setTimeout(() => setBubble(null), 2600); setSpeakText(""); setSpeakOpen(false);
    track("minihome_speak", { own: true });
  }, [speakText]);

  const persist = useCallback(async (next: { minimi?: MiniMiKind; concept?: RoomConcept; background?: string; specialMinimi?: string }) => {
    if (!user) return;
    setSave("saving");
    try {
      const t = await user.getIdToken();
      const r = await fetch("/api/minihome/me", { method: "PATCH", headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" }, body: JSON.stringify(next) });
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
  const bgImage = background === "bg-custom" ? (home?.customBgUrl || room.bgImage) : (background && SHOP_ITEMS.find((i) => i.id === background)?.asset) || room.bgImage;
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
    <div className="mh-page" style={{ background: room.pageBg, ["--accent" as string]: room.accent, ["--soft" as string]: room.accentSoft }}>
      <style>{`
        .mh-page{min-height:100vh;padding:18px;font-family:'Dotum','Apple SD Gothic Neo',sans-serif;color:#3a332a;transition:background .4s;}
        .mh-top{max-width:1100px;margin:0 auto 10px;display:flex;justify-content:space-between;align-items:center;color:#fff;font-size:13px;gap:10px;flex-wrap:wrap;}
        .mh-wrap{max-width:1100px;margin:0 auto;display:flex;gap:12px;align-items:flex-start;}
        .mh-profile{width:190px;flex:none;}
        .mh-book{flex:1;min-width:0;background:#fffdf6;border:1px solid #e3d9c2;border-radius:12px;padding:14px;}
        .mh-menu{width:88px;flex:none;display:flex;flex-direction:column;gap:6px;}
        .mh-card{background:#fffdf6;border:1px solid #e3d9c2;border-radius:10px;padding:10px;}
        .mh-card-h{font-size:11px;font-weight:700;color:var(--accent);letter-spacing:.5px;border-bottom:1px solid var(--soft);padding-bottom:4px;margin-bottom:6px;}
        .mh-tab{display:flex;flex-direction:column;align-items:center;gap:1px;background:var(--soft);border:1px solid var(--accent);border-radius:8px;padding:9px 4px;cursor:pointer;color:#5a4a32;white-space:nowrap;}
        .mh-tab.on{background:var(--accent);color:#fff;}
        .mh-tab b{font-size:12px;}.mh-tab span{font-size:8px;letter-spacing:.5px;opacity:.8;}
        .mh-title{font-family:'Brush Script MT','Snell Roundhand',cursive;font-size:26px;color:var(--accent);line-height:1;}
        .mh-row{display:flex;justify-content:space-between;font-size:11px;padding:2px 0;color:#6a5e48;}
        .mh-btn{font-size:12px;border-radius:7px;padding:5px 12px;cursor:pointer;}
        @media(max-width:820px){.mh-wrap{flex-direction:column;}.mh-profile,.mh-book,.mh-menu{width:100%;}.mh-menu{flex-direction:row;flex-wrap:wrap;}.mh-menu .mh-tab{flex:1 1 22%;flex-direction:row;gap:5px;}}
      `}</style>

      <div className="mh-top">
        <span style={{ fontWeight: 700 }}>🏠 {home?.displayName ?? "내"} 미니홈피</span>
        <span style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 12 }}>
          <span title={`XP ${home?.xp ?? 0}`}>Lv.{home?.level ?? 1}</span>
          <span style={{ width: 60, height: 7, background: "rgba(255,255,255,.35)", borderRadius: 4, overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: `${(home?.xp ?? 0) % 100}%`, background: "#fff4c2" }} /></span>
          <span>🐚 {(home?.bomal ?? 0).toLocaleString()}</span>
          <Link href="/minihome/shop" style={{ color: "#fff", textDecoration: "underline" }}>상점</Link>
          <Link href="/minihome/map" style={{ color: "#fff", textDecoration: "underline" }}>지도</Link>
        </span>
      </div>

      <div className="mh-wrap">

        {/* 좌: MY PROFILE */}
        <div className="mh-profile">
          <div className="mh-card">
            <div className="mh-card-h">MY PROFILE</div>
            <div style={{ border: "1px solid #e3d9c2", background: room.bgImage ? `center/cover no-repeat url(${room.bgImage})` : "#eef3e6", borderRadius: 8, height: 120, display: "flex", alignItems: "flex-end", justifyContent: "center", overflow: "hidden" }}>
              <MiniMi kind={minimi} scale={0.9} customSprite={customSprite} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6 }}>{home?.displayName ?? "여행자"} {MINIMI[minimi].emoji}</div>
            <div style={{ fontSize: 11, color: "#8a7a5a", marginTop: 2 }}>Lv.{home?.level ?? 1} 제주 여행자</div>
            <div style={{ display: "flex", gap: 6, marginTop: 8, fontSize: 11, textAlign: "center" }}>
              <div style={{ flex: 1, background: "#fff", border: "1px solid #e3d9c2", borderRadius: 5, padding: "5px 0" }}>보말<br /><b style={{ color: "#e0890a" }}>{(home?.bomal ?? 0).toLocaleString()}</b></div>
              <div style={{ flex: 1, background: "#fff", border: "1px solid #e3d9c2", borderRadius: 5, padding: "5px 0" }}>보유템<br /><b style={{ color: "var(--accent)" }}>{home?.ownedItems?.length ?? 0}</b></div>
            </div>
            <div className="mh-card-h" style={{ marginTop: 8 }}>MENU</div>
            {MENU.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ all: "unset", cursor: "pointer", display: "block", width: "100%" }}>
                <div className="mh-row" style={tab === t.id ? { color: "var(--accent)", fontWeight: 700 } : undefined}>▸ {t.ko}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 중앙: 미니룸(고정) + 탭 내용 */}
        <div className="mh-book">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10 }}>
            <div>
              <div className="mh-title">{home?.displayName ?? "My"} Minihome</div>
              <div style={{ fontSize: 9, letterSpacing: 2, color: "#b0a486" }}>WELCOME TO MY MINIHOME</div>
            </div>
            <button className="mh-btn" onClick={() => setSpeakOpen((s) => !s)} style={{ background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }}>💬 말하기</button>
          </div>

          {speakOpen && (
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <input value={speakText} onChange={(e) => setSpeakText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") speak(); }} autoFocus placeholder="미니미가 할 말...(말풍선)" style={{ flex: 1, fontSize: 12, height: 32, border: "1px solid var(--accent)", borderRadius: 7, padding: "0 8px", background: "#fff" }} />
              <button className="mh-btn" onClick={speak} style={{ background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }}>말하기</button>
            </div>
          )}

          {/* 미니룸 — 항상 상단 고정, 클릭하면 미니미가 그 지점으로(2D) */}
          <div ref={roomRef} onClick={onRoomClick} style={{ position: "relative", height: 320, border: "1px solid #d8cba8", borderRadius: 8, overflow: "hidden", cursor: "pointer", background: bgImage ? `center/cover no-repeat url(${bgImage}), ${room.bg}` : room.bg }}>
            <div style={{ position: "absolute", left: `${hostX}%`, top: `${hostY}%`, transform: `translate(-50%,-100%) ${walking ? "translateY(-4px)" : ""}`, transition: "left 1.1s linear, top 1.1s linear", zIndex: 3 }}>
              <MiniMi kind={minimi} name={home?.displayName ?? "나"} pose={walking ? "side" : "front"} flip={walking && facing === "right"} customSprite={customSprite} />
            </div>
            {bubble && <div style={{ position: "absolute", left: `${hostX}%`, top: `${hostY}%`, transform: "translate(-50%,-260%)", fontSize: 12, background: "#fffae0", border: "1px solid #e8d77a", borderRadius: 10, padding: "5px 9px", zIndex: 5, whiteSpace: "nowrap" }}>{bubble}</div>}
            <div style={{ position: "absolute", left: 8, bottom: 6, fontSize: 10, color: "#7a6a48", background: "rgba(255,255,255,.6)", borderRadius: 4, padding: "0 4px" }}>아무 곳이나 클릭→미니미 이동 🚶</div>
          </div>

          {/* 탭 내용 */}
          <div style={{ marginTop: 12 }}>
            {tab === "home" && (
              <div style={{ fontSize: 12, color: "#8a7a5a", textAlign: "center", padding: "10px 0" }}>
                미니룸 바닥을 눌러 산책하고, 메뉴에서 꾸미기·키우기·채팅을 즐겨보세요! 🎈
              </div>
            )}

            {tab === "style" && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span className="mh-card-h" style={{ border: 0, margin: 0 }}>🎨 꾸미기</span>
                  <span style={{ fontSize: 11, color: save === "saved" ? "#5b9e3f" : "#a89878" }}>{save === "saving" ? "저장 중..." : save === "saved" ? "✓ 저장됨" : "고르면 바로 저장돼요"}</span>
                </div>
                <div style={{ fontSize: 11, color: "#8a7a5a", margin: "6px 0 4px" }}>방 컨셉</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {ROOM_ORDER.map((c) => <button key={c} onClick={() => pickConcept(c)} style={chip(concept === c)}>{ROOM_CONCEPTS[c].emoji} {ROOM_CONCEPTS[c].label}</button>)}
                </div>
                <div style={{ fontSize: 11, color: "#8a7a5a", margin: "10px 0 4px" }}>미니미</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {MINIMI_ORDER.map((k) => <button key={k} onClick={() => pickMinimi(k)} style={chip(!specialMinimi && minimi === k)}>{MINIMI[k].emoji} {MINIMI[k].label}</button>)}
                  {ownedSpecialMinimi.map((i) => <button key={i.id} onClick={() => pickSpecialMinimi(i.id)} style={chip(specialMinimi === i.id)}>{i.emoji} {i.name}</button>)}
                </div>
                {(ownedBg.length > 0 || ownsCustomBg) && (
                  <>
                    <div style={{ fontSize: 11, color: "#8a7a5a", margin: "10px 0 4px" }}>보유 배경</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <button onClick={() => pickBackground("")} style={chip(!background)}>{room.emoji} 기본({room.label})</button>
                      {ownedBg.map((i) => <button key={i.id} onClick={() => pickBackground(i.id)} style={chip(background === i.id)}>{i.emoji} {i.name}</button>)}
                      {ownsCustomBg && home?.customBgUrl && <button onClick={() => pickBackground("bg-custom")} style={chip(background === "bg-custom")}>📷 내 사진</button>}
                      {ownsCustomBg && (
                        <label style={{ fontSize: 12, padding: "5px 10px", borderRadius: 6, cursor: "pointer", border: "1px dashed #cbb890", background: "#fbf6ea", color: "#8a7a5a" }}>
                          ⬆ 사진 {home?.customBgUrl ? "변경" : "업로드"}
                          <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadBg(f); e.target.value = ""; }} />
                        </label>
                      )}
                    </div>
                  </>
                )}
                {ownedSpecials.length > 0 && (
                  <>
                    <div style={{ fontSize: 11, color: "#8a7a5a", margin: "10px 0 4px" }}>보유한 특별템</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {ownedSpecials.map((i) => <span key={i.id} style={{ fontSize: 12, padding: "5px 9px", borderRadius: 6, border: "1px dashed #cbb890", background: "#fbf6ea", color: "#8a7a5a" }}>{i.emoji} {i.name} <b style={{ color: "#c08a2a" }}>적용 준비중</b></span>)}
                    </div>
                  </>
                )}
                <div style={{ fontSize: 10, color: "#b0a486", marginTop: 10 }}>특별 미니미·배경은 <Link href="/minihome/shop" style={{ color: room.accent }}>상점</Link>에서 보말로 구매하세요.</div>
              </div>
            )}

            {tab === "grow" && <GrowPanel accent={room.accent} onProgress={(p) => setHome((h) => (h ? { ...h, xp: p.xp, level: p.level, bomal: p.bomal } : h))} />}
            {tab === "chat" && user && <ChatRoom ownerUid={user.uid} accent={room.accent} />}
          </div>
        </div>

        {/* 우: 메뉴 탭 */}
        <div className="mh-menu">
          {MENU.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`mh-tab${tab === t.id ? " on" : ""}`}><b>{t.ko}</b><span>{t.en}</span></button>
          ))}
        </div>
      </div>
    </div>
  );
}

function chip(active: boolean): React.CSSProperties {
  return { fontSize: 12, padding: "5px 10px", borderRadius: 6, cursor: "pointer", border: active ? "2px solid #ff7aa2" : "1px solid #e3d9c2", background: active ? "#ffeef4" : "#fff", color: "#5a4a32" };
}
