import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

/**
 * Lightsail 프록시 서버가 주기적으로 폴링하는 엔드포인트
 * 응답: { [cctvId]: originUrl } — active CCTV만 반환
 *
 * 인증: ?secret=ADMIN_SECRET 쿼리 파라미터 또는 admin_auth 쿠키
 */
export async function GET(req: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET;
  const querySecret = req.nextUrl.searchParams.get("secret");
  const cookieStore = await cookies();
  const cookieAuth = cookieStore.get("admin_auth")?.value;

  if (!adminSecret || (querySecret !== adminSecret && cookieAuth !== adminSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Firestore REST API로 cctvs 컬렉션 읽기
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!projectId || !apiKey) {
    return NextResponse.json({ error: "Firebase config missing" }, { status: 500 });
  }

  try {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/cctvs?key=${apiKey}&pageSize=500`;
    const res = await fetch(url, { next: { revalidate: 60 } });

    if (!res.ok) {
      return NextResponse.json({ error: `Firestore error ${res.status}` }, { status: 500 });
    }

    const data = await res.json() as { documents?: FirestoreDoc[] };
    const result: Record<string, string> = {};

    for (const doc of data.documents ?? []) {
      const id = doc.name?.split("/").pop();
      if (!id) continue;
      const active = doc.fields?.active?.booleanValue;
      const originUrl = doc.fields?.originUrl?.stringValue;
      if (active && originUrl) {
        result[id] = originUrl;
      }
    }

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

type FirestoreDoc = {
  name?: string;
  fields?: Record<string, { stringValue?: string; booleanValue?: boolean }>;
};
