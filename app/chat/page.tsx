"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { DolmangyiIcon } from "@/components/common/DolmangyiIcon";
import { useAuth } from "@/hooks/useAuth";
import { usageHeaders } from "@/lib/client-usage";
import { useI18n } from "@/lib/i18n";
import type { DominCard, AiSpotCard } from "@/types/chat";

const SUG_KEYS = ["chat.sug.heuk", "chat.sug.cafe", "chat.sug.spot", "chat.sug.halla", "chat.sug.sunset", "chat.sug.rainy"] as const;
const SUG_EMOJI = ["🍽️", "☕", "🏖️", "⛰️", "🌅", "🌧️"];

type Message = { role: "user" | "model"; text: string; domin?: DominCard[]; aiSpots?: AiSpotCard[] };
type GPS = { lat: number; lng: number } | null;

// 카카오맵 URL 스킴 — 모바일에선 카카오맵 앱(길찾기→카카오내비)으로 연결
const kakaoMapUrl  = (name: string, lat: number, lng: number) =>
  `https://map.kakao.com/link/map/${encodeURIComponent(name)},${lat},${lng}`;
const kakaoNaviUrl = (name: string, lat: number, lng: number) =>
  `https://map.kakao.com/link/to/${encodeURIComponent(name)},${lat},${lng}`;

function fmtDist(km?: number): string | null {
  if (typeof km !== "number") return null;
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
}

function MapButtons({ name, lat, lng }: { name: string; lat?: number; lng?: number }) {
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  return (
    <span className="flex shrink-0 gap-1">
      <a
        href={kakaoMapUrl(name, lat, lng)}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-full bg-bg-secondary px-2 py-1 text-[10px] font-bold text-text-secondary hover:bg-brand-navy hover:text-white transition-colors"
      >
        🗺️ 지도
      </a>
      <a
        href={kakaoNaviUrl(name, lat, lng)}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-full bg-brand-yellow/30 px-2 py-1 text-[10px] font-bold text-brand-navy hover:bg-brand-yellow transition-colors"
      >
        🧭 길찾기
      </a>
    </span>
  );
}

function DominCards({ cards }: { cards: DominCard[] }) {
  return (
    <div className="mt-2 space-y-1.5">
      <p className="text-[10px] font-bold text-brand-navy">🗿 펀제주 인증 도민맛집</p>
      {cards.map((c) => (
        <div key={c.id} className="flex items-center gap-2.5 rounded-xl border border-brand-navy/15 bg-bg-card p-2 shadow-card">
          {c.thumbnail ? (
            <Link href={`/food/${c.id}`} className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg">
              <Image src={c.thumbnail} alt={c.name} fill className="object-cover" sizes="44px" />
            </Link>
          ) : (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-bg-secondary text-lg">🍴</span>
          )}
          <div className="min-w-0 flex-1">
            <Link href={`/food/${c.id}`} className="block truncate text-xs font-bold text-text-primary hover:text-brand-orange">
              {c.name}
            </Link>
            <p className="truncate text-[10px] text-text-secondary">
              {[c.menu, c.region].filter(Boolean).join(" · ")}
              {fmtDist(c.distanceKm) && <span className="ml-1 font-bold text-brand-orange">📍 {fmtDist(c.distanceKm)}</span>}
            </p>
          </div>
          <MapButtons name={c.name} lat={c.lat} lng={c.lng} />
        </div>
      ))}
    </div>
  );
}

function AiSpotCards({ cards }: { cards: AiSpotCard[] }) {
  return (
    <div className="mt-2 space-y-1.5">
      <p className="text-[10px] font-bold text-text-secondary">🔍 AI가 검색으로 찾은 곳</p>
      {cards.map((c) => (
        <div key={c.name} className="flex items-center gap-2.5 rounded-xl border border-border-soft bg-bg-card p-2 shadow-card">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-bg-secondary text-lg">🔍</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-text-primary">{c.name}</p>
            <p className="truncate text-[10px] text-text-secondary">
              {c.reason}
              {fmtDist(c.distanceKm) && <span className="ml-1 font-bold text-brand-orange">📍 {fmtDist(c.distanceKm)}</span>}
            </p>
          </div>
          <MapButtons name={c.name} lat={c.lat} lng={c.lng} />
        </div>
      ))}
    </div>
  );
}

const INITIAL: Message[] = [
  {
    role: "model",
    text: "혼저옵서예! 제주 여행 도슨트 돌AI우다. 🗿\n\n🍽️ 도민맛집광 🏞️ 가볼만한 디를 곹이 추천해드리쿠다.\n지역이름이영 메뉴를 골아주민 더 정확허우다!\n\n※ 제주어가 어렵거든 아래 입력창 위 '제주어 모드'를 꺼줍서.",
  },
];

export default function ChatPage() {
  const { user } = useAuth();
  const { lang, t } = useI18n();
  const [messages, setMessages] = useState<Message[]>(INITIAL);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [gps,      setGps]      = useState<GPS>(null);
  const [gpsState, setGpsState] = useState<"idle" | "asking" | "ok" | "outside" | "denied">("idle");
  const [jejuMode, setJejuMode] = useState(true); // 돌AI 제주어 모드 (디폴트 ON)
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // 외국어면 인사말을 해당 언어로 + 제주어 모드 OFF (대화 시작 전에만)
  useEffect(() => {
    if (lang === "ko") return;
    setJejuMode(false);
    setMessages((prev) => (prev.length === 1 && prev[0].role === "model" ? [{ role: "model", text: t("chat.greeting") }] : prev));
  }, [lang, t]);

  // 자동 스크롤
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // 제주여행 AI 허브(/jeju-ai)의 예시 질문 → ?q= 프리필 (자동전송 X, 사용자가 보내기)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) { setInput(q); inputRef.current?.focus(); }
  }, []);

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
        headers: await usageHeaders(user),
        body: JSON.stringify({
          // 카드 데이터는 서버로 다시 보낼 필요 없음
          messages: history.map((m) => ({ role: m.role, text: m.text })),
          lat: gps?.lat,
          lng: gps?.lng,
          jejuMode,
          lang,
        }),
      });

      // 횟수 한도 초과 — 게이팅 안내 메시지로 교체
      if (res.status === 429) {
        const d = await res.json().catch(() => ({}));
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "model",
            text: d.error || "오늘 도슨트 대화 횟수를 모두 사용했어요. 내일 다시 충전돼요!",
          };
          return next;
        });
        setLoading(false);
        return;
      }

      if (!res.ok || !res.body) throw new Error(`API error: ${res.status}`);

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";

      const patchLast = (patch: Partial<Message>) => {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { ...next[next.length - 1], ...patch };
          return next;
        });
      };

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
            const evt = JSON.parse(data) as { text?: string; error?: string; domin?: DominCard[]; aiSpots?: AiSpotCard[] };
            if (evt.error) throw new Error(evt.error);
            if (evt.domin) patchLast({ domin: evt.domin });
            if (evt.aiSpots) patchLast({ aiSpots: evt.aiSpots });
            if (evt.text) {
              accumulated += evt.text;
              patchLast({ text: accumulated });
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
    <div className="fixed inset-x-0 top-14 bottom-16 z-30 flex flex-col bg-bg-primary md:static md:mx-auto md:h-[calc(100dvh-1rem)] md:max-w-2xl md:py-6">

      {/* 헤더 */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border-soft bg-bg-card px-4 py-4 md:rounded-t-2xl">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-yellow/20"><DolmangyiIcon size={36} /></div>
        <div className="flex-1">
          <p className="flex items-center gap-1.5 text-sm font-bold text-text-primary">
            AI 도슨트 돌AI
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-jeju-green animate-pulse" />
          </p>
          <p className="text-[11px] text-text-secondary">
            {gpsState === "ok" && "📍 내 주변 맞춤 추천 중"}
            {gpsState === "asking" && "위치 확인 중…"}
            {gpsState === "denied" && "지역명을 알려주면 더 정확해요"}
            {gpsState === "idle" && "제주 여행 도우미"}
          </p>
        </div>
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
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain bg-bg-primary px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            {msg.role === "model" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-yellow/20"><DolmangyiIcon size={28} /></div>
            )}
            <div className={`flex max-w-[85%] flex-col ${msg.role === "user" ? "items-end" : "items-stretch"}`}>
              {/* 도민맛집 카드를 텍스트 위로 — 맛집 질문이면 맛집부터 보이게 */}
              {msg.domin && msg.domin.length > 0 && <DominCards cards={msg.domin} />}
              <div
                className={[
                  "rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                  msg.domin && msg.domin.length > 0 ? "mt-1.5" : "",
                  msg.role === "model"
                    ? "rounded-tl-none bg-bg-card border border-border-soft text-text-primary shadow-card"
                    : "rounded-tr-none bg-brand-navy text-white self-end",
                ].join(" ")}
              >
                {msg.text || (loading && i === messages.length - 1 ? "" : "　")}
                {msg.role === "model" && loading && i === messages.length - 1 && (
                  <span className="inline-block w-1.5 h-4 bg-text-primary/40 animate-pulse rounded-sm ml-0.5 align-middle" />
                )}
              </div>
              {msg.aiSpots && msg.aiSpots.length > 0 && <AiSpotCards cards={msg.aiSpots} />}
              {msg.role === "model" && msg.domin && loading && i === messages.length - 1 && !msg.aiSpots && (
                <p className="mt-1.5 text-[10px] text-text-secondary">🔍 AI가 검색 추천도 찾는 중...</p>
              )}
            </div>
          </div>
        ))}

        {/* 초기 제안 칩 */}
        {messages.length === 1 && !loading && (
          <div className="grid grid-cols-2 gap-1.5 pl-10">
            {SUG_KEYS.map((k, i) => {
              const label = t(k);
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => sendMessage(label)}
                  style={{ fontSize: "11px" }}
                  className="rounded-xl border border-border-soft bg-bg-card px-2.5 py-1.5 text-left font-medium text-text-primary hover:bg-bg-secondary transition-colors shadow-card"
                >
                  <span className="mr-1">{SUG_EMOJI[i]}</span>{label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 입력창 */}
      <div className="shrink-0 border-t border-border-soft bg-bg-card px-4 py-3 md:rounded-b-2xl">
        {/* 돌AI 제주어 모드 토글 — 한국어일 때만 (외국어는 의미 없음) */}
        {lang === "ko" && (
        <div className="mb-2 flex items-center justify-end gap-2">
          <span className="text-[11px] font-bold text-text-secondary">🗿 돌AI 제주어 모드</span>
          <button
            type="button"
            role="switch"
            aria-checked={jejuMode}
            onClick={() => setJejuMode((v) => !v)}
            className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${jejuMode ? "bg-brand-orange" : "bg-border-soft"}`}
            title="켜면 제주어 말투로 답해요"
          >
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${jejuMode ? "left-[18px]" : "left-0.5"}`} />
          </button>
        </div>
        )}
        {jejuMode && lang === "ko" && (
          <p className="mb-2 text-center text-[11px] text-text-secondary">
            💬 제주어가 어려우시면 위 <span className="font-bold text-brand-orange">‘제주어 모드’</span>를 꺼주세요. 표준어로 답해드려요!
          </p>
        )}
        <div className="flex items-center gap-2 rounded-full border border-border-soft bg-bg-primary px-4 py-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
            disabled={loading}
            placeholder={loading ? "돌AI가 생각 중..." : (lang !== "ko" ? t("chat.placeholder") : (jejuMode ? "제주어로 답해줄게, 뭐가 궁금허우꽈?" : "지금 어디야? 뭐가 궁금해?"))}
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
            {SUG_KEYS.map((k) => {
              const label = t(k);
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => sendMessage(label)}
                  disabled={loading}
                  className="shrink-0 rounded-full bg-bg-secondary px-3 py-1 text-[11px] font-medium text-text-secondary hover:bg-border-soft transition-colors disabled:opacity-50"
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
