"use client";

import { useState, useRef, useEffect } from "react";

const suggestions = [
  { label: "근처 카페 추천해줘", emoji: "☕" },
  { label: "노을 맛집 알려줘", emoji: "🌅" },
  { label: "비 오는 날 코스", emoji: "🌧️" },
  { label: "아이와 함께 갈 곳", emoji: "👨‍👩‍👧" },
  { label: "오늘 날씨 어때?", emoji: "⛅" },
  { label: "핫한 스팟 추천", emoji: "🔥" },
];

type Message = { role: "user" | "model"; text: string };

const INITIAL: Message[] = [
  {
    role: "model",
    text: "안녕! 나는 제주 여행 친구 '돌맹이'야! 🗿\n지금 어디야? 내가 딱 맞는 여행을 추천해줄게!",
  },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(INITIAL);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", text };
    const newMessages = [...messages, userMsg];
    setMessages([...newMessages, { role: "model", text: "" }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`API error: ${res.status}`);
      }

      const reader = res.body.getReader();
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
          } catch {
            // 무시
          }
        }
      }
    } catch (e) {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "model",
          text: "음, 잠시 문제가 생겼어! 다시 물어봐줄래? 🗿",
        };
        return next;
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-3.5rem)] max-w-2xl flex-col md:h-[calc(100dvh-1rem)] md:py-6">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border-soft bg-bg-card px-4 py-4 md:rounded-t-2xl">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-yellow/30 text-2xl">
          🗿
        </div>
        <div>
          <p className="text-sm font-bold text-text-primary">AI 도슨트 돌맹이</p>
          <p className="flex items-center gap-1 text-[11px] text-jeju-green">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-jeju-green animate-pulse" />
            온라인
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMessages(INITIAL)}
          className="ml-auto rounded-full border border-border-soft bg-bg-secondary px-3 py-1.5 text-[11px] font-semibold text-text-secondary hover:bg-bg-primary transition-colors"
        >
          새 대화
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-bg-primary px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            {msg.role === "model" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-yellow/30 text-lg">
                🗿
              </div>
            )}
            <div
              className={[
                "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                msg.role === "model"
                  ? "rounded-tl-none bg-bg-card border border-border-soft text-text-primary shadow-card"
                  : "rounded-tr-none bg-brand-navy text-white",
              ].join(" ")}
            >
              {msg.text}
              {msg.role === "model" && loading && i === messages.length - 1 && (
                <span className="inline-block ml-1 animate-pulse">●</span>
              )}
            </div>
          </div>
        ))}

        {/* Suggestions (only at start) */}
        {messages.length === 1 && !loading && (
          <div className="grid grid-cols-2 gap-2 pl-10">
            {suggestions.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => sendMessage(s.label)}
                className="rounded-xl border border-border-soft bg-bg-card px-3 py-2.5 text-left text-xs font-medium text-text-primary hover:bg-bg-secondary transition-colors shadow-card"
              >
                <span className="mr-1">{s.emoji}</span> {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border-soft bg-bg-card px-4 py-3 md:rounded-b-2xl">
        <div className="flex items-center gap-2 rounded-full border border-border-soft bg-bg-primary px-4 py-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
            disabled={loading}
            placeholder={loading ? "돌맹이가 생각 중..." : "제주 여행, 물맹이에게 물어보세요!"}
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

        {/* Quick chips */}
        {messages.length > 1 && (
          <div className="mt-2 flex gap-2 overflow-x-auto pb-0.5">
            {["근처 추천 코스", "맛집 알려줘", "오늘 가볼 만한 곳", "사진 명소"].map((t) => (
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
