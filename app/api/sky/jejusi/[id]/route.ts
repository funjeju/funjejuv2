import { NextRequest, NextResponse } from "next/server";
import { findSkyCamera } from "@/lib/sky/cameras";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 제주시 재난안전대책본부 월파감시 CCTV의 재생 주소 발급 (B안).
 *
 * 제주시 페이지는 카메라를 누를 때마다 세션 쿠키 + CSRF 토큰으로 getHlsCctvUrlAjax.ajax 를 호출해
 * `https://stream-bangjae1.jejusi.go.kr/live/{point}/playlist.m3u8?uid=...` 를 받는다.
 * uid는 카메라별이고 1분 안에 재생을 시작하지 않으면 만료된다. 그래서 캐시하지 않고 매번 새로 받는다.
 * 발급 API는 CORS가 없어 브라우저에서 직접 부를 수 없으므로 서버가 대신 받는다.
 *
 * 응답: { url } 또는 { error } (502). 실패 시 클라이언트는 공식 페이지 링크(A안)를 보여 준다.
 */
const BASE = "https://www.jejusi.go.kr";
const PAGE = `${BASE}/bangjae/realcctvHls/waveHlsCctv.do`;
const AJAX = `${BASE}/bangjae/realcctvHls/getHlsCctvUrlAjax.ajax`;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const SESSION_TTL_MS = 10 * 60 * 1000;

type Session = { cookie: string; csrf: string; at: number };
let session: Session | null = null;

async function openSession(): Promise<Session> {
  const res = await fetch(PAGE, { headers: { "User-Agent": UA }, cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`page ${res.status}`);
  const html = await res.text();
  const csrf = html.match(/name="_csrf" content="([^"]+)"/)?.[1];
  const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  if (!csrf || !cookie) throw new Error("no session");
  return { cookie, csrf, at: Date.now() };
}

async function requestUrl(s: Session, point: number): Promise<string | null> {
  const res = await fetch(AJAX, {
    method: "POST",
    headers: {
      "User-Agent": UA,
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-CSRF-TOKEN": s.csrf,
      "X-Requested-With": "XMLHttpRequest",
      Cookie: s.cookie,
      Referer: PAGE,
    },
    body: `point_id=${point}`,
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const data = (await res.json().catch(() => null)) as { result?: string; hlsUrl?: string } | null;
  const url = data?.result === "success" ? data.hlsUrl : undefined;
  if (!url || !url.startsWith(`https://stream-bangjae1.jejusi.go.kr/live/${point}/`)) return null;
  return url;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const cam = findSkyCamera(id);
  if (!cam || cam.source.kind !== "jejusi") {
    return NextResponse.json({ error: "unknown camera" }, { status: 404 });
  }
  const point = cam.source.point;
  const headers = { "Cache-Control": "no-store" };

  try {
    if (!session || Date.now() - session.at > SESSION_TTL_MS) session = await openSession();
    let url = await requestUrl(session, point);
    if (!url) {
      // 세션이 만료됐을 수 있다 → 한 번만 새로 열고 재시도
      session = await openSession();
      url = await requestUrl(session, point);
    }
    if (!url) return NextResponse.json({ error: "no stream" }, { status: 502, headers });
    return NextResponse.json({ url }, { headers });
  } catch {
    session = null;
    return NextResponse.json({ error: "upstream unavailable" }, { status: 502, headers });
  }
}
