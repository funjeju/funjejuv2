/**
 * 어드민 CCTV CRUD — Firebase Admin SDK 기반
 * Firestore 보안 규칙 우회. 클라이언트 SDK 직접 쓰기 대신 이 API 사용.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminDb } from "@/lib/firebase-admin";
import { syncCctvToKV, deleteCctvFromKV } from "@/lib/cloudflare-kv-sync";

export const runtime = "nodejs";
export const maxDuration = 30;

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
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: "id 필수" }, { status: 400 });

    const db = getAdminDb();
    const docRef = db.collection("cctvs").doc(id);
    await docRef.set(
      {
        ...data,
        youtubeId: data.youtubeId ?? null,
        addedAt: new Date(),
      },
      { merge: true }
    );

    // ★ Cloudflare KV 동기화 (Worker가 즉시 사용 가능하게)
    const fresh = (await docRef.get()).data();
    const kvOk = await syncCctvToKV(id, {
      name:     fresh?.name,
      region:   fresh?.region,
      category: fresh?.category,
      originUrl: fresh?.originUrl ?? "",
      active:   !!fresh?.active,
    });

    return NextResponse.json({ ok: true, kvSync: kvOk });
  } catch (e) {
    return adminError(e);
  }
}

/** PATCH — active 토글 */
export async function PATCH(req: NextRequest) {
  const unauth = await authCheck();
  if (unauth) return unauth;

  try {
    const { id, active } = await req.json();
    if (!id) return NextResponse.json({ error: "id 필수" }, { status: 400 });

    const db = getAdminDb();
    const docRef = db.collection("cctvs").doc(id);
    await docRef.update({ active });

    // ★ KV에도 active 상태 반영
    const fresh = (await docRef.get()).data();
    const kvOk = await syncCctvToKV(id, {
      name:     fresh?.name,
      region:   fresh?.region,
      category: fresh?.category,
      originUrl: fresh?.originUrl ?? "",
      active:   !!fresh?.active,
    });

    return NextResponse.json({ ok: true, kvSync: kvOk });
  } catch (e) {
    return adminError(e);
  }
}

/** DELETE — 삭제 */
export async function DELETE(req: NextRequest) {
  const unauth = await authCheck();
  if (unauth) return unauth;

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id 필수" }, { status: 400 });

    const db = getAdminDb();
    await db.collection("cctvs").doc(id).delete();

    // ★ KV에서도 삭제
    const kvOk = await deleteCctvFromKV(id);

    return NextResponse.json({ ok: true, kvSync: kvOk });
  } catch (e) {
    return adminError(e);
  }
}
