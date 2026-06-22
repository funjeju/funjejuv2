import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken, uploadPublicImage } from "@/lib/firebase-admin";
import { addPhoto } from "@/lib/biz/userhome-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await verifyFirebaseToken(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64 || typeof imageBase64 !== "string") return NextResponse.json({ error: "이미지가 없습니다" }, { status: 400 });
    const buf = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ""), "base64");
    if (buf.length > 4 * 1024 * 1024) return NextResponse.json({ error: "이미지가 너무 큽니다(4MB 이하)" }, { status: 400 });
    const url = await uploadPublicImage(`minihome-photo/${auth.uid}-${Date.now()}.jpg`, buf, "image/jpeg");
    const photos = await addPhoto(auth.uid, url);
    return NextResponse.json({ photos });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "업로드 실패" }, { status: 400 }); }
}
