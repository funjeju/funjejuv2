import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * CCTV 재생 실패 원인 판정 — 클라이언트가 재생에 실패했을 때 호출.
 * 서버가 워커 프록시로 해당 카메라 playlist를 직접 가져와 본다.
 *  - 서버에서도 못 받으면  → cause: "external"  (외부 영상 신호 중단)
 *  - 서버는 받았는데 클라만 실패 → cause: "network" (사용자 네트워크 문제)
 *
 * 응답: { ok: boolean, cause: "external" | "network" }
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const worker = process.env.NEXT_PUBLIC_WORKER_URL || process.env.NEXT_PUBLIC_PROXY_URL || "";
  if (!worker) {
    // 프록시 설정이 없으면 판정 불가 → 외부로 간주(보수적)
    return NextResponse.json({ ok: false, cause: "external" });
  }

  try {
    const res = await fetch(`${worker}/cctv/${encodeURIComponent(id)}`, {
      // 워커 출처가드 통과용 (브라우저 Referer 흉내)
      headers: { Referer: "https://www.funjeju.com/", Origin: "https://www.funjeju.com" },
      signal: AbortSignal.timeout(7000),
      cache: "no-store",
    });
    // 200/206이면 서버 입장에선 정상 송출 → 클라(사용자) 네트워크 문제로 본다
    const ok = res.ok || res.status === 206;
    return NextResponse.json({ ok, cause: ok ? "network" : "external" });
  } catch {
    // 타임아웃/거절 → 외부 신호 중단으로 본다
    return NextResponse.json({ ok: false, cause: "external" });
  }
}
