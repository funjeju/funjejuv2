import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";

/**
 * 미니홈피 실시간 채팅/접속 — minihomes/{uid}/chat, minihomes/{uid}/presence.
 * Vercel은 WS 상주 불가 → Firestore(Admin) + 클라 폴링(3s)으로 실시간 구현(새 인프라 X).
 */

const PRESENCE_WINDOW_MS = 45 * 1000;

export interface ChatMsg { id: string; fromUid: string; name: string; text: string; createdAt: number; }

export async function listChat(ownerUid: string, limit = 50): Promise<ChatMsg[]> {
  const snap = await getAdminDb().collection("minihomes").doc(ownerUid).collection("chat")
    .orderBy("createdAt", "desc").limit(limit).get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ChatMsg, "id">) })).reverse();
}

export async function postChat(ownerUid: string, fromUid: string, name: string, text: string): Promise<ChatMsg> {
  const msg = { fromUid, name: (name || "여행자").slice(0, 20), text: text.slice(0, 200), createdAt: Date.now() };
  const ref = await getAdminDb().collection("minihomes").doc(ownerUid).collection("chat").add(msg);
  return { id: ref.id, ...msg };
}

export async function touchPresence(ownerUid: string, visitorUid: string, name: string): Promise<void> {
  await getAdminDb().collection("minihomes").doc(ownerUid).collection("presence").doc(visitorUid)
    .set({ name: (name || "여행자").slice(0, 20), lastSeen: Date.now() }, { merge: true });
}

export async function onlineCount(ownerUid: string): Promise<number> {
  const cutoff = Date.now() - PRESENCE_WINDOW_MS;
  const snap = await getAdminDb().collection("minihomes").doc(ownerUid).collection("presence").get();
  return snap.docs.filter((d) => ((d.data()?.lastSeen as number) ?? 0) > cutoff).length;
}
