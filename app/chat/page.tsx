"use client";

import { useState } from "react";

const suggestions = [
  { label: "근처 카페 추천해줘", emoji: "☕" },
  { label: "노을 맛집 알려줘", emoji: "🌅" },
  { label: "비 오는 날 코스", emoji: "🌧️" },
  { label: "아이와 함께 갈 곳", emoji: "👨‍👩‍👧" },
  { label: "오늘 날씨 어때?", emoji: "⛅" },
  { label: "핫한 스팟 추천", emoji: "🔥" },
];

type Message = { role: "user" | "bot"; text: string };

const initialMessages: Message[] = [
  {
    role: "bot",
    text: "안녕! 나는 제주 여행 친구 '돌맹이'야! 😎\n지금 어디야? 내가 딱 맞는 여행을 추천해줄게!",
  },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");

  function sendMessage(text: string) {
    if (!text.trim()) return;
    setMessages((prev) => [
      ...prev,
      { role: "user", text },
      {
        role: "bot",
        text: `"${text}"에 대한 답변을 준비 중이에요! 🗿\n(AI 연결 전 Mock 응답입니다)`,
      },
    ]);
    setInput("");
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
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-jeju-green" />
            온라인
          </p>
        </div>
        <button type="button" className="ml-auto rounded-full border border-border-soft bg-bg-secondary px-3 py-1.5 text-[11px] font-semibold text-text-secondary">
          새 대화
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-bg-primary px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            {msg.role === "bot" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-yellow/30 text-lg">
                🗿
              </div>
            )}
            <div
              className={[
                "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line",
                msg.role === "bot"
                  ? "rounded-tl-none bg-bg-card border border-border-soft text-text-primary shadow-card"
                  : "rounded-tr-none bg-brand-navy text-white",
              ].join(" ")}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {/* Suggestions (only at start) */}
        {messages.length === 1 && (
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
            onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
            placeholder="제주 여행, 혼자 고민하지 말고 물맹이에게 물어보세요!"
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-secondary outline-none"
          />
          <button
            type="button"
            onClick={() => sendMessage(input)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-orange text-white transition-colors hover:bg-brand-orange/90"
          >
            ↑
          </button>
        </div>

        {/* Quick chips */}
        <div className="mt-2 flex gap-2 overflow-x-auto pb-0.5">
          {["지금 날씨에 좋은 코스", "아이랑 가기 좋은 곳", "비 오는 날 추천 장소", "혼자 여행 코스"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => sendMessage(t)}
              className="shrink-0 rounded-full bg-bg-secondary px-3 py-1 text-[11px] font-medium text-text-secondary hover:bg-border-soft transition-colors"
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
