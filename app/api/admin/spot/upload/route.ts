/**
 * 어드민 — Firebase Storage 서버사이드 업로드 (Admin SDK로 보안 규칙 우회).
 * 클라이언트 SDK 직접 업로드는 인증 없이 403 → 이 엔드포인트로 중계.
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getStorage } from "firebase-admin/storage";
import { getAdminApp } from "@/lib/firebase-admin";

export const runtime = "nodejs";

async function isAdmin(): Promise<boolean> {
  const c = await cookies();
  return c.get("admin_auth")?.value === process.env.ADMIN_SECRET;
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { base64, mime, label } = (await req.json().catch(() => ({}))) as {
    base64?: string; mime?: string; label?: string;
  };
  if (!base64) return NextResponse.json({ error: "base64 이미지가 필요합니다." }, { status: 400 });

  const buffer = Buffer.from(base64, "base64");
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!bucketName) return NextResponse.json({ error: "Storage bucket 미설정" }, { status: 500 });

  const path = `spot/${Date.now()}-${label ?? "img"}-${Math.random().toString(36).slice(2, 8)}.png`;
  const token = crypto.randomUUID();

  const bucket = getStorage(getAdminApp()).bucket(bucketName);
  const file = bucket.file(path);
  await file.save(buffer, {
    metadata: {
      contentType: mime ?? "image/png",
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });

  // Firebase 클라이언트 SDK getDownloadURL()과 동일한 형식
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
  return NextResponse.json({ url });
}
