import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken, uploadPublicImage } from "@/lib/firebase-admin";
import { setCustomBg } from "@/lib/biz/userhome-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// bg-custom: 내 사진 업로드 → Storage 저장 → 장착. 보유 검증은 setCustomBg에서.
export async function POST(req: NextRequest) {
  const auth = await verifyFirebaseToken(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64 || typeof imageBase64 !== "string") return NextResponse.json({ error: "이미지가 없습니다" }, { status: 400 });
    const b64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const buf = Buffer.from(b64, "base64");
    if (buf.length > 4 * 1024 * 1024) return NextResponse.json({ error: "이미지가 너무 큽니다(4MB 이하)" }, { status: 400 });
    const url = await uploadPublicImage(`minihome-bg/${auth.uid}.jpg`, buf, "image/jpeg");
    await setCustomBg(auth.uid, url);
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "업로드 실패" }, { status: 400 });
  }
}
