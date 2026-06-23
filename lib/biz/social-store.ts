import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";

/**
 * 미니홈피 소셜(유저간 네트워킹) — 싸이월드st.
 *  - 일촌(친구): ilchon_requests(신청) + minihomes/{uid}/ilchons/{other}(수락된 관계, 양방향)
 *  - 쪽지: messages (1:1 비공개)
 *  - 선물: 보말 이체(트랜잭션) + 쪽지 알림
 */

const HOMES = "minihomes";

async function nameOf(uid: string): Promise<string> {
  const d = (await getAdminDb().collection(HOMES).doc(uid).get()).data();
  return (d?.displayName as string) || "여행자";
}

// ── 일촌 ──
export interface IlchonReq { id: string; from: string; fromName: string; to: string; createdAt: number; }
export interface Ilchon { uid: string; name: string; nickname: string; since: number; }

export async function isIlchon(a: string, b: string): Promise<boolean> {
  return (await getAdminDb().collection(HOMES).doc(a).collection("ilchons").doc(b).get()).exists;
}

export async function requestIlchon(from: string, to: string): Promise<{ ok: boolean; reason?: string }> {
  if (from === to) return { ok: false, reason: "자기 자신은 안 돼요" };
  const db = getAdminDb();
  if (await isIlchon(from, to)) return { ok: false, reason: "이미 일촌이에요" };
  // 상대가 이미 나한테 신청해둔 상태면 → 바로 수락
  const reverse = await db.collection("ilchon_requests").doc(`${to}_${from}`).get();
  if (reverse.exists) { await acceptIlchon(from, to); return { ok: true, reason: "서로 신청 → 일촌 성사!" }; }
  await db.collection("ilchon_requests").doc(`${from}_${to}`).set({ from, fromName: await nameOf(from), to, createdAt: Date.now() }, { merge: true });
  return { ok: true };
}

export async function listIlchonRequests(uid: string): Promise<IlchonReq[]> {
  const snap = await getAdminDb().collection("ilchon_requests").where("to", "==", uid).limit(50).get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<IlchonReq, "id">) })).sort((a, b) => b.createdAt - a.createdAt);
}

export async function acceptIlchon(uid: string, fromUid: string): Promise<void> {
  const db = getAdminDb();
  const [n1, n2] = [await nameOf(uid), await nameOf(fromUid)];
  const now = Date.now();
  await db.collection(HOMES).doc(uid).collection("ilchons").doc(fromUid).set({ name: n2, nickname: "일촌", since: now }, { merge: true });
  await db.collection(HOMES).doc(fromUid).collection("ilchons").doc(uid).set({ name: n1, nickname: "일촌", since: now }, { merge: true });
  await db.collection("ilchon_requests").doc(`${fromUid}_${uid}`).delete().catch(() => {});
  await db.collection("ilchon_requests").doc(`${uid}_${fromUid}`).delete().catch(() => {});
}

export async function listIlchons(uid: string): Promise<Ilchon[]> {
  const snap = await getAdminDb().collection(HOMES).doc(uid).collection("ilchons").limit(200).get();
  return snap.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<Ilchon, "uid">) }));
}

export async function setIlchonNickname(uid: string, otherUid: string, nickname: string): Promise<void> {
  await getAdminDb().collection(HOMES).doc(uid).collection("ilchons").doc(otherUid).set({ nickname: nickname.slice(0, 20) }, { merge: true });
}

// ── 쪽지 ──
export interface Note { id: string; from: string; fromName: string; to: string; text: string; createdAt: number; read: boolean; }

export async function sendMessage(from: string, to: string, text: string, fromName?: string): Promise<void> {
  await getAdminDb().collection("messages").add({ from, fromName: fromName || (await nameOf(from)), to, text: text.slice(0, 500), createdAt: Date.now(), read: false });
}

export async function listMessages(uid: string): Promise<Note[]> {
  const snap = await getAdminDb().collection("messages").where("to", "==", uid).limit(50).get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Note, "id">) })).sort((a, b) => b.createdAt - a.createdAt);
}

// ── 선물(보말 이체) ──
export async function giftBomal(from: string, to: string, amount: number, msg: string): Promise<{ ok: boolean; reason?: string }> {
  const amt = Math.trunc(Number(amount));
  if (!Number.isFinite(amt) || amt <= 0) return { ok: false, reason: "수량 오류" };
  if (from === to) return { ok: false, reason: "자기 자신은 안 돼요" };
  const db = getAdminDb();
  const fromRef = db.collection(HOMES).doc(from), toRef = db.collection(HOMES).doc(to);
  try {
    await db.runTransaction(async (tx) => {
      const fs = await tx.get(fromRef); const ts = await tx.get(toRef);
      if (!ts.exists) throw new Error("받는 사람을 찾을 수 없어요");
      const bal = (fs.data()?.bomal as number) ?? 0;
      if (bal < amt) throw new Error("보말이 부족해요");
      tx.update(fromRef, { bomal: bal - amt });
      tx.set(toRef, { bomal: ((ts.data()?.bomal as number) ?? 0) + amt }, { merge: true });
    });
    await sendMessage(from, to, `🎁 보말 ${amt}개를 선물했어요!${msg ? ` "${msg.slice(0, 100)}"` : ""}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "선물 실패" };
  }
}
