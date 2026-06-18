/**
 * 사장님 "우리 가게도 만들어주세요" 접수
 *  POST   (공개)  { shopName, keywords, images: base64[] } → 이미지 업로드 + shop_requests 저장
 *  GET    (어드민) 접수 목록
 *  PATCH  (어드민) { id, status } 상태 변경 (new|done)
 *  DELETE (어드민) ?id= 삭제
 * 클라는 Firestore에 직접 안 쓰고 이 API(Admin SDK) 경유 → firestore.rules 변경 불필요.
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { getAdminDb, uploadPublicImage } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const maxDuration = 60;

const COLLECTION = "shop_requests";
const MAX_IMAGES = 3;

async function isAdmin(): Promise<boolean> {
  const c = await cookies();
  return c.get("admin_auth")?.value === process.env.ADMIN_SECRET;
}

export async function POST(req: NextRequest) {
  let body: { shopName?: string; keywords?: string; images?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }

  const shopName = (body.shopName ?? "").trim().slice(0, 50);
  const keywords = (body.keywords ?? "").trim().slice(0, 200);
  const images = Array.isArray(body.images) ? body.images.slice(0, MAX_IMAGES) : [];
  if (!shopName) return NextResponse.json({ error: "가게명을 입력해주세요." }, { status: 400 });

  const id = `req_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  // base64(dataURL) → Storage 업로드
  const imageUrls: string[] = [];
  try {
    for (let i = 0; i < images.length; i++) {
      const m = /^data:(image\/\w+);base64,(.+)$/.exec(images[i]);
      if (!m) continue;
      const buf = Buffer.from(m[2], "base64");
      if (buf.length > 4 * 1024 * 1024) continue; // 4MB 초과 스킵(클라에서 리사이즈됨)
      const url = await uploadPublicImage(`shop-requests/${id}/${i}.jpg`, buf, m[1]);
      imageUrls.push(url);
    }
  } catch {
    /* 이미지 실패해도 접수는 진행 */
  }

  try {
    await getAdminDb().collection(COLLECTION).doc(id).set({
      id,
      shopName,
      keywords,
      images: imageUrls,
      status: "new",
      createdAt: Date.now(),
    });
  } catch (e) {
    return NextResponse.json({ error: "접수 저장에 실패했어요. 잠시 후 다시 시도해주세요." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const snap = await getAdminDb().collection(COLLECTION).orderBy("createdAt", "desc").limit(200).get();
    return NextResponse.json({ items: snap.docs.map((d) => d.data()) });
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 200) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, status } = (await req.json().catch(() => ({}))) as { id?: string; status?: string };
  if (!id || !status) return NextResponse.json({ error: "id·status 필요" }, { status: 400 });
  await getAdminDb().collection(COLLECTION).doc(id).update({ status });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
  await getAdminDb().collection(COLLECTION).doc(id).delete();
  return NextResponse.json({ ok: true });
}
