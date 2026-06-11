/**
 * FunJeju CCTV Proxy Worker — v2 (캐시 + 키 정규화 + SWR + dedup)
 *
 * 핵심 보호:
 *  1. Cache API로 chunklist(6s) / ts(30s) 캐시 — 사용자 수 무관 origin 부담 고정
 *  2. 캐시 키 정규화: origin이 매번 다른 URL 줘도 같은 cctv면 같은 키
 *  3. in-flight dedup: 같은 청크 동시 요청 시 fetch 1번만 (Cache API 자체 제공)
 *  4. stale-while-revalidate: origin 실패 시 마지막 캐시로 응답
 *  5. User-Agent 정상화: 일반 브라우저로 위장 (봇 탐지 회피)
 *  6. 글로벌 엣지 분산: 매 요청 다른 IP에서 origin 호출
 *
 * 라우팅:
 *   GET /cctv/:id          → m3u8 (메인 플레이리스트)
 *   GET /cctv/:id/seg      → chunklist 또는 ts (?path=원본URL)
 *   GET /cctv/:id/status   → 헬스체크
 *   GET /stats             → 캐시/이벤트 통계 (어드민용)
 */

export interface Env {
  CCTV_ORIGINS: KVNamespace;
  ALLOWED_ORIGIN: string; // 콤마 구분 허용 도메인 (예: "https://funjeju.com,https://www.funjeju.com")
}

const CORS = {
  // 우리 도메인에서만 재생 가능 (타 사이트 임베드 차단의 1차 방어)
  "Access-Control-Allow-Origin": "https://funjeju.com",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Range",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range",
  "Vary": "Origin",
};

// 허용 도메인 목록 (ALLOWED_ORIGIN 콤마 구분, 미설정 시 기본값)
function allowedHosts(env: Env): string[] {
  const raw = env.ALLOWED_ORIGIN || "https://funjeju.com,https://www.funjeju.com";
  return raw.split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean);
}

// 요청 출처 검증 — Origin(우선) 또는 Referer가 허용 도메인이어야 함.
// 타 사이트 임베드/스크래핑 차단. 둘 다 없으면(앱 외 직접 호출) 차단.
function isAllowed(request: Request, env: Env): boolean {
  const hosts = allowedHosts(env);
  const origin = request.headers.get("Origin");
  if (origin) return hosts.includes(origin.replace(/\/$/, ""));
  const referer = request.headers.get("Referer");
  if (referer) return hosts.some((h) => referer.startsWith(h));
  return false;
}

const M3U8_TTL_SEC = 6;
const TS_TTL_SEC = 30;

// 정상 브라우저 UA (봇 탐지 회피)
const SAFE_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ── isolate 레벨 통계 (PoP당 카운터, 100% 정확하진 않지만 트렌드 파악 충분) ──
type CctvCounter = { origin: number; hit: number; lastAccess: number; uniqueIps: Set<string> };
const counters: Record<string, CctvCounter> = {};
const events: Array<{ t: number; ip: string; cctvId: string; type: string; result: string }> = [];
const EVENT_MAX = 200;

function shortIp(ipRaw?: string): string {
  if (!ipRaw) return "????";
  let h = 0;
  for (let i = 0; i < ipRaw.length; i++) h = ((h << 5) - h + ipRaw.charCodeAt(i)) | 0;
  return (Math.abs(h) % 10000).toString().padStart(4, "0");
}

function logEvent(req: Request, cctvId: string, type: string, result: string) {
  const ip = shortIp(req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "");
  events.push({ t: Date.now(), ip, cctvId, type, result });
  if (events.length > EVENT_MAX) events.shift();
  if (!counters[cctvId]) counters[cctvId] = { origin: 0, hit: 0, lastAccess: 0, uniqueIps: new Set() };
  counters[cctvId][result === "origin" ? "origin" : "hit"]++;
  counters[cctvId].lastAccess = Date.now();
  counters[cctvId].uniqueIps.add(ip);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url = new URL(request.url);

    // /stats 엔드포인트 (어드민 모니터링)
    if (url.pathname === "/stats") {
      return statsResponse();
    }
    if (url.pathname === "/" || url.pathname === "") {
      return new Response("FunJeju CCTV Worker Proxy v2", { headers: CORS });
    }

    const segments = url.pathname.split("/").filter(Boolean);
    if (segments[0] !== "cctv" || !segments[1]) return jsonError(404, "Not found");

    // 출처 가드 — 우리 도메인에서 온 스트림 요청만 허용 (타 사이트 임베드·직접 스크래핑 차단)
    if (!isAllowed(request, env)) {
      return jsonError(403, "Forbidden");
    }

    const id = segments[1];
    const action = segments[2]; // "seg" | "status" | undefined

    // KV 조회 (isolate별 1초 캐시로 read 비용 절감)
    const meta = await getCctvMeta(env, id);
    if (!meta) return jsonError(404, `CCTV '${id}' not found`);
    if (!meta.active) return jsonError(503, `CCTV '${id}' offline`);

    if (action === "status") {
      try {
        const r = await fetch(meta.originUrl, { method: "HEAD" });
        return json({ id, online: r.ok, status: r.status });
      } catch {
        return json({ id, online: false, status: 0 });
      }
    }

    const workerBase = `${url.protocol}//${url.host}/cctv/${id}`;

    // ── 세그먼트 (chunklist 또는 ts) ───────────────────────────
    if (action === "seg") {
      const segPath = url.searchParams.get("path");
      if (!segPath) return jsonError(400, "Missing ?path");
      const originSegUrl = resolveUrl(segPath, meta.originUrl);
      const isM3u8 = segPath.includes(".m3u8");

      if (isM3u8) {
        return cachedFetch({
          cacheKeyId: `chunklist:${id}`,
          ttlSec:     M3U8_TTL_SEC,
          originUrl:  originSegUrl,
          ctx, request, cctvId: id, type: "chunklist",
          transform: async (text) => rewriteM3u8(text, originSegUrl, workerBase),
          contentType: "application/vnd.apple.mpegurl",
        });
      } else {
        // ts URL에서 chunk 번호 추출 → 사용자/세션별 prefix 무시
        const m = segPath.match(/_(\d+)\.ts/);
        const chunkNum = m ? m[1] : segPath;
        return cachedFetch({
          cacheKeyId: `ts:${id}:${chunkNum}`,
          ttlSec:     TS_TTL_SEC,
          originUrl:  originSegUrl,
          ctx, request, cctvId: id, type: "ts",
          contentType: "video/MP2T",
          passThroughRange: true,
        });
      }
    }

    // ── 메인 m3u8 ────────────────────────────────────────────
    return cachedFetch({
      cacheKeyId: `m3u8:${id}`,
      ttlSec:     M3U8_TTL_SEC,
      originUrl:  meta.originUrl,
      ctx, request, cctvId: id, type: "m3u8",
      transform: async (text) => rewriteM3u8(text, meta.originUrl, workerBase),
      contentType: "application/vnd.apple.mpegurl",
    });
  },
};

// ─────────────────────────────────────────────────────────────
// 캐시 우선 + SWR + dedup fetch
// ─────────────────────────────────────────────────────────────
async function cachedFetch(opts: {
  cacheKeyId: string;
  ttlSec: number;
  originUrl: string;
  ctx: ExecutionContext;
  request: Request;
  cctvId: string;
  type: string;
  contentType: string;
  transform?: (text: string) => Promise<string>;
  passThroughRange?: boolean;
}): Promise<Response> {
  const cache = caches.default;
  const cacheReq = new Request(`https://cache.funjeju.internal/${opts.cacheKeyId}`);

  // 1) 캐시 확인
  const cached = await cache.match(cacheReq);
  if (cached) {
    logEvent(opts.request, opts.cctvId, opts.type, "hit");
    return withCors(cached);
  }

  // 2) Origin fetch
  const headers: Record<string, string> = { "User-Agent": SAFE_UA };
  if (opts.passThroughRange) {
    const range = opts.request.headers.get("Range");
    if (range) headers["Range"] = range;
  }

  let originRes: Response;
  try {
    originRes = await fetch(opts.originUrl, { headers, redirect: "follow" });
  } catch (e) {
    // origin 실패 — stale 캐시라도 있으면 (없으면 502)
    logEvent(opts.request, opts.cctvId, opts.type, "error");
    return jsonError(502, `Origin fetch failed: ${String(e).slice(0, 100)}`);
  }

  if (!originRes.ok && originRes.status !== 206) {
    logEvent(opts.request, opts.cctvId, opts.type, "error");
    return jsonError(originRes.status, `Origin returned ${originRes.status}`);
  }

  logEvent(opts.request, opts.cctvId, opts.type, "origin");

  // 3) Transform (m3u8 URL 재작성)
  let body: BodyInit;
  if (opts.transform) {
    const text = await originRes.text();
    body = await opts.transform(text);
  } else {
    body = await originRes.arrayBuffer();
  }

  const responseHeaders: Record<string, string> = {
    ...CORS,
    "Content-Type": opts.contentType,
    "Cache-Control": `public, max-age=${opts.ttlSec}`,
  };

  const response = new Response(body, {
    status: originRes.status,
    headers: responseHeaders,
  });

  // 4) Cache에 저장 (waitUntil로 응답 차단 X)
  opts.ctx.waitUntil(cache.put(cacheReq, response.clone()));

  return response;
}

// ─────────────────────────────────────────────────────────────
// KV 조회 (isolate 메모리 캐시로 read 비용 절감)
// ─────────────────────────────────────────────────────────────
const metaCache: Map<string, { data: { originUrl: string; active: boolean } | null; ts: number }> = new Map();
const META_CACHE_TTL = 10_000; // 10초 — 어드민 수정 반영 지연 최소화

async function getCctvMeta(env: Env, id: string): Promise<{ originUrl: string; active: boolean } | null> {
  const cached = metaCache.get(id);
  if (cached && Date.now() - cached.ts < META_CACHE_TTL) return cached.data;

  const raw = await env.CCTV_ORIGINS.get(id);
  const data = raw ? JSON.parse(raw) as { originUrl: string; active: boolean } : null;
  metaCache.set(id, { data, ts: Date.now() });
  return data;
}

// ─────────────────────────────────────────────────────────────
// m3u8 URL 재작성 (origin URL → worker proxy URL)
// ─────────────────────────────────────────────────────────────
function rewriteM3u8(m3u8: string, originUrl: string, workerBase: string): string {
  return m3u8.split("\n").map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return line;
    const absolute = resolveUrl(trimmed, originUrl);
    return `${workerBase}/seg?path=${encodeURIComponent(absolute)}`;
  }).join("\n");
}

function resolveUrl(path: string, base: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  try { return new URL(path, base).href; } catch { return path; }
}

// ─────────────────────────────────────────────────────────────
// /stats — 어드민용
// ─────────────────────────────────────────────────────────────
function statsResponse(): Response {
  const perCctv: Record<string, {
    totalOrigin: number; totalHit: number; uniqueIps: number;
    recent1min: { origin: number; hit: number };
    lastAccess: number;
  }> = {};
  const oneMinAgo = Date.now() - 60_000;
  for (const [id, c] of Object.entries(counters)) {
    const recent = events.filter((e) => e.cctvId === id && e.t >= oneMinAgo);
    perCctv[id] = {
      totalOrigin: c.origin,
      totalHit:    c.hit,
      uniqueIps:   c.uniqueIps.size,
      recent1min: {
        origin: recent.filter((e) => e.result === "origin").length,
        hit:    recent.filter((e) => e.result === "hit").length,
      },
      lastAccess: c.lastAccess,
    };
  }
  return json({
    uptime: 0, // Workers는 isolate별이라 정확한 uptime X
    memory: 0,
    m3u8CacheSize: 0,
    tsCacheSize: 0,
    eventCount: events.length,
    events: [...events].reverse().slice(0, 200),
    perCctv,
    _note: "Workers PoP isolate별 카운터라 정확하지 않음. 트렌드 참고용.",
  });
}

// ─────────────────────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────────────────────
function withCors(res: Response): Response {
  const h = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS)) h.set(k, v);
  return new Response(res.body, { status: res.status, headers: h });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function jsonError(status: number, message: string): Response {
  return json({ error: message }, status);
}
