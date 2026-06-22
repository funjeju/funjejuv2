"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { addMySpot } from "@/lib/my-spots";
import type { MySpotCategory } from "@/types/my-spot";
import type { SiteSchema, MiniMiKind, RoomConcept } from "@/lib/biz/types";
import { MiniMi } from "./MiniMi";
import { track } from "@/lib/analytics";
import { MINIMI, MINIMI_ORDER, ROOM_CONCEPTS, ROOM_ORDER } from "./minimi-config";

/**
 * 싸이월드 미니홈피st (업소) — /biz/[slug]/home.
 * 상단 미니룸(배경+미니미 2D 산책) 고정 + 그 아래 메뉴 내용(다이어리·사진첩·방명록·스크랩·방문자·BGM).
 * 스크랩 = 링크 즐겨찾기 + 카테고리별 스팟(제주·강원도·직접추가).
 */

interface GuestPost { name: string; text: string; createdAt?: string; }
interface DiaryEntry { id: string; date: string; text: string; }
interface Visitor { uid: string; name: string; lastVisit: number; }
interface ScrapItem { id: string; type: "link" | "spot"; category: string; title: string; url: string; address: string; }
type Tab = "diary" | "photo" | "guestbook" | "scrap" | "visitor" | "bgm";

const MENU: { id: Tab; ko: string; en: string }[] = [
  { id: "diary", ko: "다이어리", en: "DIARY" },
  { id: "photo", ko: "사진첩", en: "PHOTO" },
  { id: "guestbook", ko: "방명록", en: "BOARD" },
  { id: "scrap", ko: "스크랩", en: "SCRAP" },
  { id: "visitor", ko: "방문자", en: "VISITOR" },
  { id: "bgm", ko: "BGM", en: "MUSIC" },
];

const pad = (n: number) => String(n).padStart(2, "0");
const dateStr = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const todayStr = () => new Date().toISOString().slice(0, 10);
function ytEmbed(url: string): string | null { const m = url.match(/(?:youtu\.be\/|v=)([\w-]{11})/); return m ? `https://www.youtube.com/embed/${m[1]}` : null; }
function guessCat(c: string): MySpotCategory {
  if (c.includes("카페")) return "카페";
  if (c.includes("음식") || c.includes("맛집") || c.includes("식당")) return "맛집";
  if (c.includes("숙박") || c.includes("펜션") || c.includes("호텔")) return "숙소";
  return "여행지";
}

export function MiniHompy({ site, initialPosts }: { site: SiteSchema; initialPosts?: GuestPost[] }) {
  const { user, signInWithGoogle } = useAuth();
  const m = site.merchantInfo;
  const photo = site.contentAssets.heroImage || site.contentAssets.logoImage || "";
  const gallery = (site.contentAssets.galleryImages ?? []).filter(Boolean);
  const status = m.description?.slice(0, 40) || "놀러오세요~";

  const [minimi, setMinimi] = useState<MiniMiKind>(site.miniHompy?.minimi ?? "hallabong");
  const [concept, setConcept] = useState<RoomConcept>(site.miniHompy?.roomConcept ?? "oreum");
  const room = ROOM_CONCEPTS[concept];
  const [decorate, setDecorate] = useState(false);
  const [tab, setTab] = useState<Tab>("guestbook");

  const roomRef = useRef<HTMLDivElement>(null);
  const [hostX, setHostX] = useState(50);
  const [hostY, setHostY] = useState(86);
  const [hostBob, setHostBob] = useState(false);
  const [hostFacing, setHostFacing] = useState<"left" | "right">("right");
  const [bubble, setBubble] = useState<string | null>(null);
  const [speakOpen, setSpeakOpen] = useState(false);
  const [speakText, setSpeakText] = useState("");

  const [posts, setPosts] = useState<GuestPost[]>(initialPosts ?? []);
  const [input, setInput] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [counts, setCounts] = useState<{ today: number; total: number } | null>(null);

  const [diary, setDiary] = useState<DiaryEntry[]>([]);
  const now = new Date();
  const [calY, setCalY] = useState(now.getFullYear());
  const [calM, setCalM] = useState(now.getMonth());
  const [selDate, setSelDate] = useState(todayStr());
  const [diaryText, setDiaryText] = useState("");
  const [visitors, setVisitors] = useState<Visitor[]>([]);

  // 스크랩(링크/스팟 + 카테고리)
  const [scraps, setScraps] = useState<ScrapItem[]>([]);
  const [catFilter, setCatFilter] = useState("전체");
  const [sType, setSType] = useState<"link" | "spot">("spot");
  const [sCat, setSCat] = useState("제주");
  const [sTitle, setSTitle] = useState("");
  const [sUrl, setSUrl] = useState("");
  const [sAddr, setSAddr] = useState("");

  const [bgmUrl, setBgmUrl] = useState(site.miniHompy?.bgmUrl ?? "");
  const [bgmInput, setBgmInput] = useState(site.miniHompy?.bgmUrl ?? "");
  const [savedSpot, setSavedSpot] = useState(false);

  useEffect(() => {
    (async () => {
      const headers: Record<string, string> = {};
      if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`;
      fetch(`/api/biz/${site.slug}/visit`, { method: "POST", headers }).then((r) => r.json()).then((d) => { if (typeof d.today === "number") setCounts(d); }).catch(() => {});
    })();
  }, [site.slug, user]);

  useEffect(() => {
    if (tab === "diary" && diary.length === 0) fetch(`/api/biz/${site.slug}/diary`).then((r) => r.json()).then((d) => setDiary(d.entries ?? [])).catch(() => {});
    if (tab === "visitor" && visitors.length === 0) fetch(`/api/biz/${site.slug}/visitors`).then((r) => r.json()).then((d) => setVisitors(d.visitors ?? [])).catch(() => {});
    if (tab === "scrap" && scraps.length === 0) fetch(`/api/biz/${site.slug}/scrap`).then((r) => r.json()).then((d) => setScraps(d.scraps ?? [])).catch(() => {});
  }, [tab, site.slug, diary.length, visitors.length, scraps.length]);

  const triggerBob = useCallback(() => { setHostBob(true); window.setTimeout(() => setHostBob(false), 1120); }, []);
  const onRoomClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rr = roomRef.current?.getBoundingClientRect(); if (!rr) return;
    const x = Math.max(6, Math.min(((e.clientX - rr.left) / rr.width) * 100, 94));
    const y = Math.max(34, Math.min(((e.clientY - rr.top) / rr.height) * 100, 95));
    setHostFacing(x > hostX ? "right" : "left"); setHostX(x); setHostY(y); triggerBob();
  }, [hostX, triggerBob]);
  const speak = useCallback(() => {
    const v = speakText.trim(); if (!v) return;
    setBubble(v); window.setTimeout(() => setBubble(null), 2600); setSpeakText(""); setSpeakOpen(false);
    track("minihome_speak", { slug: site.slug });
  }, [speakText, site.slug]);

  const submitPost = useCallback(() => {
    const v = input.trim(); if (!v) return;
    const post = { name: "방문자", text: v }; setPosts((p) => [post, ...p]); setInput("");
    track("guestbook_post", { slug: site.slug });
    fetch(`/api/biz/${site.slug}/guestbook`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(post) }).catch(() => {});
  }, [input, site.slug]);

  const saveConfig = useCallback((extra?: { bgmUrl?: string }) => {
    setSaveState("saving");
    fetch(`/api/biz/${site.slug}/minihompy`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ minimi, roomConcept: concept, ...extra }) })
      .then((r) => { if (!r.ok) throw new Error(); setSaveState("saved"); track("minihome_decorate_save", { minimi, concept }); window.setTimeout(() => setSaveState("idle"), 2000); }).catch(() => setSaveState("idle"));
  }, [site.slug, minimi, concept]);

  const addDiary = async () => {
    const v = diaryText.trim(); if (!v) return; setDiaryText("");
    try { const r = await fetch(`/api/biz/${site.slug}/diary`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: selDate, text: v }) }); const d = await r.json(); if (d.entry) setDiary((p) => [d.entry, ...p]); } catch { /* */ }
  };
  const addScrapItem = async () => {
    const t = sTitle.trim();
    if (!t && !sUrl.trim() && !sAddr.trim()) return;
    const body = { type: sType, category: sCat.trim() || "제주", title: t, url: sType === "link" ? sUrl : "", address: sType === "spot" ? sAddr : "" };
    setSTitle(""); setSUrl(""); setSAddr("");
    try { const r = await fetch(`/api/biz/${site.slug}/scrap`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const d = await r.json(); if (d.item) setScraps((p) => [d.item, ...p]); } catch { /* */ }
  };
  const saveBgm = () => { const u = bgmInput.trim(); setBgmUrl(u); saveConfig({ bgmUrl: u }); };
  const addToMySpot = async () => {
    if (!user) { signInWithGoogle(); return; }
    if (savedSpot || !m.coordinates) return;
    try { await addMySpot(user.uid, { name: m.name, category: guessCat(m.category || ""), lat: m.coordinates.lat, lng: m.coordinates.lng, address: m.address }); setSavedSpot(true); track("myspot_add", { source: "minihome", slug: site.slug }); } catch { /* */ }
  };

  const diaryByDate = useMemo(() => { const map: Record<string, DiaryEntry[]> = {}; for (const e of diary) (map[e.date] ??= []).push(e); return map; }, [diary]);
  const firstDow = new Date(calY, calM, 1).getDay();
  const daysIn = new Date(calY, calM + 1, 0).getDate();
  const selEntries = diaryByDate[selDate] ?? [];
  const embed = bgmUrl ? ytEmbed(bgmUrl) : null;
  const scrapCats = useMemo(() => Array.from(new Set(scraps.map((s) => s.category))), [scraps]);
  const filteredScraps = catFilter === "전체" ? scraps : scraps.filter((s) => s.category === catFilter);

  return (
    <div className="mh-page" style={{ background: room.pageBg, ["--accent" as string]: room.accent, ["--soft" as string]: room.accentSoft }}>
      <style>{`
        .mh-page{min-height:100vh;padding:18px;font-family:'Dotum','Apple SD Gothic Neo',sans-serif;color:#3a332a;transition:background .4s;}
        .mh-top{max-width:1280px;margin:0 auto 10px;display:flex;justify-content:space-between;align-items:center;color:#fff;font-size:13px;gap:10px;flex-wrap:wrap;}
        .mh-wrap{max-width:1280px;margin:0 auto;display:flex;gap:12px;align-items:flex-start;}
        .mh-profile{width:190px;flex:none;}
        .mh-book{flex:1;min-width:0;background:#fffdf6;border:1px solid #e3d9c2;border-radius:12px;padding:14px;}
        .mh-menu{width:88px;flex:none;display:flex;flex-direction:column;gap:6px;}
        .mh-right{width:212px;flex:none;display:flex;flex-direction:column;gap:8px;}
        .mh-card{background:#fffdf6;border:1px solid #e3d9c2;border-radius:10px;padding:10px;}
        .mh-card-h{font-size:11px;font-weight:700;color:var(--accent);letter-spacing:.5px;border-bottom:1px solid var(--soft);padding-bottom:4px;margin-bottom:6px;}
        .mh-tab{display:flex;flex-direction:column;align-items:center;gap:1px;background:var(--soft);border:1px solid var(--accent);border-radius:8px;padding:9px 4px;cursor:pointer;color:#5a4a32;white-space:nowrap;}
        .mh-tab.on{background:var(--accent);color:#fff;}
        .mh-tab b{font-size:12px;}.mh-tab span{font-size:8px;letter-spacing:.5px;opacity:.8;}
        .mh-title{font-family:'Brush Script MT','Snell Roundhand',cursive;font-size:26px;color:var(--accent);line-height:1;}
        .mh-row{display:flex;justify-content:space-between;font-size:11px;padding:2px 0;color:#6a5e48;}
        .mh-btn{font-size:12px;border-radius:7px;padding:5px 12px;cursor:pointer;}
        .mh-cal{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;}
        .mh-cal .d{aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:11px;border-radius:6px;cursor:pointer;}
        .mh-chip{font-size:11px;padding:3px 9px;border-radius:999px;cursor:pointer;border:1px solid #e3d9c2;background:#fff;color:#6a5e48;}
        .mh-chip.on{background:var(--accent);color:#fff;border-color:var(--accent);}
        @media(max-width:880px){.mh-wrap{flex-direction:column;}.mh-profile,.mh-book,.mh-menu,.mh-right{width:100%;}.mh-menu{flex-direction:row;flex-wrap:wrap;}.mh-menu .mh-tab{flex:1 1 28%;flex-direction:row;gap:5px;}}
      `}</style>

      <div className="mh-top">
        <span style={{ fontWeight: 500 }}>🏠 {m.name} 미니홈피</span>
        <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
          방문자 <b style={{ color: "#fff4c2" }}>{counts ? counts.today.toLocaleString() : "–"}</b> · TOTAL <b style={{ color: "#fff4c2" }}>{counts ? counts.total.toLocaleString() : "–"}</b>
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
            <div style={{ fontSize: 10, color: "#a89878", marginTop: 6, borderTop: "1px dashed #e3d9c2", paddingTop: 5 }}>TODAY IS..<br />{todayStr()}</div>
            <div className="mh-card-h" style={{ marginTop: 8 }}>HISTORY</div>
            <button onClick={() => setTab("diary")} style={{ all: "unset", cursor: "pointer", display: "block", width: "100%" }}><div className="mh-row"><span>📖 다이어리</span><span>{diary.length}</span></div></button>
            <button onClick={() => setTab("photo")} style={{ all: "unset", cursor: "pointer", display: "block", width: "100%" }}><div className="mh-row"><span>📷 사진첩</span><span>{gallery.length}</span></div></button>
            <button onClick={() => setTab("guestbook")} style={{ all: "unset", cursor: "pointer", display: "block", width: "100%" }}><div className="mh-row"><span>💬 방명록</span><span>{posts.length}</span></div></button>
          </div>
        </div>

        {/* 중앙: 상단 미니룸 고정 + 하단 메뉴 내용 */}
        <div className="mh-book">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10 }}>
            <div>
              <div className="mh-title">{m.name} Minihome</div>
              <div style={{ fontSize: 9, letterSpacing: 2, color: "#b0a486" }}>WELCOME TO MY MINIHOME</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="mh-btn" onClick={() => setSpeakOpen((s) => !s)} style={{ background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }}>💬 말하기</button>
              <button className="mh-btn" onClick={() => setDecorate((d) => !d)} style={{ background: decorate ? "#ff7aa2" : "#fff", color: decorate ? "#fff" : "var(--accent)", border: "1px solid var(--accent)" }}>🎨 {decorate ? "완료" : "꾸미기"}</button>
            </div>
          </div>

          {speakOpen && (
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <input value={speakText} onChange={(e) => setSpeakText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") speak(); }} autoFocus placeholder="미니미가 할 말...(말풍선)" style={{ flex: 1, fontSize: 12, height: 32, border: "1px solid var(--accent)", borderRadius: 7, padding: "0 8px", background: "#fff" }} />
              <button className="mh-btn" onClick={speak} style={{ background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }}>말하기</button>
            </div>
          )}
          {decorate && (
            <div className="mh-card" style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: "#8a7a5a", marginBottom: 5 }}>방 컨셉</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                {ROOM_ORDER.map((c) => (<button key={c} onClick={() => setConcept(c)} className="mh-btn" style={{ border: concept === c ? "2px solid #ff7aa2" : "1px solid #e3d9c2", background: concept === c ? "#ffeef4" : "#fff", color: "#5a4a32" }}>{ROOM_CONCEPTS[c].emoji} {ROOM_CONCEPTS[c].label}</button>))}
              </div>
              <div style={{ fontSize: 11, color: "#8a7a5a", marginBottom: 5 }}>미니미</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {MINIMI_ORDER.map((k) => (<button key={k} onClick={() => setMinimi(k)} className="mh-btn" style={{ border: minimi === k ? "2px solid #ff7aa2" : "1px solid #e3d9c2", background: minimi === k ? "#ffeef4" : "#fff", color: "#5a4a32" }}>{MINIMI[k].emoji} {MINIMI[k].label}</button>))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 9 }}>
                <button className="mh-btn" onClick={() => saveConfig()} disabled={saveState === "saving"} style={{ background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }}>{saveState === "saving" ? "저장 중..." : saveState === "saved" ? "✓ 저장됨" : "💾 저장"}</button>
                <span style={{ fontSize: 10, color: "#b0a486" }}>미니미·방 저장</span>
              </div>
            </div>
          )}

          {/* 미니룸 (항상 상단 고정) — 클릭하면 미니미가 그 지점으로 이동 */}
          <div ref={roomRef} onClick={onRoomClick} style={{ position: "relative", height: 340, border: "1px solid #d8cba8", borderRadius: 8, overflow: "hidden", cursor: "pointer", background: room.bgImage ? `center/cover no-repeat url(${room.bgImage}), ${room.bg}` : room.bg }}>
            <div style={{ position: "absolute", left: `${hostX}%`, top: `${hostY}%`, transform: `translate(-50%,-100%) ${hostBob ? "translateY(-4px)" : ""}`, transition: "left 1.1s linear, top 1.1s linear", zIndex: 3 }}>
              <MiniMi kind={minimi} name="주인장" pose={hostBob ? "side" : "front"} flip={hostBob && hostFacing === "right"} />
            </div>
            {bubble && <div style={{ position: "absolute", left: `${hostX}%`, top: `${hostY}%`, transform: "translate(-50%,-260%)", fontSize: 12, background: "#fffae0", border: "1px solid #e8d77a", borderRadius: 10, padding: "5px 9px", zIndex: 5, whiteSpace: "nowrap" }}>{bubble}</div>}
            <div style={{ position: "absolute", left: 8, bottom: 6, fontSize: 10, color: "#7a6a48", background: "rgba(255,255,255,.6)", borderRadius: 4, padding: "0 4px" }}>아무 곳이나 클릭→미니미 이동 · 말하기→말풍선</div>
          </div>

          {/* 하단 메뉴 내용 */}
          <div style={{ marginTop: 12 }}>
            {tab === "diary" && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div className="mh-card-h" style={{ border: 0, margin: 0 }}>📖 다이어리</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                    <button onClick={() => { const d = new Date(calY, calM - 1, 1); setCalY(d.getFullYear()); setCalM(d.getMonth()); }} style={{ cursor: "pointer", border: 0, background: "none" }}>◀</button>
                    <b>{calY}.{pad(calM + 1)}</b>
                    <button onClick={() => { const d = new Date(calY, calM + 1, 1); setCalY(d.getFullYear()); setCalM(d.getMonth()); }} style={{ cursor: "pointer", border: 0, background: "none" }}>▶</button>
                  </div>
                </div>
                <div className="mh-cal" style={{ marginBottom: 4 }}>{["일", "월", "화", "수", "목", "금", "토"].map((w) => <div key={w} style={{ textAlign: "center", fontSize: 10, color: "#a89878" }}>{w}</div>)}</div>
                <div className="mh-cal">
                  {Array.from({ length: firstDow }).map((_, i) => <div key={`b${i}`} />)}
                  {Array.from({ length: daysIn }).map((_, i) => {
                    const ds = dateStr(calY, calM, i + 1); const has = !!diaryByDate[ds]; const sel = ds === selDate;
                    return <div key={ds} className="d" onClick={() => setSelDate(ds)} style={{ background: sel ? "var(--accent)" : has ? "var(--soft)" : "#fff", color: sel ? "#fff" : "#5a4a32", border: "1px solid #eee5d4" }}>{i + 1}{has && <span style={{ fontSize: 8, color: sel ? "#fff" : "var(--accent)" }}>●</span>}</div>;
                  })}
                </div>
                <div style={{ marginTop: 10, fontSize: 12 }}>
                  <div style={{ fontWeight: 700, color: "var(--accent)", marginBottom: 4 }}>{selDate}</div>
                  {selEntries.length === 0 ? <p style={{ color: "#a89878" }}>이 날의 기록이 없어요.</p> : selEntries.map((e) => <div key={e.id} style={{ borderBottom: "1px dashed #eee", padding: "3px 0" }}>{e.text}</div>)}
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    <input value={diaryText} onChange={(e) => setDiaryText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addDiary(); }} placeholder={`${selDate} 일기 쓰기...`} style={{ flex: 1, fontSize: 12, height: 32, border: "1px solid #e3d9c2", borderRadius: 7, padding: "0 8px", background: "#fff" }} />
                    <button className="mh-btn" onClick={addDiary} style={{ background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }}>기록</button>
                  </div>
                </div>
              </div>
            )}

            {tab === "photo" && (
              <div>
                <div className="mh-card-h">📷 사진첩 ({gallery.length})</div>
                {gallery.length === 0 ? <p style={{ fontSize: 12, color: "#a89878", padding: "20px 0", textAlign: "center" }}>등록된 사진이 없어요.</p> : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 8 }}>{gallery.map((src, i) => <div key={i} style={{ aspectRatio: "1", borderRadius: 8, background: `center/cover no-repeat url(${src})`, border: "1px solid #e3d9c2" }} />)}</div>
                )}
              </div>
            )}

            {tab === "guestbook" && (
              <div>
                <div className="mh-card-h" style={{ color: "#c44b73", borderColor: "#ffd6e2" }}>💬 방명록 (일촌평)</div>
                <div style={{ fontSize: 12, lineHeight: 1.7, minHeight: 60 }}>
                  {posts.length === 0 ? <p style={{ color: "#a89878", padding: "16px 0", textAlign: "center" }}>첫 방명록을 남겨보세요! ✍️</p> : posts.map((p, i) => <div key={i} style={{ borderBottom: "1px dashed #eee", padding: "3px 0" }}><b style={{ color: "var(--accent)" }}>{p.name}</b> {p.text}</div>)}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submitPost(); }} placeholder="방명록 남기기..." style={{ flex: 1, fontSize: 12, height: 32, border: "1px solid #e3d9c2", borderRadius: 7, padding: "0 8px", background: "#fff" }} />
                  <button className="mh-btn" onClick={submitPost} style={{ background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }}>등록</button>
                </div>
              </div>
            )}

            {tab === "scrap" && (
              <div>
                <div className="mh-card-h">⭐ 스크랩 (즐겨찾기 · 스팟)</div>
                {/* 카테고리 필터 */}
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
                  <button className={`mh-chip${catFilter === "전체" ? " on" : ""}`} onClick={() => setCatFilter("전체")}>전체</button>
                  {scrapCats.map((c) => <button key={c} className={`mh-chip${catFilter === c ? " on" : ""}`} onClick={() => setCatFilter(c)}>{c}</button>)}
                </div>
                <div style={{ fontSize: 12, minHeight: 50 }}>
                  {filteredScraps.length === 0 ? <p style={{ color: "#a89878", padding: "12px 0", textAlign: "center" }}>좋아하는 곳·링크를 스크랩해보세요! 🔖</p> : filteredScraps.map((s) => (
                    <div key={s.id} style={{ borderBottom: "1px dashed #eee", padding: "5px 0", display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ fontSize: 9, background: "var(--soft)", color: "var(--accent)", borderRadius: 5, padding: "1px 6px", flex: "none" }}>{s.category}</span>
                      {s.type === "link" && s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "none" }}>🔗 {s.title}</a> : <span>📍 {s.title}{s.address ? <span style={{ color: "#a89878" }}> · {s.address}</span> : null}</span>}
                    </div>
                  ))}
                </div>
                {/* 추가 폼 */}
                <div style={{ border: "1px solid #eee5d4", borderRadius: 8, padding: 9, marginTop: 10, background: "#fffdf6" }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 7 }}>
                    <button className="mh-chip" onClick={() => setSType("spot")} style={sType === "spot" ? { background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" } : undefined}>📍 스팟</button>
                    <button className="mh-chip" onClick={() => setSType("link")} style={sType === "link" ? { background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" } : undefined}>🔗 링크</button>
                    <input value={sCat} onChange={(e) => setSCat(e.target.value)} list="mh-cats" placeholder="카테고리(제주/강원도…)" style={{ flex: 1, fontSize: 12, height: 30, border: "1px solid #e3d9c2", borderRadius: 7, padding: "0 8px", background: "#fff" }} />
                    <datalist id="mh-cats">{["제주", "강원도", "서울", "부산", ...scrapCats].map((c) => <option key={c} value={c} />)}</datalist>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input value={sTitle} onChange={(e) => setSTitle(e.target.value)} placeholder="이름/제목" style={{ width: 120, fontSize: 12, height: 30, border: "1px solid #e3d9c2", borderRadius: 7, padding: "0 8px", background: "#fff" }} />
                    {sType === "link"
                      ? <input value={sUrl} onChange={(e) => setSUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addScrapItem(); }} placeholder="https://..." style={{ flex: 1, fontSize: 12, height: 30, border: "1px solid #e3d9c2", borderRadius: 7, padding: "0 8px", background: "#fff" }} />
                      : <input value={sAddr} onChange={(e) => setSAddr(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addScrapItem(); }} placeholder="주소(선택)" style={{ flex: 1, fontSize: 12, height: 30, border: "1px solid #e3d9c2", borderRadius: 7, padding: "0 8px", background: "#fff" }} />}
                    <button className="mh-btn" onClick={addScrapItem} style={{ background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }}>추가</button>
                  </div>
                </div>
              </div>
            )}

            {tab === "visitor" && (
              <div>
                <div className="mh-card-h">👣 방문자 (TODAY {counts?.today ?? "–"} · TOTAL {counts?.total ?? "–"})</div>
                {visitors.length === 0 ? <p style={{ fontSize: 12, color: "#a89878", padding: "16px 0", textAlign: "center" }}>아직 다녀간 회원이 없어요.<br />(로그인 방문자만 기록돼요)</p> : <div style={{ fontSize: 12 }}>{visitors.map((v) => <div key={v.uid} className="mh-row"><span>🙋 {v.name}</span><span style={{ color: "#a89878" }}>{new Date(v.lastVisit).toLocaleDateString()}</span></div>)}</div>}
              </div>
            )}

            {tab === "bgm" && (
              <div>
                <div className="mh-card-h">🎵 BGM</div>
                {embed ? <div style={{ position: "relative", paddingTop: "56.25%", borderRadius: 8, overflow: "hidden", marginBottom: 10 }}><iframe src={embed} title="BGM" allow="autoplay; encrypted-media" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }} /></div> : <p style={{ fontSize: 12, color: "#a89878", padding: "16px 0", textAlign: "center" }}>설정된 BGM이 없어요. 유튜브 링크로 배경음악을 넣어보세요.</p>}
                <div style={{ display: "flex", gap: 6 }}>
                  <input value={bgmInput} onChange={(e) => setBgmInput(e.target.value)} placeholder="유튜브 링크 (https://youtu.be/...)" style={{ flex: 1, fontSize: 12, height: 32, border: "1px solid #e3d9c2", borderRadius: 7, padding: "0 8px", background: "#fff" }} />
                  <button className="mh-btn" onClick={saveBgm} style={{ background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }}>설정</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 메뉴 탭 6종 */}
        <div className="mh-menu">
          {MENU.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`mh-tab${tab === t.id ? " on" : ""}`}><b>{t.ko}</b><span>{t.en}</span></button>
          ))}
        </div>

        {/* 우: 영업정보 */}
        <div className="mh-right">
          <div className="mh-card">
            <div className="mh-card-h">영업정보</div>
            {m.businessHours && <div style={{ fontSize: 11, color: "#6a5e48", marginBottom: 4 }}>🕒 {m.businessHours}</div>}
            {m.phone && <div style={{ fontSize: 11, marginBottom: 4 }}>📞 <a href={`tel:${m.phone}`} style={{ color: "var(--accent)" }}>{m.phone}</a></div>}
            {m.address && <div style={{ fontSize: 11, color: "#6a5e48", marginBottom: 8 }}>📍 {m.address}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {site.externalLinks?.naverPlace && <a href={site.externalLinks.naverPlace} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, background: "#03C75A", color: "#fff", borderRadius: 6, padding: "5px 0", textAlign: "center", textDecoration: "none", fontWeight: 700 }}>네이버 플레이스</a>}
              {(site.externalLinks?.kakaoPlace || m.coordinates) && <a href={site.externalLinks?.kakaoPlace || `https://map.kakao.com/link/to/${encodeURIComponent(m.name)},${m.coordinates?.lat},${m.coordinates?.lng}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, background: "#3B82F6", color: "#fff", borderRadius: 6, padding: "5px 0", textAlign: "center", textDecoration: "none", fontWeight: 700 }}>길찾기</a>}
              {site.externalLinks?.instagram && <a href={site.externalLinks.instagram} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, background: "#E1306C", color: "#fff", borderRadius: 6, padding: "5px 0", textAlign: "center", textDecoration: "none", fontWeight: 700 }}>인스타그램</a>}
              {m.coordinates && <button onClick={addToMySpot} disabled={savedSpot} style={{ fontSize: 11, background: savedSpot ? "#e8e2d4" : "#e8590c", color: savedSpot ? "#9a8" : "#fff", border: "none", borderRadius: 6, padding: "6px 0", cursor: savedSpot ? "default" : "pointer", fontWeight: 700 }}>{savedSpot ? "⭐ 마이스팟에 담음 ✓" : user ? "⭐ 내 마이스팟에 담기" : "⭐ 로그인하고 담기"}</button>}
            </div>
            <p style={{ fontSize: 9, color: "#b0a486", marginTop: 6 }}>담아두면 AI 여행일정 동선에 자동 반영돼요</p>
          </div>
        </div>
      </div>
    </div>
  );
}
