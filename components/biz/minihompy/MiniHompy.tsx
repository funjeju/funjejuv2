"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { SiteSchema, MiniMiKind, RoomConcept } from "@/lib/biz/types";
import { MiniMi } from "./MiniMi";
import { MINIMI, MINIMI_ORDER, ROOM_CONCEPTS, ROOM_ORDER } from "./minimi-config";

/**
 * 싸이월드 미니홈피st — /biz/[slug]/home.
 * 스프레드(다이어리북) 레이아웃: 좌 프로필 / 중앙 미니홈(씬+업뎃뉴스) / 메뉴탭 / 우 패널.
 * 데스크톱=가로 스프레드, 모바일=블록 세로 스택(미디어쿼리).
 *
 * Phase 1: 6미니미 + 3컨셉 일러스트 + 걷기 + 말하기(말풍선) + 꾸미기(로컬).
 * 다음: 영속화 → 일반유저 확대/과금(에셋·배경·미니미) → 성장 → GPS쿠폰. 실시간=CF DO.
 */

interface GuestPost { name: string; text: string; createdAt?: string; }
const SEED_POSTS: GuestPost[] = [
  { name: "하르방", text: "오름뷰 미쳤다 또 갈게요!" },
  { name: "소라", text: "잘보고가요 일촌해요~" },
];

const MENU = [
  ["다이어리", "DIARY"], ["사진첩", "PHOTO"], ["방명록", "BOARD"],
  ["스크랩", "SCRAP"], ["방문자", "VISITOR"], ["BGM", "MUSIC"],
];

// 컨셉별 우측 위젯 (오름=무드 / 귤농장=수확량 / 해수욕장=날씨)
function ConceptWidget({ concept }: { concept: RoomConcept }) {
  if (concept === "tangerine") {
    return (
      <div className="mh-card">
        <div className="mh-card-h">MY FARM</div>
        <div style={{ textAlign: "center", padding: "6px 0" }}>
          <div style={{ fontSize: 11, color: "#8a7a5a" }}>오늘의 수확량</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#e0890a" }}>🍊 12개</div>
        </div>
      </div>
    );
  }
  if (concept === "beach") {
    return (
      <div className="mh-card">
        <div className="mh-card-h">BEACH WEATHER</div>
        <div style={{ textAlign: "center", padding: "6px 0" }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#3f8fc4" }}>☀️ 28°C</div>
          <div style={{ fontSize: 11, color: "#8a7a5a" }}>맑음</div>
        </div>
      </div>
    );
  }
  return (
    <div className="mh-card">
      <div className="mh-card-h">TODAY MOOD</div>
      <div style={{ textAlign: "center", padding: "6px 0" }}>
        <div style={{ fontSize: 12, color: "#6a8a4a" }}>따뜻한 바람이 불어와요</div>
        <div style={{ fontSize: 16 }}>🌼🌿🌼🌿🌼</div>
      </div>
    </div>
  );
}

export function MiniHompy({ site, initialPosts }: { site: SiteSchema; initialPosts?: GuestPost[] }) {
  const m = site.merchantInfo;
  const photo = site.contentAssets.heroImage || site.contentAssets.logoImage || "";
  const status = m.description?.slice(0, 30) || "오늘도 즐거운 하루 :)";

  const [minimi, setMinimi] = useState<MiniMiKind>(site.miniHompy?.minimi ?? "hallabong");
  const [concept, setConcept] = useState<RoomConcept>(site.miniHompy?.roomConcept ?? "oreum");
  const [decorate, setDecorate] = useState(false);
  const room = ROOM_CONCEPTS[concept];

  const roomRef = useRef<HTMLDivElement>(null);
  const [hostLeftPct, setHostLeftPct] = useState(46);
  const [hostBob, setHostBob] = useState(false);
  const [hostFacing, setHostFacing] = useState<"left" | "right">("right");
  const [guestVisible, setGuestVisible] = useState(false);
  const [guestWalking, setGuestWalking] = useState(true);
  const [guestLeftPct, setGuestLeftPct] = useState(-12);
  const [bubble, setBubble] = useState<{ text: string; leftPx: number; color: string } | null>(null);
  const [today, setToday] = useState(1234);
  const [posts, setPosts] = useState<GuestPost[]>(initialPosts && initialPosts.length ? initialPosts : SEED_POSTS);
  const [input, setInput] = useState("");
  const [speakOpen, setSpeakOpen] = useState(false);
  const [speakText, setSpeakText] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  const triggerBob = useCallback((setter: (b: boolean) => void) => {
    setter(true);
    window.setTimeout(() => setter(false), 1120);
  }, []);

  const say = useCallback((text: string, fromPct: number, color: string) => {
    const rr = roomRef.current?.getBoundingClientRect();
    const width = rr?.width ?? 400;
    const leftPx = Math.min((fromPct / 100) * width, width - 170);
    setBubble({ text, leftPx: Math.max(6, leftPx), color });
    window.setTimeout(() => setBubble(null), 2600);
  }, []);

  const onRoomClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rr = roomRef.current?.getBoundingClientRect();
      if (!rr) return;
      const pct = Math.max(2, Math.min(((e.clientX - rr.left) / rr.width) * 100 - 5, 88));
      setHostFacing(pct > hostLeftPct ? "right" : "left");
      setHostLeftPct(pct);
      triggerBob(setHostBob);
    },
    [triggerBob, hostLeftPct]
  );

  const speak = useCallback(() => {
    const v = speakText.trim();
    if (!v) return;
    say(v, hostLeftPct, "#fffae0");
    setSpeakText("");
    setSpeakOpen(false);
  }, [speakText, hostLeftPct, say]);

  useEffect(() => {
    const t: number[] = [];
    t.push(window.setTimeout(() => { setGuestVisible(true); setGuestLeftPct(28); setToday((x) => x + 1); }, 2600));
    t.push(window.setTimeout(() => say("안녕하세요~ 놀러왔어요!", 28, "#dbeaff"), 4000));
    t.push(window.setTimeout(() => setGuestWalking(false), 4100));
    t.push(window.setTimeout(() => { setHostFacing("left"); setHostLeftPct(38); triggerBob(setHostBob); }, 4300));
    t.push(window.setTimeout(() => say("어서오세요! 일촌해요 ♥", 38, "#ffe0ec"), 5800));
    t.push(window.setTimeout(() => setPosts((p) => [{ name: "방문자", text: "잘보고가요! 또올게요😊" }, ...p]), 7200));
    return () => t.forEach(clearTimeout);
  }, [say, triggerBob]);

  const submitPost = useCallback(() => {
    const v = input.trim();
    if (!v) return;
    const post = { name: "나", text: v };
    setPosts((p) => [post, ...p]); // 낙관적 갱신
    setInput("");
    fetch(`/api/biz/${site.slug}/guestbook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(post),
    }).catch(() => {});
  }, [input, site.slug]);

  const saveConfig = useCallback(() => {
    setSaveState("saving");
    fetch(`/api/biz/${site.slug}/minihompy`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minimi, roomConcept: concept }),
    })
      .then((r) => { if (!r.ok) throw new Error(); setSaveState("saved"); window.setTimeout(() => setSaveState("idle"), 2000); })
      .catch(() => setSaveState("idle"));
  }, [site.slug, minimi, concept]);

  return (
    <div className="mh-page" style={{ background: room.pageBg, ["--accent" as string]: room.accent, ["--soft" as string]: room.accentSoft }}>
      <style>{`
        .mh-page{min-height:100vh;padding:18px;font-family:'Dotum','Apple SD Gothic Neo',sans-serif;color:#3a332a;transition:background .4s;}
        .mh-top{max-width:1440px;margin:0 auto 10px;display:flex;justify-content:space-between;align-items:center;color:#fff;font-size:13px;}
        .mh-wrap{max-width:1440px;margin:0 auto;display:flex;gap:12px;align-items:flex-start;}
        .mh-profile{width:194px;flex:none;}
        .mh-book{flex:1;min-width:0;background:#fffdf6;border:1px solid #e3d9c2;border-radius:12px;padding:14px;box-shadow:inset 14px 0 0 -10px #e8dcc0;}
        .mh-book-inner{display:flex;gap:14px;}
        .mh-scene-col{flex:1;min-width:0;}
        .mh-news{width:184px;flex:none;}
        .mh-menu{width:96px;flex:none;display:flex;flex-direction:column;gap:6px;}
        .mh-right{width:236px;flex:none;display:flex;flex-direction:column;gap:8px;}
        .mh-card{background:#fffdf6;border:1px solid #e3d9c2;border-radius:10px;padding:10px;}
        .mh-card-h{font-size:11px;font-weight:700;color:var(--accent);letter-spacing:.5px;border-bottom:1px solid var(--soft);padding-bottom:4px;margin-bottom:6px;}
        .mh-tab{display:flex;align-items:center;gap:7px;background:var(--soft);border:1px solid var(--accent);border-radius:8px;padding:8px 9px;cursor:pointer;color:#5a4a32;}
        .mh-tab b{font-size:12px;}.mh-tab span{font-size:9px;color:var(--accent);}
        .mh-title{font-family:'Brush Script MT','Snell Roundhand',cursive;font-size:26px;color:var(--accent);line-height:1;}
        .mh-row{display:flex;justify-content:space-between;font-size:11px;padding:2px 0;color:#6a5e48;}
        .mh-btn{font-size:12px;border-radius:7px;padding:5px 12px;cursor:pointer;}
        @media(max-width:880px){
          .mh-wrap{flex-direction:column;}
          .mh-profile,.mh-book,.mh-menu,.mh-right{width:100%;}
          .mh-book-inner{flex-direction:column;}
          .mh-news{width:100%;}
          .mh-menu{flex-direction:row;flex-wrap:wrap;}
          .mh-menu .mh-tab{flex:1 1 28%;}
          .mh-book{box-shadow:none;}
        }
      `}</style>

      <div className="mh-top">
        <span style={{ fontWeight: 500 }}>🏠 {m.name} 미니홈피</span>
        <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
          방문자 <b style={{ color: "#fff4c2" }}>{today}</b> · TOTAL <b style={{ color: "#fff4c2" }}>567,890</b>
          <Link href="/minihome" style={{ background: "#fff", color: "var(--accent)", borderRadius: 7, padding: "4px 10px", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>✨ 내 미니홈피 만들기</Link>
          <Link href={`/biz/${site.slug}`} style={{ color: "#fff", textDecoration: "underline" }}>← 홈피로</Link>
        </span>
      </div>

      <div className="mh-wrap">

        {/* 좌: MY PROFILE */}
        <div className="mh-profile">
          <div className="mh-card">
            <div className="mh-card-h">MY PROFILE</div>
            <div style={{ border: "1px solid #e3d9c2", padding: 4, background: "#fff" }}>
              <div style={{ height: 132, background: photo ? `center/cover no-repeat url(${photo})` : "linear-gradient(135deg,#cfe9c0,#ffe0c0)" }} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6 }}>{m.name} {MINIMI[minimi].emoji}</div>
            <div style={{ fontSize: 11, color: "#8a7a5a", marginTop: 2 }}>{status}</div>
            <div style={{ fontSize: 10, color: "#a89878", marginTop: 6, borderTop: "1px dashed #e3d9c2", paddingTop: 5 }}>
              TODAY IS..<br />2026.06.21 SUN
            </div>
            <div className="mh-card-h" style={{ marginTop: 8 }}>HISTORY</div>
            {[["다이어리", 128], ["사진첩", 342], ["방명록", posts.length + 676], ["스크랩", 56]].map(([k, v]) => (
              <div className="mh-row" key={k as string}><span>● {k}</span><span>{v}</span></div>
            ))}
          </div>
        </div>

        {/* 중앙: 미니홈 북 */}
        <div className="mh-book">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 8 }}>
            <div>
              <div className="mh-title">Minimi&apos;s Minihome</div>
              <div style={{ fontSize: 9, letterSpacing: 2, color: "#b0a486" }}>WELCOME TO MY MINIHOME</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="mh-btn" onClick={() => setSpeakOpen((s) => !s)} style={{ background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }}>💬 말하기</button>
              <button className="mh-btn" onClick={() => setDecorate((d) => !d)} style={{ background: decorate ? "#ff7aa2" : "#fff", color: decorate ? "#fff" : "var(--accent)", border: "1px solid var(--accent)" }}>🎨 {decorate ? "완료" : "꾸미기"}</button>
            </div>
          </div>

          {speakOpen && (
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <input value={speakText} onChange={(e) => setSpeakText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") speak(); }} autoFocus placeholder="미니미가 할 말을 입력...(말풍선)" style={{ flex: 1, fontSize: 12, height: 32, border: "1px solid var(--accent)", borderRadius: 7, padding: "0 8px", background: "#fff" }} />
              <button className="mh-btn" onClick={speak} style={{ background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }}>말하기</button>
            </div>
          )}

          {decorate && (
            <div className="mh-card" style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: "#8a7a5a", marginBottom: 5 }}>방 컨셉</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                {ROOM_ORDER.map((c) => (
                  <button key={c} onClick={() => setConcept(c)} className="mh-btn" style={{ border: concept === c ? "2px solid #ff7aa2" : "1px solid #e3d9c2", background: concept === c ? "#ffeef4" : "#fff", color: "#5a4a32" }}>{ROOM_CONCEPTS[c].emoji} {ROOM_CONCEPTS[c].label}</button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: "#8a7a5a", marginBottom: 5 }}>미니미</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {MINIMI_ORDER.map((k) => (
                  <button key={k} onClick={() => setMinimi(k)} className="mh-btn" style={{ border: minimi === k ? "2px solid #ff7aa2" : "1px solid #e3d9c2", background: minimi === k ? "#ffeef4" : "#fff", color: "#5a4a32" }}>{MINIMI[k].emoji} {MINIMI[k].label}</button>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 9 }}>
                <button className="mh-btn" onClick={saveConfig} disabled={saveState === "saving"} style={{ background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }}>
                  {saveState === "saving" ? "저장 중..." : saveState === "saved" ? "✓ 저장됨" : "💾 저장"}
                </button>
                <span style={{ fontSize: 10, color: "#b0a486" }}>고른 미니미·방이 내 미니홈피에 저장됩니다</span>
              </div>
            </div>
          )}

          <div className="mh-book-inner">
            {/* 씬 (걷는 미니룸) */}
            <div className="mh-scene-col">
              <div ref={roomRef} onClick={onRoomClick} style={{ position: "relative", height: 300, border: "1px solid #d8cba8", borderRadius: 8, overflow: "hidden", cursor: "pointer", background: room.bgImage ? `center/cover no-repeat url(${room.bgImage}), ${room.bg}` : room.bg }}>
                <div style={{ position: "absolute", bottom: 14, left: `${hostLeftPct}%`, transition: "left 1.2s linear", transform: hostBob ? "translateY(-4px)" : "none", zIndex: 3 }}>
                  <MiniMi kind={minimi} name="주인장" pose={hostBob ? "side" : "front"} flip={hostBob && hostFacing === "right"} />
                </div>
                <div style={{ position: "absolute", bottom: 14, left: `${guestLeftPct}%`, transition: "left 1.4s linear, opacity .4s", opacity: guestVisible ? 1 : 0, zIndex: 2 }}>
                  <MiniMi kind="baram" name="방문자" pose={guestVisible && guestWalking ? "side" : "front"} flip={guestVisible && guestWalking} />
                </div>
                {bubble && (
                  <div style={{ position: "absolute", bottom: 80, left: bubble.leftPx, fontSize: 12, background: bubble.color, border: "1px solid #e8d77a", borderRadius: 10, padding: "5px 9px", zIndex: 5, whiteSpace: "nowrap" }}>{bubble.text}</div>
                )}
                <div style={{ position: "absolute", left: 8, bottom: 6, fontSize: 10, color: "#7a6a48", background: "rgba(255,255,255,.6)", borderRadius: 4, padding: "0 4px" }}>바닥 클릭→걷기 · 말하기→말풍선</div>
              </div>
            </div>

            {/* 업뎃 뉴스 + BGM */}
            <div className="mh-news">
              <div className="mh-card-h">Updated news →</div>
              {[["다이어리", "06.21"], ["사진첩", "06.18"], ["방명록", "06.21"]].map(([k, d]) => (
                <div className="mh-row" key={k}><span style={{ color: k === "다이어리" ? "#c0392b" : "#6a5e48" }}>{k}</span><span>{d}</span></div>
              ))}
              <div className="mh-card-h" style={{ marginTop: 10 }}>BGM</div>
              <div style={{ fontSize: 11, color: "#6a5e48" }}>제주 바람 - 아이유</div>
              <div style={{ fontSize: 14, color: "var(--accent)", marginTop: 3 }}>⏮ ▶ ⏭</div>
            </div>
          </div>

          {/* 방명록 */}
          <div className="mh-card" style={{ marginTop: 10 }}>
            <div className="mh-card-h" style={{ color: "#c44b73", borderColor: "#ffd6e2" }}>💬 방명록 (일촌평)</div>
            <div style={{ fontSize: 12, lineHeight: 1.7 }}>
              {posts.map((p, i) => (
                <div key={i} style={{ borderBottom: "1px dashed #eee", padding: "3px 0" }}><b style={{ color: "var(--accent)" }}>{p.name}</b> {p.text}</div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submitPost(); }} placeholder="방명록 남기기..." style={{ flex: 1, fontSize: 12, height: 32, border: "1px solid #e3d9c2", borderRadius: 7, padding: "0 8px", background: "#fff" }} />
              <button className="mh-btn" onClick={submitPost} style={{ background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }}>등록</button>
            </div>
          </div>
        </div>

        {/* 메뉴 탭 */}
        <div className="mh-menu">
          {MENU.map(([ko, en]) => (
            <div className="mh-tab" key={en}><b>{ko}</b><span>{en}</span></div>
          ))}
        </div>

        {/* 우측 패널 */}
        <div className="mh-right">
          <div className="mh-card">
            <div className="mh-card-h">친구 추천</div>
            {["푸른하늘", "오름사랑", "제주바람"].map((n) => (
              <div className="mh-row" key={n}><span>▸ {n}</span><span style={{ color: "var(--accent)" }}>일촌</span></div>
            ))}
          </div>
          <ConceptWidget concept={concept} />
          <div className="mh-card">
            <div className="mh-card-h">추천 BGM</div>
            <div style={{ fontSize: 11, color: "#6a5e48" }}>봄이 온다 - 10cm</div>
            <div style={{ fontSize: 13, color: "var(--accent)", marginTop: 3 }}>▶ ⏭</div>
          </div>
          <div className="mh-card">
            <div className="mh-card-h">TODAY&apos;S MEMO</div>
            <div style={{ fontSize: 11, color: "#8a7a5a" }}>예쁜 {room.label} 보면 마음이 맑아져요 🌿</div>
          </div>
        </div>
      </div>
    </div>
  );
}
