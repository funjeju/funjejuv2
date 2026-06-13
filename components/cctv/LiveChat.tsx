"use client";

import { useEffect, useState, useRef, useCallback, type FormEvent } from "react";
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { DolmangyiIcon } from "@/components/common/DolmangyiIcon";

const CHAT_EXPIRE_MS = 3 * 60 * 60 * 1000; // 3시간

type ChatMessage = {
  id: string;
  uid: string;
  displayName: string;
  photoURL?: string | null;
  text: string;
  createdAt: Timestamp | null;
};

function timeAgo(date: Date): string {
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

type LiveChatProps = {
  cctvId: string;
  cctvName: string;
  /** true면 부모 컨테이너 전체 높이 사용 (flex 자식) */
  fillHeight?: boolean;
};

export function LiveChat({ cctvId, cctvName, fillHeight = false }: LiveChatProps) {
  const { user, signInWithGoogle } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // 3시간 단위 채팅 로그를 어드민에 저장
  const archiveExpiredMessages = useCallback(async (msgs: ChatMessage[]) => {
    const db = getFirebaseDb();
    const now = Date.now();
    const expired = msgs.filter((m) => {
      const t = m.createdAt?.toDate?.()?.getTime() ?? 0;
      return t > 0 && now - t >= CHAT_EXPIRE_MS;
    });
    if (expired.length === 0) return;

    // 3시간 단위 그룹키 (e.g. "2026-06-13T09")
    const groups: Record<string, ChatMessage[]> = {};
    for (const m of expired) {
      const d = m.createdAt!.toDate();
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}T${String(Math.floor(d.getHours()/3)*3).padStart(2,"0")}`;
      (groups[key] ??= []).push(m);
    }
    for (const [key, group] of Object.entries(groups)) {
      const text = group.map((m) => `[${m.createdAt?.toDate?.().toISOString() ?? ""}] ${m.displayName}: ${m.text}`).join("\n");
      await addDoc(collection(db, "admin_chat_logs"), {
        cctvId,
        cctvName,
        periodKey: key,
        messageCount: group.length,
        text,
        archivedAt: serverTimestamp(),
      }).catch(() => {});
    }
  }, [cctvId, cctvName]);

  useEffect(() => {
    const db = getFirebaseDb();
    const q = query(
      collection(db, "cctv_chats", cctvId, "messages"),
      orderBy("createdAt", "desc"),
      limit(100)
    );

    const unsub = onSnapshot(q, async (snap) => {
      const all = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ChatMessage, "id">),
      }));
      const now = Date.now();
      // 3시간 이내 메시지만 표시
      const visible = all.filter((m) => {
        const t = m.createdAt?.toDate?.()?.getTime() ?? now;
        return now - t < CHAT_EXPIRE_MS;
      });
      setMessages(visible.reverse());
      // 만료된 메시지 아카이브 (비동기, 실패해도 무방)
      await archiveExpiredMessages(all);
    });

    return unsub;
  }, [cctvId, archiveExpiredMessages]);

  // 새 메시지 시 스크롤 맨 아래
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || !user || sending) return;

    setSending(true);
    try {
      const db = getFirebaseDb();
      await addDoc(collection(db, "cctv_chats", cctvId, "messages"), {
        uid: user.uid,
        displayName: user.displayName ?? user.email?.split("@")[0] ?? "여행자",
        photoURL: user.photoURL ?? null,
        text: input.trim().slice(0, 200),
        createdAt: serverTimestamp(),
      });
      setInput("");
    } catch (e) {
      console.error("Chat send error:", e);
      alert("메시지 전송에 실패했어요. 다시 시도해주세요.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className={[
        "rounded-2xl border border-border-soft bg-bg-card shadow-card overflow-hidden",
        fillHeight ? "flex flex-1 flex-col min-h-0" : "",
      ].join(" ")}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-border-soft px-4 py-3">
        <p className="text-sm font-bold text-text-primary">💬 실시간 채팅</p>
        <span className="rounded-full bg-jeju-green/10 px-2 py-0.5 text-[10px] font-bold text-jeju-green">
          {messages.length}명 참여
        </span>
      </div>

      {/* 메시지 리스트 */}
      <div
        ref={listRef}
        className={[
          "space-y-2 overflow-y-auto p-3",
          fillHeight ? "flex-1 min-h-0" : "max-h-80 min-h-[200px]",
        ].join(" ")}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <DolmangyiIcon size={44} />
            <p className="mt-2 text-xs font-semibold text-text-primary">
              첫 메시지를 남겨보세요!
            </p>
            <p className="mt-0.5 text-[10px] text-text-secondary">
              {cctvName} 현장을 보고 있는 여행자들과 함께해요
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const date = m.createdAt?.toDate?.() ?? new Date();
            return (
              <div key={m.id} className="flex items-start gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-bg-secondary text-sm">
                  {m.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.photoURL} alt="" className="h-full w-full object-cover" />
                  ) : (
                    m.displayName[0]?.toUpperCase() ?? "👤"
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[10px] font-bold text-brand-navy truncate">
                      {m.displayName}
                    </span>
                    <span className="text-[10px] text-text-secondary shrink-0">
                      {timeAgo(date)}
                    </span>
                  </div>
                  <p className="text-xs text-text-primary break-words">{m.text}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 입력창 */}
      <div className="shrink-0 border-t border-border-soft px-3 py-2.5">
        {user ? (
          <form onSubmit={handleSend} className="flex items-center gap-1.5">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="채팅..."
              maxLength={200}
              disabled={sending}
              className="min-w-0 flex-1 rounded-full border border-border-soft bg-bg-secondary px-3 py-1.5 text-xs outline-none placeholder:text-text-secondary disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="shrink-0 rounded-full bg-brand-orange px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-orange/90 disabled:opacity-50 transition-colors"
            >
              {sending ? "..." : "전송"}
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={signInWithGoogle}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-bg-secondary py-2 text-xs font-semibold text-text-secondary hover:bg-border-soft transition-colors"
          >
            <span>🔐</span> 로그인하고 채팅 참여하기
          </button>
        )}
      </div>
    </div>
  );
}
