"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
 * 내 계정 미니홈피 — /minihome/me. 비즈와 동일 메뉴(영업정보 제외):
 * 다이어리(달력)·사진첩·방명록·스크랩·방문자·BGM + 키우기·채팅. 미니룸 2D 산책+걸음 이스터에그.
 */

interface Home { displayName: string; minimi: MiniMiKind; concept: RoomConcept; level: number; xp: number; bomal: number; ownedItems: string[]; background?: string; specialMinimi?: string; customBgUrl?: string; decorSavedAt?: number; bgmUrl?: string; photos?: string[]; }
interface DiaryEntry { id: string; date: string; text: string; }
interface GuestPost { name: string; text: string; }
interface Visitor { uid: string; name: string; lastVisit: number; }
interface ScrapItem { id: string; type: "link" | "spot"; category: string; title: string; url: string; address: string; }
type Tab = "diary" | "photo" | "guestbook" | "scrap" | "visitor" | "bgm" | "grow" | "chat";

const MENU: { id: Tab; ko: string; en: string }[] = [
  { id: "diary", ko: "다이어리", en: "DIARY" },
  { id: "photo", ko: "사진첩", en: "PHOTO" },
  { id: "guestbook", ko: "방명록", en: "BOARD" },
  { id: "scrap", ko: "스크랩", en: "SCRAP" },
  { id: "visitor", ko: "방문자", en: "VISITOR" },
  { id: "bgm", ko: "BGM", en: "MUSIC" },
  { id: "grow", ko: "키우기", en: "GROW" },
  { id: "chat", ko: "채팅", en: "CHAT" },
];

const pad = (n: number) => String(n).padStart(2, "0");
const dateStr = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const todayStr = () => new Date().toISOString().slice(0, 10);
function ytEmbed(url: string): string | null { const m = url.match(/(?:youtu\.be\/|v=)([\w-]{11})/); return m ? `https://www.youtube.com/embed/${m[1]}` : null; }

const WALK_LINES = ["오~ 오늘 운동 좀 하는데? 💪", "영차영차 🚶", "산책 가자 🌿", "발걸음 가벼워~", "한 바퀴 더!", "제주 공기 좋다 🍃", "오늘 날씨 좋네 ☀️", "어디 가지~ 🎵", "두근두근 모험! 🗺️", "꽃 구경 중 🌼", "바다 보러 갈까 🌊", "콧노래 흥얼흥얼 🎶", "돌하르방한테 인사 🗿", "귤 따러 갈까 🍊", "뚜벅뚜벅", "나비 따라가는 중 🦋", "헥헥... 좀 쉬었다 갈까?", "오늘 만보 채우는 거야? 👀", "또 클릭이야? ㅋㅋ"];
const NAG_LINES = ["야 이제 그만하고 진짜로 나가서 걷고 와 😏", "이러다 신발창 다 닳겠어 👟", "마우스만 운동시키지 말고 너도 좀 움직여 😤", "나 어지러워!! 그만 좀 🌀", "여기 맴맴 도는 거 너야 나야?", "그만 괴롭혀 ㅠㅠ", "집콕 그만! 밖에 제주 날씨 좋대 🌞", "적당히 좀 해 이 산책 중독자야 😆", "내 다리가 무슨 죄야 😭", "스토커세요...? 😳"];
function walkLine(c: number): string | null { if (c % 3 !== 0 && Math.random() > 0.32) return null; const pool = c > 40 && Math.random() < 0.5 ? NAG_LINES : WALK_LINES; return pool[Math.floor(Math.random() * pool.length)]; }
const walkKey = () => `mh_walk_${todayStr()}`;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const fmtAfter = (ms: number) => { const d = Math.ceil(ms / 86400000); return d > 1 ? `${d}일 후` : `${Math.ceil(ms / 3600000)}시간 후`; };

export function MyMiniHome() {
  const { user, loading, signInWithGoogle } = useAuth();
  const [home, setHome] = useState<Home | null>(null);
  const [minimi, setMinimi] = useState<MiniMiKind>("hallabong");
  const [concept, setConcept] = useState<RoomConcept>("oreum");
  const [background, setBackground] = useState("");
  const [specialMinimi, setSpecialMinimi] = useState("");
  const [save, setSave] = useState<"idle" | "saving" | "saved">("idle");
  const [tab, setTab] = useState<Tab>("guestbook");
  const [decorate, setDecorate] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [decorMsg, setDecorMsg] = useState("");

  const roomRef = useRef<HTMLDivElement>(null);
  const [hostX, setHostX] = useState(50);
  const [hostY, setHostY] = useState(84);
  const [walking, setWalking] = useState(false);
  const [facing, setFacing] = useState<"left" | "right">("right");
  const [bubble, setBubble] = useState<string | null>(null);
  const [speakOpen, setSpeakOpen] = useState(false);
  const [speakText, setSpeakText] = useState("");
  const [walkSteps, setWalkSteps] = useState(0);
  const clicksRef = useRef(0);

  // 탭 데이터
  const [diary, setDiary] = useState<DiaryEntry[]>([]);
  const now = new Date();
  const [calY, setCalY] = useState(now.getFullYear());
  const [calM, setCalM] = useState(now.getMonth());
  const [selDate, setSelDate] = useState(todayStr());
  const [diaryText, setDiaryText] = useState("");
  const [gposts, setGposts] = useState<GuestPost[]>([]);
  const [ginput, setGinput] = useState("");
  const [scraps, setScraps] = useState<ScrapItem[]>([]);
  const [catFilter, setCatFilter] = useState("전체");
  const [sType, setSType] = useState<"link" | "spot">("spot");
  const [sCat, setSCat] = useState("제주");
  const [sTitle, setSTitle] = useState(""); const [sUrl, setSUrl] = useState(""); const [sAddr, setSAddr] = useState("");
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [bgmInput, setBgmInput] = useState("");
  const [loaded, setLoaded] = useState({ diary: false, gb: false, scrap: false, vis: false });

  const tok = useCallback(async () => (user ? user.getIdToken() : ""), [user]);

  useEffect(() => {
    if (!user) { setHome(null); return; }
    (async () => {
      try {
        const t = await tok();
        const r = await fetch("/api/minihome/me", { headers: { Authorization: `Bearer ${t}` } });
        const d = await r.json();
        if (r.ok) { setHome(d.home); setMinimi(d.home.minimi); setConcept(d.home.concept); setBackground(d.home.background ?? ""); setSpecialMinimi(d.home.specialMinimi ?? ""); setBgmInput(d.home.bgmUrl ?? ""); }
      } catch { /* */ }
    })();
    try { setWalkSteps(Number(localStorage.getItem(walkKey()) || 0)); } catch { /* */ }
  }, [user, tok]);

  // 탭 지연 로드
  useEffect(() => {
    if (!user) return;
    (async () => {
      const t = await tok();
      const h = { Authorization: `Bearer ${t}` };
      if (tab === "diary" && !loaded.diary) { const d = await (await fetch("/api/minihome/me/diary", { headers: h })).json(); setDiary(d.entries ?? []); setLoaded((s) => ({ ...s, diary: true })); }
      if (tab === "guestbook" && !loaded.gb) { const d = await (await fetch(`/api/minihome/u/${user.uid}/guestbook`)).json(); setGposts(d.posts ?? []); setLoaded((s) => ({ ...s, gb: true })); }
      if (tab === "scrap" && !loaded.scrap) { const d = await (await fetch("/api/minihome/me/scrap", { headers: h })).json(); setScraps(d.scraps ?? []); setLoaded((s) => ({ ...s, scrap: true })); }
      if (tab === "visitor" && !loaded.vis) { const d = await (await fetch("/api/minihome/me/visitors", { headers: h })).json(); setVisitors(d.visitors ?? []); setLoaded((s) => ({ ...s, vis: true })); }
    })();
  }, [tab, user, tok, loaded]);

  const onRoomClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rr = roomRef.current?.getBoundingClientRect(); if (!rr) return;
    const x = Math.max(6, Math.min(((e.clientX - rr.left) / rr.width) * 100, 94));
    const y = Math.max(34, Math.min(((e.clientY - rr.top) / rr.height) * 100, 95));
    const steps = Math.max(1, Math.round(Math.hypot(x - hostX, y - hostY) * 1.5));
    setWalkSteps((s) => { const n = s + steps; try { localStorage.setItem(walkKey(), String(n)); } catch { /* */ } return n; });
    setFacing(x > hostX ? "right" : "left"); setHostX(x); setHostY(y); setWalking(true);
    window.setTimeout(() => setWalking(false), 1120);
    clicksRef.current += 1; const line = walkLine(clicksRef.current);
    if (line) { setBubble(line); window.setTimeout(() => setBubble(null), 2600); }
  }, [hostX, hostY]);

  const speak = useCallback(() => { const v = speakText.trim(); if (!v) return; setBubble(v); window.setTimeout(() => setBubble(null), 2600); setSpeakText(""); setSpeakOpen(false); track("minihome_speak", { own: true }); }, [speakText]);

  const pickMinimi = (k: MiniMiKind) => { setMinimi(k); setSpecialMinimi(""); setDirty(true); setDecorMsg(""); };
  const pickConcept = (c: RoomConcept) => { setConcept(c); setDirty(true); setDecorMsg(""); };
  const pickBackground = (bg: string) => { setBackground(bg); setDirty(true); setDecorMsg(""); };
  const pickSpecialMinimi = (id: string) => { setSpecialMinimi(id); setDirty(true); setDecorMsg(""); };

  const saveDecor = useCallback(async () => {
    if (!user) return; setSave("saving"); setDecorMsg("");
    try {
      const t = await tok();
      const r = await fetch("/api/minihome/me", { method: "PATCH", headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" }, body: JSON.stringify({ minimi, concept, background, specialMinimi }) });
      const d = await r.json();
      if (r.status === 429) { setSave("idle"); setDecorMsg(`주 1회만 변경 가능 — 다음 변경 ${d.nextChangeAt ? fmtAfter(d.nextChangeAt - Date.now()) : ""}`); return; }
      if (!r.ok) throw new Error();
      setHome(d.home); setDirty(false); track("minihome_equip", { minimi, concept });
      setSave("saved"); window.setTimeout(() => setSave("idle"), 1800);
    } catch { setSave("idle"); }
  }, [user, tok, minimi, concept, background, specialMinimi]);

  const uploadImage = useCallback(async (file: File, endpoint: "upload-bg" | "photo") => {
    if (!user || !file) return null;
    const dataUrl = await new Promise<string>((res, rej) => {
      const rd = new FileReader();
      rd.onload = () => { const img = new Image(); img.onload = () => { const max = 1280, sc = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement("canvas"); c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc); c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL("image/jpeg", 0.85)); }; img.onerror = rej; img.src = rd.result as string; }; rd.onerror = rej; rd.readAsDataURL(file);
    });
    const t = await tok();
    const r = await fetch(`/api/minihome/me/${endpoint}`, { method: "POST", headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" }, body: JSON.stringify({ imageBase64: dataUrl }) });
    return r.ok ? r.json() : null;
  }, [user, tok]);

  const uploadBg = useCallback(async (file: File) => { setSave("saving"); const d = await uploadImage(file, "upload-bg"); if (d) { setHome((h) => (h ? { ...h, customBgUrl: d.url, background: "bg-custom" } : h)); setBackground("bg-custom"); setSave("saved"); window.setTimeout(() => setSave("idle"), 1600); } else setSave("idle"); }, [uploadImage]);
  const uploadPhoto = useCallback(async (file: File) => { const d = await uploadImage(file, "photo"); if (d?.photos) { setHome((h) => (h ? { ...h, photos: d.photos } : h)); track("minihome_photo_add", {}); } }, [uploadImage]);

  const addDiary = async () => { const v = diaryText.trim(); if (!v) return; setDiaryText(""); const t = await tok(); const r = await fetch("/api/minihome/me/diary", { method: "POST", headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" }, body: JSON.stringify({ date: selDate, text: v }) }); const d = await r.json(); if (d.entry) setDiary((p) => [d.entry, ...p]); };
  const addGuest = async () => { const v = ginput.trim(); if (!v || !user) return; setGinput(""); const t = await tok(); const r = await fetch(`/api/minihome/u/${user.uid}/guestbook`, { method: "POST", headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" }, body: JSON.stringify({ text: v }) }); const d = await r.json(); if (d.post) setGposts((p) => [d.post, ...p]); };
  const addScrapItem = async () => { const t0 = sTitle.trim(); if (!t0 && !sUrl.trim() && !sAddr.trim()) return; const body = { type: sType, category: sCat.trim() || "제주", title: t0, url: sType === "link" ? sUrl : "", address: sType === "spot" ? sAddr : "" }; setSTitle(""); setSUrl(""); setSAddr(""); const t = await tok(); const r = await fetch("/api/minihome/me/scrap", { method: "POST", headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" }, body: JSON.stringify(body) }); const d = await r.json(); if (d.item) setScraps((p) => [d.item, ...p]); };
  const saveBgm = async () => { const t = await tok(); await fetch("/api/minihome/me/bgm", { method: "POST", headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" }, body: JSON.stringify({ url: bgmInput }) }); setHome((h) => (h ? { ...h, bgmUrl: bgmInput } : h)); };

  const room = ROOM_CONCEPTS[concept];
  const cooldownLeft = home?.decorSavedAt ? home.decorSavedAt + WEEK_MS - Date.now() : 0;
  const onCooldown = cooldownLeft > 0;
  const ownedBg = SHOP_ITEMS.filter((i) => i.category === "background" && i.asset && home?.ownedItems?.includes(i.id));
  const ownedSpecialMinimi = SHOP_ITEMS.filter((i) => i.category === "minimi" && i.asset && home?.ownedItems?.includes(i.id));
  const ownsCustomBg = home?.ownedItems?.includes("bg-custom");
  const bgImage = background === "bg-custom" ? (home?.customBgUrl || room.bgImage) : (background && SHOP_ITEMS.find((i) => i.id === background)?.asset) || room.bgImage;
  const customSprite = specialMinimi ? SHOP_ITEMS.find((i) => i.id === specialMinimi)?.asset : undefined;
  const photos = home?.photos ?? [];
  const diaryByDate = useMemo(() => { const m: Record<string, DiaryEntry[]> = {}; for (const e of diary) (m[e.date] ??= []).push(e); return m; }, [diary]);
  const firstDow = new Date(calY, calM, 1).getDay();
  const daysIn = new Date(calY, calM + 1, 0).getDate();
  const selEntries = diaryByDate[selDate] ?? [];
  const scrapCats = useMemo(() => Array.from(new Set(scraps.map((s) => s.category))), [scraps]);
  const filteredScraps = catFilter === "전체" ? scraps : scraps.filter((s) => s.category === catFilter);
  const embed = home?.bgmUrl ? ytEmbed(home.bgmUrl) : null;

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

  const chip = (active: boolean): React.CSSProperties => ({ fontSize: 12, padding: "5px 10px", borderRadius: 6, cursor: "pointer", border: active ? "2px solid #ff7aa2" : "1px solid #e3d9c2", background: active ? "#ffeef4" : "#fff", color: "#5a4a32" });

  return (
    <div className="mh-page" style={{ background: room.pageBg, ["--accent" as string]: room.accent, ["--soft" as string]: room.accentSoft }}>
      <style>{`
        .mh-page{min-height:100vh;padding:18px;font-family:'Dotum','Apple SD Gothic Neo',sans-serif;color:#3a332a;transition:background .4s;}
        .mh-top{max-width:1180px;margin:0 auto 10px;display:flex;justify-content:space-between;align-items:center;color:#fff;font-size:13px;gap:10px;flex-wrap:wrap;}
        .mh-wrap{max-width:1180px;margin:0 auto;display:flex;gap:12px;align-items:flex-start;}
        .mh-profile{width:190px;flex:none;}
        .mh-book{flex:1;min-width:0;background:#fffdf6;border:1px solid #e3d9c2;border-radius:12px;padding:14px;}
        .mh-menu{width:90px;flex:none;display:flex;flex-direction:column;gap:6px;}
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
        @media(max-width:860px){.mh-wrap{flex-direction:column;}.mh-profile,.mh-book,.mh-menu{width:100%;}.mh-menu{flex-direction:row;flex-wrap:wrap;}.mh-menu .mh-tab{flex:1 1 22%;flex-direction:row;gap:5px;}}
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
          <div style={{ background: "#fffdf6", border: "1px solid #e3d9c2", borderRadius: 10, padding: 10 }}>
            <div className="mh-card-h">MY PROFILE</div>
            <div style={{ border: "1px solid #e3d9c2", background: bgImage ? `center/cover no-repeat url(${bgImage})` : "#eef3e6", borderRadius: 8, height: 120, display: "flex", alignItems: "flex-end", justifyContent: "center", overflow: "hidden" }}>
              <MiniMi kind={minimi} scale={0.9} customSprite={customSprite} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6 }}>{home?.displayName ?? "여행자"} {MINIMI[minimi].emoji}</div>
            <div style={{ fontSize: 11, color: "#8a7a5a", marginTop: 2 }}>Lv.{home?.level ?? 1} 제주 여행자</div>
            <div style={{ display: "flex", gap: 6, marginTop: 8, fontSize: 11, textAlign: "center" }}>
              <div style={{ flex: 1, background: "#fff", border: "1px solid #e3d9c2", borderRadius: 5, padding: "5px 0" }}>보말<br /><b style={{ color: "#e0890a" }}>{(home?.bomal ?? 0).toLocaleString()}</b></div>
              <div style={{ flex: 1, background: "#fff", border: "1px solid #e3d9c2", borderRadius: 5, padding: "5px 0" }}>보유템<br /><b style={{ color: "var(--accent)" }}>{home?.ownedItems?.length ?? 0}</b></div>
            </div>
            <div className="mh-card-h" style={{ marginTop: 8 }}>HISTORY</div>
            <button onClick={() => setTab("diary")} style={{ all: "unset", cursor: "pointer", display: "block", width: "100%" }}><div className="mh-row"><span>📖 다이어리</span><span>{diary.length}</span></div></button>
            <button onClick={() => setTab("photo")} style={{ all: "unset", cursor: "pointer", display: "block", width: "100%" }}><div className="mh-row"><span>📷 사진첩</span><span>{photos.length}</span></div></button>
            <button onClick={() => setTab("guestbook")} style={{ all: "unset", cursor: "pointer", display: "block", width: "100%" }}><div className="mh-row"><span>💬 방명록</span><span>{gposts.length}</span></div></button>
          </div>
        </div>

        {/* 중앙 */}
        <div className="mh-book">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10 }}>
            <div><div className="mh-title">{home?.displayName ?? "My"} Minihome</div><div style={{ fontSize: 9, letterSpacing: 2, color: "#b0a486" }}>WELCOME TO MY MINIHOME</div></div>
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
            <div style={{ background: "#fffdf6", border: "1px solid #e3d9c2", borderRadius: 10, padding: 10, marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><span className="mh-card-h" style={{ border: 0, margin: 0 }}>🎨 꾸미기</span><span style={{ fontSize: 10, color: "#b0a486" }}>주 1회 변경 가능</span></div>
              <div style={{ fontSize: 11, color: "#8a7a5a", margin: "6px 0 4px" }}>방 컨셉</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{ROOM_ORDER.map((c) => <button key={c} onClick={() => pickConcept(c)} style={chip(concept === c)}>{ROOM_CONCEPTS[c].emoji} {ROOM_CONCEPTS[c].label}</button>)}</div>
              <div style={{ fontSize: 11, color: "#8a7a5a", margin: "10px 0 4px" }}>미니미</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {MINIMI_ORDER.map((k) => <button key={k} onClick={() => pickMinimi(k)} style={chip(!specialMinimi && minimi === k)}>{MINIMI[k].emoji} {MINIMI[k].label}</button>)}
                {ownedSpecialMinimi.map((i) => <button key={i.id} onClick={() => pickSpecialMinimi(i.id)} style={chip(specialMinimi === i.id)}>{i.emoji} {i.name}</button>)}
              </div>
              {(ownedBg.length > 0 || ownsCustomBg) && (
                <>
                  <div style={{ fontSize: 11, color: "#8a7a5a", margin: "10px 0 4px" }}>보유 배경</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    <button onClick={() => pickBackground("")} style={chip(!background)}>{room.emoji} 기본</button>
                    {ownedBg.map((i) => <button key={i.id} onClick={() => pickBackground(i.id)} style={chip(background === i.id)}>{i.emoji} {i.name}</button>)}
                    {ownsCustomBg && home?.customBgUrl && <button onClick={() => pickBackground("bg-custom")} style={chip(background === "bg-custom")}>📷 내 사진</button>}
                    {ownsCustomBg && <label style={{ fontSize: 12, padding: "5px 10px", borderRadius: 6, cursor: "pointer", border: "1px dashed #cbb890", background: "#fbf6ea", color: "#8a7a5a" }}>⬆ 배경사진<input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadBg(f); e.target.value = ""; }} /></label>}
                  </div>
                </>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, borderTop: "1px dashed #e3d9c2", paddingTop: 10 }}>
                <button onClick={saveDecor} disabled={!dirty || save === "saving" || onCooldown} style={{ background: !dirty || onCooldown ? "#e8e2d4" : "var(--accent)", color: !dirty || onCooldown ? "#9a8" : "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: !dirty || onCooldown ? "default" : "pointer" }}>{save === "saving" ? "저장 중..." : save === "saved" ? "✓ 저장됨" : "💾 저장"}</button>
                <span style={{ fontSize: 11, color: decorMsg ? "#c0392b" : "#a89878" }}>{decorMsg || (onCooldown ? `다음 변경 ${fmtAfter(cooldownLeft)} 가능` : dirty ? "변경사항을 저장하세요" : "주 1회 변경 가능 · 무제한은 곧 유료")}</span>
              </div>
            </div>
          )}

          {/* 미니룸 (상단 고정) */}
          <div ref={roomRef} onClick={onRoomClick} style={{ position: "relative", height: 320, border: "1px solid #d8cba8", borderRadius: 8, overflow: "hidden", cursor: "pointer", background: bgImage ? `center/cover no-repeat url(${bgImage}), ${room.bg}` : room.bg }}>
            <div style={{ position: "absolute", left: `${hostX}%`, top: `${hostY}%`, transform: `translate(-50%,-100%) ${walking ? "translateY(-4px)" : ""}`, transition: "left 1.1s linear, top 1.1s linear", zIndex: 3 }}>
              <MiniMi kind={minimi} name={home?.displayName ?? "나"} pose={walking ? "side" : "front"} flip={walking && facing === "right"} customSprite={customSprite} />
            </div>
            {bubble && <div style={{ position: "absolute", left: `${hostX}%`, top: `${hostY}%`, transform: "translate(-50%,-260%)", fontSize: 12, background: "#fffae0", border: "1px solid #e8d77a", borderRadius: 10, padding: "5px 9px", zIndex: 5, whiteSpace: "nowrap" }}>{bubble}</div>}
            <div style={{ position: "absolute", left: 8, bottom: 6, fontSize: 10, color: "#7a6a48", background: "rgba(255,255,255,.6)", borderRadius: 4, padding: "0 4px" }}>아무 곳이나 클릭→미니미 이동 🚶</div>
          </div>
          <div style={{ marginTop: 6, textAlign: "center", fontSize: 12, color: "#6a5e48" }}>오늘 🥾 <b style={{ color: room.accent }}>{walkSteps.toLocaleString()}</b>보 걸었어요{walkSteps > 300 ? " · 오늘 많이 걸었네! 😆" : walkSteps > 100 ? " · 운동 좀 하는데? 💪" : ""}</div>

          {/* 탭 내용 */}
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
                  {Array.from({ length: daysIn }).map((_, i) => { const ds = dateStr(calY, calM, i + 1); const has = !!diaryByDate[ds]; const sel = ds === selDate; return <div key={ds} className="d" onClick={() => setSelDate(ds)} style={{ background: sel ? "var(--accent)" : has ? "var(--soft)" : "#fff", color: sel ? "#fff" : "#5a4a32", border: "1px solid #eee5d4" }}>{i + 1}{has && <span style={{ fontSize: 8, color: sel ? "#fff" : "var(--accent)" }}>●</span>}</div>; })}
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
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div className="mh-card-h" style={{ border: 0, margin: 0 }}>📷 사진첩 ({photos.length})</div>
                  <label className="mh-btn" style={{ background: "var(--accent)", color: "#fff" }}>+ 사진 추가<input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); e.target.value = ""; }} /></label>
                </div>
                {photos.length === 0 ? <p style={{ fontSize: 12, color: "#a89878", padding: "20px 0", textAlign: "center" }}>사진을 추가해보세요!</p> : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(110px,1fr))", gap: 8 }}>{photos.map((src, i) => <div key={i} style={{ aspectRatio: "1", borderRadius: 8, background: `center/cover no-repeat url(${src})`, border: "1px solid #e3d9c2" }} />)}</div>
                )}
              </div>
            )}

            {tab === "guestbook" && (
              <div>
                <div className="mh-card-h" style={{ color: "#c44b73", borderColor: "#ffd6e2" }}>💬 방명록 (일촌평)</div>
                <div style={{ fontSize: 12, lineHeight: 1.7, minHeight: 60 }}>{gposts.length === 0 ? <p style={{ color: "#a89878", padding: "16px 0", textAlign: "center" }}>첫 방명록을 남겨보세요! ✍️</p> : gposts.map((p, i) => <div key={i} style={{ borderBottom: "1px dashed #eee", padding: "3px 0" }}><b style={{ color: "var(--accent)" }}>{p.name}</b> {p.text}</div>)}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <input value={ginput} onChange={(e) => setGinput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addGuest(); }} placeholder="방명록 남기기..." style={{ flex: 1, fontSize: 12, height: 32, border: "1px solid #e3d9c2", borderRadius: 7, padding: "0 8px", background: "#fff" }} />
                  <button className="mh-btn" onClick={addGuest} style={{ background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }}>등록</button>
                </div>
              </div>
            )}

            {tab === "scrap" && (
              <div>
                <div className="mh-card-h">⭐ 스크랩 (즐겨찾기 · 스팟)</div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
                  <button className={`mh-chip${catFilter === "전체" ? " on" : ""}`} onClick={() => setCatFilter("전체")}>전체</button>
                  {scrapCats.map((c) => <button key={c} className={`mh-chip${catFilter === c ? " on" : ""}`} onClick={() => setCatFilter(c)}>{c}</button>)}
                </div>
                <div style={{ fontSize: 12, minHeight: 50 }}>{filteredScraps.length === 0 ? <p style={{ color: "#a89878", padding: "12px 0", textAlign: "center" }}>좋아하는 곳·링크를 스크랩해보세요! 🔖</p> : filteredScraps.map((s) => (
                  <div key={s.id} style={{ borderBottom: "1px dashed #eee", padding: "5px 0", display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 9, background: "var(--soft)", color: "var(--accent)", borderRadius: 5, padding: "1px 6px", flex: "none" }}>{s.category}</span>
                    {s.type === "link" && s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "none" }}>🔗 {s.title}</a> : <span>📍 {s.title}{s.address ? <span style={{ color: "#a89878" }}> · {s.address}</span> : null}</span>}
                  </div>
                ))}</div>
                <div style={{ border: "1px solid #eee5d4", borderRadius: 8, padding: 9, marginTop: 10 }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 7 }}>
                    <button className="mh-chip" onClick={() => setSType("spot")} style={sType === "spot" ? { background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" } : undefined}>📍 스팟</button>
                    <button className="mh-chip" onClick={() => setSType("link")} style={sType === "link" ? { background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" } : undefined}>🔗 링크</button>
                    <input value={sCat} onChange={(e) => setSCat(e.target.value)} list="mh-cats2" placeholder="카테고리" style={{ flex: 1, fontSize: 12, height: 30, border: "1px solid #e3d9c2", borderRadius: 7, padding: "0 8px", background: "#fff" }} />
                    <datalist id="mh-cats2">{["제주", "강원도", "서울", "부산", ...scrapCats].map((c) => <option key={c} value={c} />)}</datalist>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input value={sTitle} onChange={(e) => setSTitle(e.target.value)} placeholder="이름/제목" style={{ width: 110, fontSize: 12, height: 30, border: "1px solid #e3d9c2", borderRadius: 7, padding: "0 8px", background: "#fff" }} />
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
                <div className="mh-card-h">👣 방문자 ({visitors.length})</div>
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

            {tab === "grow" && <GrowPanel accent={room.accent} onProgress={(p) => setHome((h) => (h ? { ...h, xp: p.xp, level: p.level, bomal: p.bomal } : h))} />}
            {tab === "chat" && user && <ChatRoom ownerUid={user.uid} accent={room.accent} />}
          </div>
        </div>

        {/* 우: 메뉴 */}
        <div className="mh-menu">
          {MENU.map((t) => <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`mh-tab${tab === t.id ? " on" : ""}`}><b>{t.ko}</b><span>{t.en}</span></button>)}
        </div>
      </div>
    </div>
  );
}
