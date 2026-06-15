"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getEntitlements } from "@/lib/entitlements";
import { listBgm, uploadBgm, deleteBgm, type BgmTrack } from "@/lib/bgm";

/** CCTV 화면 배경음악(BGM) 플레이어 — 내 MP3 업로드/재생. 업로드 곡수는 요금제 제한. */
export function BgmPlayer() {
  const { user, signInWithGoogle } = useAuth();
  const ent = getEntitlements({ loggedIn: !!user });
  const bgmMax = ent.limits.bgmMax; // -1 = 무제한

  const [open, setOpen] = useState(false);
  const [tracks, setTracks] = useState<BgmTrack[]>([]);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [vol, setVol] = useState(0.6);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    if (!user) { setTracks([]); return; }
    try { setTracks(await listBgm(user.uid)); } catch { /* ignore */ }
  }, [user]);
  useEffect(() => { load(); }, [load]);

  // 현재 트랙 재생
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = vol;
    if (playing && tracks[idx]) { a.play().catch(() => setPlaying(false)); }
    else a.pause();
  }, [playing, idx, tracks, vol]);

  const atLimit = bgmMax !== -1 && tracks.length >= bgmMax;

  async function onUpload(file: File | null) {
    if (!file) return;
    if (!user) { setMsg("로그인하고 내 음악을 올려보세요"); return; }
    if (!file.type.startsWith("audio/")) { setMsg("MP3 등 오디오 파일만 가능해요"); return; }
    if (atLimit) { setMsg(`무료는 ${bgmMax}곡까지예요. 더 올리려면 업그레이드`); return; }
    setUploading(true); setMsg("");
    try { await uploadBgm(user.uid, file); await load(); }
    catch { setMsg("업로드 실패"); }
    finally { setUploading(false); }
  }

  async function remove(t: BgmTrack) {
    if (!user) return;
    await deleteBgm(user.uid, t);
    load();
  }

  const cur = tracks[idx];
  const next = () => { if (tracks.length) setIdx((i) => (i + 1) % tracks.length); };
  const prev = () => { if (tracks.length) setIdx((i) => (i - 1 + tracks.length) % tracks.length); };

  return (
    <>
      {/* 오디오 엘리먼트 */}
      <audio
        ref={audioRef}
        src={cur?.url}
        onEnded={next}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      {/* 토글 버튼 (좌하단) */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`fixed bottom-24 left-4 z-40 flex h-11 w-11 items-center justify-center rounded-full shadow-soft transition-colors md:bottom-6 ${playing ? "bg-brand-orange text-white animate-pulse" : "bg-bg-card text-brand-navy border border-border-soft"}`}
        title="배경음악"
      >
        🎵
      </button>

      {/* 패널 */}
      {open && (
        <div className="fixed bottom-36 left-4 z-40 w-72 rounded-2xl border border-border-soft bg-bg-card p-3 shadow-card md:bottom-20">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-black text-text-primary">🎵 배경음악</p>
            <span className="text-[10px] text-text-secondary">{tracks.length}{bgmMax === -1 ? "" : `/${bgmMax}`}곡</span>
          </div>

          {/* 현재 곡 + 컨트롤 */}
          <div className="rounded-xl bg-bg-secondary p-2.5">
            <p className="truncate text-[12px] font-bold text-text-primary">{cur ? cur.name : "곡을 추가해주세요"}</p>
            <div className="mt-2 flex items-center justify-center gap-3">
              <button onClick={prev} disabled={!tracks.length} className="text-lg disabled:opacity-30">⏮</button>
              <button onClick={() => setPlaying((p) => !p)} disabled={!cur} className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-navy text-white disabled:opacity-30">{playing ? "⏸" : "▶"}</button>
              <button onClick={next} disabled={!tracks.length} className="text-lg disabled:opacity-30">⏭</button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px]">🔈</span>
              <input type="range" min={0} max={1} step={0.05} value={vol} onChange={(e) => setVol(Number(e.target.value))} className="flex-1 accent-brand-orange" />
            </div>
          </div>

          {/* 목록 */}
          <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
            {tracks.map((t, i) => (
              <div key={t.id} className={`flex items-center gap-2 rounded-lg px-2 py-1 text-[11px] ${i === idx ? "bg-brand-orange/10" : ""}`}>
                <button onClick={() => { setIdx(i); setPlaying(true); }} className="min-w-0 flex-1 truncate text-left font-semibold text-text-primary hover:text-brand-orange">{i === idx && playing ? "♪ " : ""}{t.name}</button>
                <button onClick={() => remove(t)} className="shrink-0 text-text-secondary/50 hover:text-live-red">✕</button>
              </div>
            ))}
          </div>

          {/* 업로드 */}
          <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={(e) => onUpload(e.target.files?.[0] ?? null)} />
          {user ? (
            <button
              onClick={() => (atLimit ? setMsg(`무료는 ${bgmMax}곡까지예요. 더 올리려면 업그레이드`) : fileRef.current?.click())}
              disabled={uploading}
              className={`mt-2 w-full rounded-full py-2 text-xs font-bold ${atLimit ? "bg-bg-secondary text-text-secondary" : "bg-brand-orange text-white"} disabled:opacity-50`}
            >
              {uploading ? "올리는 중…" : atLimit ? `🔒 ${bgmMax}곡 꽉 참` : "＋ 내 음악(MP3) 추가"}
            </button>
          ) : (
            <button onClick={signInWithGoogle} className="mt-2 w-full rounded-full bg-brand-navy py-2 text-xs font-bold text-white">로그인하고 내 음악 올리기</button>
          )}
          {msg && <p className="mt-1.5 text-[10px] font-bold text-brand-orange">{msg}</p>}
        </div>
      )}
    </>
  );
}
