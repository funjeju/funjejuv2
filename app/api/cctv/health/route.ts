import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/** Transport diagnostics only. Neither HTTP success nor failure certifies camera playback. */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)) {
    return NextResponse.json({ error: "valid id required" }, { status: 400 });
  }
  const base = process.env.NEXT_PUBLIC_WORKER_URL || process.env.NEXT_PUBLIC_PROXY_URL;
  const respond = (transport: string, reachable: boolean | null, status?: number) =>
    NextResponse.json({ ok: false, playbackVerified: false, cause: "unknown", transport, reachable,
      ...(status ? { upstreamStatus: status } : {}), checkedAt: new Date().toISOString(),
      message: "HTTP 응답만으로 영상 재생 여부나 오류 원인을 판단할 수 없습니다." },
    { headers: { "Cache-Control": "no-store" } });
  if (!base) return respond("not_configured", null);
  try {
    const url = new URL(`${base.replace(/\/$/, "")}/cctv/${encodeURIComponent(id)}`);
    if (!["http:", "https:"].includes(url.protocol)) return respond("invalid_config", null);
    const res = await fetch(url, {
      signal: AbortSignal.timeout(7000), cache: "no-store", redirect: "manual",
    });
    // Never impersonate a browser to bypass origin policy and never follow arbitrary redirects.
    await res.body?.cancel();
    if (res.status === 401 || res.status === 403) return respond("access_denied", false, res.status);
    return respond(res.ok ? "http_reachable" : "http_error", res.ok, res.status);
  } catch {
    return respond("request_failed", null);
  }
}
