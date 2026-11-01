/**
 * 어드민 CCTV CRUD — Firebase Admin SDK 기반
 * Firestore 보안 규칙 우회. 클라이언트 SDK 직접 쓰기 대신 이 API 사용.
 */

import type { DocumentReference, Firestore } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getAdminDb } from "@/lib/firebase-admin";
import { syncCctvToKV, isKVSyncEnabled, deleteCctvFromKV } from "@/lib/cloudflare-kv-sync";

import { cctvSourceRevision, validPlaybackAttestation, publicationAfterSave } from "@/lib/cctv-review";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * CCTV 상세/목록/지역·테마 허브는 revalidate=false(영구 캐시)라,
 * 어드민에서 수정/추가/삭제할 때 여기서 명시적으로 캐시를 무효화해야 화면에 반영된다.
 */
function revalidateCctv(id: string) {
  revalidatePath("/");
  revalidatePath(`/cctv/${id}`);            // 해당 카메라 상세
  revalidatePath("/cctv");                  // 전체 목록
  revalidatePath("/cctv/region/[region]", "page"); // 지역 허브 전체
  revalidatePath("/cctv/theme/[slug]", "page");    // 테마 허브 전체
}

async function authCheck(): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  const authCookie  = cookieStore.get("admin_auth")?.value;
  if (!authCookie || authCookie !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

function adminError(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("FIREBASE_SERVICE_ACCOUNT")) {
    return NextResponse.json({
      error: "Firebase Admin SDK 미설정",
      hint: "Vercel 환경변수 FIREBASE_SERVICE_ACCOUNT에 서비스 계정 JSON을 등록해주세요.",
    }, { status: 500 });
  }
  return NextResponse.json({ error: msg.slice(0, 300) }, { status: 500 });
}

/** Reconcile only the selected playback source. Retained HLS URLs are history,
 * never an alternate published source when a YouTube ID is selected. */
function hasKvIntegration(): boolean {
  return isKVSyncEnabled() || !!process.env.NEXT_PUBLIC_WORKER_URL ||
    !!process.env.CLOUDFLARE_ACCOUNT_ID || !!process.env.CLOUDFLARE_KV_NAMESPACE_ID;
}

async function reconcileProxy(id: string, entry: Record<string, unknown> | undefined, active?: boolean): Promise<boolean | null> {
  if (!hasKvIntegration()) return null;
  if (!entry || entry.youtubeId || !entry.originUrl) return deleteCctvFromKV(id);
  return syncCctvToKV(id, {
    name: typeof entry.name === "string" ? entry.name : undefined,
    region: typeof entry.region === "string" ? entry.region : undefined,
    category: typeof entry.category === "string" ? entry.category : undefined,
    originUrl: String(entry.originUrl), active: active ?? !!entry.active,
  });
}

/** External KV is not transactional with Firestore. Only clear pending after
 * verifying the exact snapshot written to KV; bounded retries repair stale writes. */
async function reconcileLatest(db: Firestore, ref: DocumentReference, id: string): Promise<boolean | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const snapshot = await ref.get();
      const result = await reconcileProxy(id, snapshot.data());
      const stable = await db.runTransaction(async (tx) => {
        const current = await tx.get(ref);
        if (current.exists !== snapshot.exists || (current.exists && !current.updateTime?.isEqual(snapshot.updateTime!))) return false;
        if (current.exists) tx.update(ref, { proxySyncPending: result === false });
        return true;
      });
      if (stable) return result;
    } catch { /* Retry current state, not the rejected/stale snapshot. */ }
  }
  // Never announce success when the newest revision cannot be established.
  await ref.update({ proxySyncPending: true }).catch(() => {});
  return false;
}

/** GET — 전체 목록 */
export async function GET() {
  const unauth = await authCheck();
  if (unauth) return unauth;

  try {
    const db = getAdminDb();
    const snap = await db.collection("cctvs").orderBy("name").get();
    const entries = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name ?? "",
        region: data.region ?? "",
        direction: data.direction ?? "북",
        category: data.category ?? "기타",
        originUrl: data.originUrl ?? "",
        youtubeId: data.youtubeId ?? undefined,
        active: !!data.active,
        sourceRevision: cctvSourceRevision(data),
        reviewedAt: data.reviewedAt,
        reviewMethod: data.reviewMethod,
        proxySyncPending: !!data.proxySyncPending,
        description: data.description ?? "",
        lat: data.lat,
        lng: data.lng,
        addedAt: data.addedAt?.toDate?.()?.toISOString(),
      };
    });
    return NextResponse.json({ entries });
  } catch (e) {
    return adminError(e);
  }
}

/** POST — 추가/수정 (merge) */
export async function POST(req: NextRequest) {
  const unauth = await authCheck();
  if (unauth) return unauth;

  try {
    const body = await req.json();
    const { id } = body;
    if (typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)) return NextResponse.json({ error: "올바른 CCTV ID가 필요합니다" }, { status: 400 });
    if (typeof body.name !== "string" || !body.name.trim() || typeof body.region !== "string" || !body.region.trim()) return NextResponse.json({ error: "이름과 지역은 필수입니다" }, { status: 400 });
    const originUrl = typeof body.originUrl === "string" ? body.originUrl.trim() : "";
    const youtubeId = typeof body.youtubeId === "string" ? body.youtubeId.trim() : "";
    if (youtubeId ? !/^[a-zA-Z0-9_-]{11}$/.test(youtubeId) : !/^https?:\/\//.test(originUrl)) return NextResponse.json({ error: "YouTube ID 또는 HTTP(S) 영상 주소를 확인해주세요" }, { status: 400 });
    // Explicit allowlist: callers cannot inject active/review metadata through POST.
    const data = {
      name: body.name.trim(), region: body.region.trim(),
      direction: ["북", "동", "남", "서"].includes(body.direction) ? body.direction : "북",
      category: typeof body.category === "string" ? body.category : "기타",
      description: typeof body.description === "string" ? body.description : "",
      originUrl, youtubeId: youtubeId || null,
      ...(typeof body.lat === "number" ? { lat: body.lat } : {}),
      ...(typeof body.lng === "number" ? { lng: body.lng } : {}),
    };
    const db = getAdminDb();
    const docRef = db.collection("cctvs").doc(id);
    await db.runTransaction(async (tx) => {
      const old = await tx.get(docRef);
      const previous = old.data();
      const changed = !old.exists || cctvSourceRevision(previous ?? {}) !== cctvSourceRevision(data);
      tx.set(docRef, {
        ...data,
        active: publicationAfterSave(previous, data),
        ...(changed ? { reviewedAt: null, reviewMethod: null } : {}),
        ...(!old.exists ? { addedAt: new Date() } : {}),
      }, { merge: true });
    });
    const kvOk = await reconcileLatest(db, docRef, id);

    revalidateCctv(id);
    return NextResponse.json({ ok: true, kvSync: kvOk, warning: kvOk === false ? "저장은 완료됐지만 프록시 동기화가 실패했습니다. 게시 전 다시 확인해주세요." : undefined });
  } catch (e) {
    return adminError(e);
  }
}

/** PATCH — active 토글 */
export async function PATCH(req: NextRequest) {
  const unauth = await authCheck();
  if (unauth) return unauth;

  try {
    const { id, active, review } = await req.json();
    if (typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(id) || typeof active !== "boolean") return NextResponse.json({ error: "ID와 활성 상태를 확인해주세요" }, { status: 400 });
    const db = getAdminDb();
    const docRef = db.collection("cctvs").doc(id);
    const snapshot = await docRef.get();
    if (!snapshot.exists) return NextResponse.json({ error: "CCTV를 찾을 수 없습니다" }, { status: 404 });
    const fresh = snapshot.data()!;
    const revision = cctvSourceRevision(fresh);
    if (active && !validPlaybackAttestation(review, revision)) return NextResponse.json({ error: "현재 저장된 소스의 실제 재생을 확인하고 15분 이내에 명시적으로 승인해주세요. HTTP 응답은 재생 확인이 아닙니다." }, { status: 409 });
    // Hide first when disabling; a cache-sync failure must never keep public playback enabled.
    if (!active) await docRef.update({ active: false });
    const kvOk = active ? await reconcileProxy(id, fresh, true) : await reconcileLatest(db, docRef, id);
    if (active && kvOk === false) {
      await docRef.update({ proxySyncPending: true });
      return NextResponse.json({ error: "프록시 동기화 실패: 게시 승인 보류. 동기화 문제를 해결하고 다시 검토해주세요.", kvSync: false }, { status: 503 });
    }
    if (active) {
      try {
        await db.runTransaction(async (tx) => {
          const current = await tx.get(docRef);
          if (!current.exists || !current.updateTime?.isEqual(snapshot.updateTime!) || cctvSourceRevision(current.data()!) !== revision) throw new Error("소스가 변경됐습니다. 새 소스를 다시 확인해주세요.");
          tx.update(docRef, { active: true, reviewedAt: new Date().toISOString(), reviewMethod: "operator-observed", proxySyncPending: false });
        });
      } catch {
        // KV was written before the optimistic Firestore commit. Restore it from the
        // newest authoritative record, never leave the rejected source enabled.
        const restored = (await reconcileLatest(db, docRef, id)) !== false;
        revalidateCctv(id);
        return NextResponse.json({ error: restored
          ? "동시 수정으로 게시 승인이 취소되었습니다. 프록시는 현재 저장된 소스로 복구했습니다. 목록을 새로고침하고 다시 검토해주세요."
          : "동시 수정으로 게시 승인이 취소됐고 프록시 복구도 실패했습니다. 동기화 점검이 필요합니다. 다시 게시하지 말고 운영자에게 확인해주세요.", kvSync: restored, publicationPending: true }, { status: restored ? 409 : 503 });
      }
    }

    revalidateCctv(id);
    return NextResponse.json({ ok: true, kvSync: kvOk, warning: kvOk === false ? "비활성화 완료. 프록시 동기화가 실패했으므로 운영 점검이 필요합니다." : undefined });
  } catch (e) {
    return adminError(e);
  }
}

/** Camera records and URLs are retained. Use PATCH active:false instead. */
export async function DELETE() {
  const unauth = await authCheck();
  if (unauth) return unauth;
  return NextResponse.json({ error: "카메라 기록은 삭제하지 않습니다. 비활성화를 이용해주세요." }, { status: 405 });
}
