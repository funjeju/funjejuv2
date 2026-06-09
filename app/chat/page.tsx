"use client";

import { useState, useRef, useEffect } from "react";
import { DolmangyiIcon } from "@/components/common/DolmangyiIcon";

const SUGGESTIONS = [
  { label: "성산 흑돼지 맛집 추천",    emoji: "🍽️" },
  { label: "애월 카페 추천해줘",       emoji: "☕" },
  { label: "협재 근처 가볼 곳",       emoji: "🏖️" },
  { label: "한라산 코스 추천",         emoji: "⛰️" },
  { label: "노을 명소 추천",          emoji: "🌅" },
  { label: "비 오는 날 가볼 곳",       emoji: "🌧️" },
];

type Message = { role: "user" | "model"; text: string };
type GPS = { lat: number; lng: number } | null;

const INITIAL: Message[] = [
  {
    role: "model",
    text: "안녕! 제주 여행 도슨트 돌맹이야.\n\n🍽️ 도민맛집 + 🏞️ 가볼만한 곳을 함께 추천해줄게.\n지역명이나 메뉴를 알려주면 더 정확해!",
  },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(INITIAL);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [gps,      setGps]      = useState<GPS>(null);
  const [gpsState, setGpsState] = useState<"idle" | "asking" | "ok" | "outside" | "denied">("idle");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // 자동 스크롤
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // 제주 바운딩 박스
  const isInJeju = (lat: number, lng: number) =>
    lat >= 33.10 && lat <= 33.65 && lng >= 126.10 && lng <= 127.00;

  // 마운트 시 GPS 요청
  useEffect(() => {
    if (!navigator.geolocation) { setGpsState("denied"); return; }
    setGpsState("asking");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        console.log("[GPS]", { lat: latitude, lng: longitude, accuracy });
        if (accuracy > 10000) {
          setGpsState("denied");
          return;
        }
        setGps({ lat: latitude, lng: longitude });
        setGpsState("ok");
      },
      () => setGpsState("denied"),
      { timeout: 8000, maximumAge: 0, enableHighAccuracy: true }
    );
  }, []);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", text };
    const history = [...messages, userMsg];
    setMessages([...history, { role: "model", text: "" }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, lat: gps?.lat, lng: gps?.lng }),
      });

      if (!res.ok || !res.body) throw new Error(`API error: ${res.status}`);

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const { text: chunk, error } = JSON.parse(data) as { text?: string; error?: string };
            if (error) throw new Error(error);
            if (chunk) {
              accumulated += chunk;
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = { role: "model", text: accumulated };
                return next;
              });
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "model", text: "잠깐 문제가 생겼어! 다시 물어봐줄래? 😅" };
        return next;
      });
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-3.5rem)] max-w-2xl flex-col md:h-[calc(100dvh-1rem)] md:py-6">

      {/* 헤더 */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border-soft bg-bg-card px-4 py-4 md:rounded-t-2xl">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-yellow/20"><DolmangyiIcon size={36} /></div>
        <div className="flex-1">
          <p className="text-sm font-bold text-text-primary">AI 도슨트 돌맹이</p>
          <p className="flex items-center gap-1.5 text-[11px]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-jeju-green animate-pulse" />
            <span className="text-jeju-green">온라인</span>
            {/* GPS 상태 표시 */}
            {gpsState === "ok" && gps && (
              <span className="ml-1 rounded-full bg-jeju-green/10 px-2 py-0.5 text-[10px] font-bold text-jeju-green">
                📍 {gps.lat.toFixed(4)}, {gps.lng.toFixed(4)}
              </span>
            )}
            {gpsState === "asking" && (
              <span className="ml-1 text-[10px] text-text-secondary">위치 확인 중...</span>
            )}
            {gpsState === "denied" && (
              <span className="ml-1 rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-medium text-yellow-700">
                위치 없음
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMessages(INITIAL)}
          className="rounded-full border border-border-soft bg-bg-secondary px-3 py-1.5 text-[11px] font-semibold text-text-secondary hover:bg-bg-primary transition-colors"
        >
          새 대화
        </button>
      </div>

      {/* GPS 허용 유도 배너 (denied 상태) */}
      {gpsState === "denied" && (
        <div className="shrink-0 flex items-center gap-2 bg-yellow-50 border-b border-yellow-200 px-4 py-2">
          <span className="text-sm">📍</span>
          <p className="flex-1 text-[11px] text-yellow-800">
            위치를 허용하면 근처 장소를 추천받을 수 있어요
          </p>
          <button
            type="button"
            onClick={() => {
              setGpsState("asking");
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  const { latitude, longitude, accuracy } = pos.coords;
                  console.log("[GPS]", { lat: latitude, lng: longitude, accuracy });
                  if (accuracy > 10000) { setGpsState("denied"); return; }
                  setGps({ lat: latitude, lng: longitude });
                  setGpsState("ok");
                },
                () => setGpsState("denied"),
                { timeout: 8000, maximumAge: 0, enableHighAccuracy: true }
              );
            }}
            className="rounded-full bg-yellow-500 px-2.5 py-1 text-[10px] font-bold text-white"
          >
            허용하기
          </button>
        </div>
      )}

      {/* 메시지 목록 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-bg-primary px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            {msg.role === "model" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-yellow/20"><DolmangyiIcon size={28} /></div>
            )}
            <div
              className={[
                "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                msg.role === "model"
                  ? "rounded-tl-none bg-bg-card border border-border-soft text-text-primary shadow-card"
                  : "rounded-tr-none bg-brand-navy text-white",
              ].join(" ")}
            >
              {msg.text || (loading && i === messages.length - 1 ? "" : "　")}
              {msg.role === "model" && loading && i === messages.length - 1 && (
                <span className="inline-block w-1.5 h-4 bg-text-primary/40 animate-pulse rounded-sm ml-0.5 align-middle" />
              )}
            </div>
          </div>
        ))}

        {/* 초기 제안 칩 */}
        {messages.length === 1 && !loading && (
          <div className="grid grid-cols-2 gap-2 pl-10">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => sendMessage(s.label)}
                className="rounded-xl border border-border-soft bg-bg-card px-3 py-2.5 text-left text-xs font-medium text-text-primary hover:bg-bg-secondary transition-colors shadow-card"
              >
                <span className="mr-1">{s.emoji}</span>{s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 입력창 */}
      <div className="shrink-0 border-t border-border-soft bg-bg-card px-4 py-3 md:rounded-b-2xl">
        <div className="flex items-center gap-2 rounded-full border border-border-soft bg-bg-primary px-4 py-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
            disabled={loading}
            placeholder={loading ? "돌맹이가 생각 중..." : "지금 어디야? 뭐가 궁금해?"}
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-secondary outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-orange text-white transition-colors hover:bg-brand-orange/90 disabled:opacity-30"
          >
            ↑
          </button>
        </div>

        {/* 대화 중 빠른 칩 */}
        {messages.length > 1 && (
          <div className="mt-2 flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
            {["흑돼지 맛집", "감성 카페", "노을 명소", "오름 추천", "비 오는 날"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => sendMessage(t)}
                disabled={loading}
                className="shrink-0 rounded-full bg-bg-secondary px-3 py-1 text-[11px] font-medium text-text-secondary hover:bg-border-soft transition-colors disabled:opacity-50"
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
