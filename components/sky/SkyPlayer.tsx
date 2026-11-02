"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  id: string;
  name: string;
  sub: string;
  /** "jejusi": 재생 직전에 /api/sky/jejusi/[id] 로 1분짜리 토큰 주소를 받는다. "hls": url 그대로 재생 */
  kind: "jejusi" | "hls";
  url?: string;
  /** 재생이 끝내 안 될 때 보여 줄 제공기관 공식 페이지 */
  officialUrl?: string;
  credit: string;
};

type Status = "loading" | "playing" | "error";
const MAX_ATTEMPTS = 3;

export function SkyPlayer({ id, name, sub, kind, url, officialUrl, credit }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<import("hls.js").default | null>(null);
  const attemptsRef = useRef(0);
  const [status, setStatus] = useState<Status>("loading");
  const [clock, setClock] = useState("");
  const [run, setRun] = useState(0);

  const resolveUrl = useCallback(async (): Promise<string | null> => {
    if (kind === "hls") return url ?? null;
    const res = await fetch(`/api/sky/jejusi/${encodeURIComponent(id)}`, { cache: "no-store" }).catch(() => null);
    if (!res || !res.ok) return null;
    const data = (await res.json().catch(() => null)) as { url?: string } | null;
    return data?.url ?? null;
  }, [id, kind, url]);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const p = (n: number) => String(n).padStart(2, "0");
      setClock(`${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}  ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") window.close(); };
    window.addEventListener("keydown", onKey);
    return () => { clearInterval(t); window.removeEventListener("keydown", onKey); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const video = videoRef.current;
    if (!video) return;

    const fail = () => {
      if (cancelled) return;
      attemptsRef.current += 1;
      if (attemptsRef.current < MAX_ATTEMPTS) setRun((n) => n + 1); // 새 토큰으로 다시
      else setStatus("error");
    };

    (async () => {
      setStatus("loading");
      const src = await resolveUrl();
      if (cancelled) return;
      if (!src) return fail();

      const Hls = (await import("hls.js")).default;
      if (cancelled) return;
      if (Hls.isSupported()) {
        const hls = new Hls({ liveSyncDurationCount: 2, maxBufferLength: 20, manifestLoadingMaxRetry: 2, fragLoadingMaxRetry: 4 });
        hlsRef.current = hls;
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(() => {}); });
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (!data.fatal) return;
          hls.destroy();
          hlsRef.current = null;
          fail();
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
        video.addEventListener("error", fail, { once: true });
        video.play().catch(() => {});
      } else {
        setStatus("error");
      }
    })();

    const onPlaying = () => { attemptsRef.current = 0; setStatus("playing"); };
    video.addEventListener("playing", onPlaying);
    return () => {
      cancelled = true;
      video.removeEventListener("playing", onPlaying);
      hlsRef.current?.destroy();
      hlsRef.current = null;
      video.removeAttribute("src");
      video.load();
    };
  }, [resolveUrl, run]);

  const retry = () => { attemptsRef.current = 0; setRun((n) => n + 1); };

  return (
    <div className="sky-root fixed inset-0 flex flex-col bg-[#03050A] text-[#E8EEFF]">
      <header className="flex items-center justify-between gap-4 border-b border-white/5 px-5 py-3">
        <div className="flex min-w-0 items-baseline gap-3">
          <h1 className="sky-serif truncate text-xl font-extrabold text-[#F6F8FF]">{name}</h1>
          <span className="truncate text-xs text-[#93A0C4]">{sub}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="sky-mono hidden items-center gap-2 text-[11px] tracking-[0.16em] text-[#93A0C4] sm:flex">
            <span className={`h-2 w-2 rounded-full ${status === "playing" ? "sky-pulse bg-[#7CF0C8]" : "bg-[#5D6A8E]"}`} />
            {status === "playing" ? "LIVE" : status === "loading" ? "CONNECTING" : "OFFLINE"}
          </span>
          <span className="sky-mono hidden text-[11px] tracking-[0.08em] text-[#6F7BA0] md:inline">{clock}</span>
          <button
            type="button"
            aria-label="창 닫기"
            onClick={() => window.close()}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-[#E8EEFF] hover:border-white/40"
          >
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M2 2l10 10M12 2L2 12" /></svg>
          </button>
        </div>
      </header>

      <div className="relative flex flex-1 items-center justify-center bg-black">
        <video ref={videoRef} className="h-full w-full object-contain" autoPlay muted playsInline controls={status === "playing"} />
        {status !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 text-center">
            {status === "loading" ? (
              <>
                <span className="sky-spin h-11 w-11 rounded-full border-[1.5px] border-[#2A3039] border-t-[#7CF0C8]" />
                <span className="sky-mono text-xs tracking-[0.2em] text-[#6E7684]">신호 수신 중</span>
              </>
            ) : (
              <>
                <span className="sky-serif text-2xl font-extrabold text-[#F6F8FF]">지금은 영상이 들어오지 않아요</span>
                <span className="max-w-md text-sm leading-relaxed text-[#93A0C4]">제공기관 쪽 송출이 잠시 멈췄을 수 있어요. 잠시 뒤 다시 연결해 보세요.</span>
                <div className="flex flex-wrap justify-center gap-2">
                  <button type="button" onClick={retry} className="h-11 rounded-full bg-[#F6F8FF] px-5 text-sm font-medium text-[#03050A]">다시 연결</button>
                  {officialUrl && (
                    <a href={officialUrl} className="inline-flex h-11 items-center rounded-full border border-[#A9C0FF] px-5 text-sm text-[#E8EEFF]">공식 페이지에서 보기 ↗</a>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 px-5 py-2.5 text-[11px] text-[#6F7BA0]">
        <span>영상 제공 · {credit}</span>
        <span>FunJeju는 영상을 저장하지 않습니다 · ESC로 닫기</span>
      </footer>
    </div>
  );
}
