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
  /**
   * 체인 모드: CCTV origin이 Cloudflare 엣지 IP를 차단해서,
   * 진짜 origin 대신 한국 고정 IP 프록시(Vultr 서울)를 경유한다.
   * 예: "http://141.164.53.216" → 워커는 {base}/cctv/{id} 로 fetch.
   * 비우면 KV originUrl(진짜 CCTV)로 직접 fetch (기존 동작).
   */
  ORIGIN_PROXY_BASE?: string;
  /** Vultr 프록시 출처 가드 통과용 키 (server.js PROXY_KEY와 동일 값) */
  ORIGIN_PROXY_KEY?: string;
}

// 허용 도메인 목록 (ALLOWED_ORIGIN 콤마 구분, 미설정 시 기본값)
function allowedHosts(env: Env): string[] {
  const raw = env.ALLOWED_ORIGIN || "https://funjeju.com,https://www.funjeju.com";
  return raw.split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean);
}

// 동적 CORS — 요청 Origin이 허용 목록이면 그대로 echo (아니면 첫 도메인).
// isAllowed 가드가 보안을 담당하므로 echo해도 안전.
function corsFor(request: Request, env: Env): Record<string, string> {
  const hosts = allowedHosts(env);
  const origin = (request.headers.get("Origin") || "").replace(/\/$/, "");
  const allow = hosts.includes(origin) ? origin : hosts[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Range",
    "Access-Control-Expose-Headers": "Content-Length, Content-Range",
    "Vary": "Origin",
  };
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

// chunklist는 느린 카메라(세그먼트 길이>6s)도 캐시 재사용되도록 12초로.
// ts는 불변 데이터(이미 녹화된 조각)라 길게 잡아도 안전 → 180초로 늘려 Vultr 대역폭 절감 극대화.
const M3U8_TTL_SEC = 12;
const TS_TTL_SEC = 3600; // ts는 불변 → 1시간 캐시(시청자 시차 흡수폭 극대화 → HIT률 ↑). 실시간 뷰어라 신선도 무관

// ★ vurix(59.8.86.94) 카메라: 1초 세그먼트 + 보관 ~3초.
// 재생목록을 12초 캐시하면 이미 삭제된 세그먼트를 가리켜 404 → 끊김.
// 이 카메라들만 m3u8 캐시를 1초로 줄여 거의 실시간 재생목록 제공 (ts 캐시는 그대로라 비용 영향 미미).
const VURIX_IDS = new Set([
  "sinchang", "ongpo", "namwon_deokdol", "seogwipo_hang1", "jungmun", "sanbangsan",
  "beophwan_po", "beophwan_eo", "onpyeong",
]);
function m3u8TtlFor(id: string): number {
  return VURIX_IDS.has(id) ? 1 : M3U8_TTL_SEC;
}

// 정상 브라우저 UA (봇 탐지 회피)
const SAFE_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ── isolate 레벨 통계 (PoP당 카운터, 100% 정확하진 않지만 트렌드 파악 충분) ──
type CctvCounter = { origin: number; hit: number; lastAccess: number; uniqueIps: Set<string> };
const counters: Record<string, CctvCounter> = {};
const events: Array<{ t: number; ip: string; cctvId: string; type: string; result: string; seg?: string }> = [];
const EVENT_MAX = 200;

function shortIp(ipRaw?: string): string {
  if (!ipRaw) return "????";
  let h = 0;
  for (let i = 0; i < ipRaw.length; i++) h = ((h << 5) - h + ipRaw.charCodeAt(i)) | 0;
  return (Math.abs(h) % 10000).toString().padStart(4, "0");
}

function logEvent(req: Request, cctvId: string, type: string, result: string, seg?: string) {
  const ip = shortIp(req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "");
  events.push({ t: Date.now(), ip, cctvId, type, result, seg });
  if (events.length > EVENT_MAX) events.shift();
  if (!counters[cctvId]) counters[cctvId] = { origin: 0, hit: 0, lastAccess: 0, uniqueIps: new Set() };
  counters[cctvId][result === "origin" ? "origin" : "hit"]++;
  counters[cctvId].lastAccess = Date.now();
  counters[cctvId].uniqueIps.add(ip);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const cors = corsFor(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);

    // /stats 엔드포인트 (어드민 모니터링)
    if (url.pathname === "/stats") {
      return statsResponse(cors);
    }
    if (url.pathname === "/" || url.pathname === "") {
      return new Response("FunJeju CCTV Worker Proxy v2", { headers: cors });
    }

    const segments = url.pathname.split("/").filter(Boolean);
    if (segments[0] !== "cctv" || !segments[1]) return jsonError(404, "Not found", cors);

    // 출처 가드 — 우리 도메인에서 온 스트림 요청만 허용 (타 사이트 임베드·직접 스크래핑 차단)
    if (!isAllowed(request, env)) {
      return jsonError(403, "Forbidden", cors);
    }

    const id = segments[1];
    const action = segments[2]; // "seg" | "status" | undefined

    // KV 조회 (isolate별 1초 캐시로 read 비용 절감)
    const meta = await getCctvMeta(env, id);
    if (!meta) return jsonError(404, `CCTV '${id}' not found`, cors);
    if (!meta.active) return jsonError(503, `CCTV '${id}' offline`, cors);

    // 체인 모드: origin이 CF 엣지 IP를 차단하므로 Vultr 프록시를 origin으로 사용
    const chainBase = (env.ORIGIN_PROXY_BASE || "").replace(/\/$/, "");
    const effectiveOrigin = chainBase ? `${chainBase}/cctv/${id}` : meta.originUrl;
    const proxyKey = env.ORIGIN_PROXY_KEY || "";

    if (action === "status") {
      try {
        const r = await fetch(effectiveOrigin, {
          method: "HEAD",
          headers: proxyKey ? { "x-proxy-key": proxyKey } : undefined,
          signal: AbortSignal.timeout(5000),
        });
        return json({ id, online: r.ok, status: r.status }, 200, cors);
      } catch {
        return json({ id, online: false, status: 0 }, 200, cors);
      }
    }

    const workerBase = `${url.protocol}//${url.host}/cctv/${id}`;

    // ── 세그먼트 (chunklist 또는 ts) ───────────────────────────
    if (action === "seg") {
      const segPath = url.searchParams.get("path");
      if (!segPath) return jsonError(400, "Missing ?path", cors);
      const originSegUrl = resolveUrl(segPath, effectiveOrigin);
      const isM3u8 = segPath.includes(".m3u8");

      if (isM3u8) {
        return cachedFetch({
          cacheKeyId: `chunklist:${id}`,
          ttlSec:     m3u8TtlFor(id),
          originUrl:  originSegUrl,
          proxyKey, cors,
          ctx, request, cctvId: id, type: "chunklist",
          transform: async (text) => rewriteM3u8(text, originSegUrl, workerBase),
          contentType: "application/vnd.apple.mpegurl",
        });
      } else {
        // ts 캐시 키 = ".ts 앞 숫자(세그먼트 순번)"만 사용.
        // 언더바 유무·세션토큰(media_w123_)·쿼리스트링 전부 무시 → 시청자 달라도 같은 순번이면 같은 키.
        // 모든 .ts 앞 숫자 중 "마지막" 것을 순번으로 (토큰 숫자가 앞에 와도 순번이 뒤라 안전).
        const matches = segPath.match(/(\d+)\.ts/g);
        const chunkNum = matches ? matches[matches.length - 1].replace(".ts", "") : segPath.split("?")[0];
        return cachedFetch({
          cacheKeyId: `ts:${id}:${chunkNum}`,
          ttlSec:     TS_TTL_SEC,
          originUrl:  originSegUrl,
          proxyKey, cors,
          ctx, request, cctvId: id, type: "ts",
          contentType: "video/MP2T",
          passThroughRange: true,
        });
      }
    }

    // ── 메인 m3u8 ────────────────────────────────────────────
    return cachedFetch({
      cacheKeyId: `m3u8:${id}`,
      ttlSec:     m3u8TtlFor(id),
      originUrl:  effectiveOrigin,
      proxyKey, cors,
      ctx, request, cctvId: id, type: "m3u8",
      transform: async (text) => rewriteM3u8(text, effectiveOrigin, workerBase),
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
  /** 체인 모드: Vultr 프록시 출처 가드 통과 키 */
  proxyKey?: string;
  /** 동적 CORS 헤더 (요청 origin 기반) */
  cors: Record<string, string>;
  ctx: ExecutionContext;
  request: Request;
  cctvId: string;
  type: string;
  contentType: string;
  transform?: (text: string) => Promise<string>;
  passThroughRange?: boolean;
}): Promise<Response> {
  const cache = caches.default;
  // ⚠️ 캐시 키는 반드시 "워커 자기 존(custom domain)" 안의 URL이어야 cache.put이 실제 저장됨.
  // 가짜 호스트(cache.funjeju.internal)는 존 밖이라 Cloudflare가 저장을 무시 → 항상 MISS.
  const cacheReq = new Request(
    new URL(`/__cache/${encodeURIComponent(opts.cacheKeyId)}`, opts.request.url).toString()
  );
  // 로그용 세그먼트 식별자 (ts:gwakji:3877 → "3877")
  const seg = opts.cacheKeyId.split(":").slice(2).join(":") || undefined;

  // 1) 캐시 확인
  const cached = await cache.match(cacheReq);
  if (cached) {
    logEvent(opts.request, opts.cctvId, opts.type, "hit", seg);
    const hitRes = withCors(cached, opts.cors);
    hitRes.headers.set("X-Cache", "HIT");
    return hitRes;
  }

  // 2) Origin fetch
  // ⚠️ Range를 origin에 넘기지 않는다. 넘기면 origin이 206(Partial)으로 응답하고,
  // Cloudflare는 206 응답을 cache.put으로 저장하지 않음 → ts가 영원히 캐시 안 됨 → 항상 ORIGIN.
  // 대신 항상 전체(200)로 받아 캐시 → 재요청 시 HIT. (ts 조각은 작아서 전체 전송이 문제 없음)
  const headers: Record<string, string> = { "User-Agent": SAFE_UA };
  if (opts.proxyKey) headers["x-proxy-key"] = opts.proxyKey;

  let originRes: Response;
  try {
    // 타임아웃 필수 — origin이 hang하면 워커도 같이 hang → CF 522.
    // 빠른 실패(502)가 차라리 낫다 (클라 HLS.js가 재시도).
    originRes = await fetch(opts.originUrl, {
      headers,
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
  } catch (e) {
    // origin 실패 — stale 캐시라도 있으면 (없으면 502)
    logEvent(opts.request, opts.cctvId, opts.type, "error", seg);
    return jsonError(502, `Origin fetch failed: ${String(e).slice(0, 100)}`, opts.cors);
  }

  if (!originRes.ok && originRes.status !== 206) {
    logEvent(opts.request, opts.cctvId, opts.type, "error", seg);
    return jsonError(originRes.status, `Origin returned ${originRes.status}`, opts.cors);
  }

  logEvent(opts.request, opts.cctvId, opts.type, "origin", seg);

  // 3) Transform (m3u8 URL 재작성)
  let body: BodyInit;
  if (opts.transform) {
    const text = await originRes.text();
    body = await opts.transform(text);
  } else {
    body = await originRes.arrayBuffer();
  }

  const responseHeaders: Record<string, string> = {
    ...opts.cors,
    "Content-Type": opts.contentType,
    "Cache-Control": `public, max-age=${opts.ttlSec}`,
    "X-Cache": "MISS",
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
function statsResponse(cors: Record<string, string>): Response {
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
  }, 200, cors);
}

// ─────────────────────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────────────────────
function withCors(res: Response, cors: Record<string, string>): Response {
  const h = new Headers(res.headers);
  for (const [k, v] of Object.entries(cors)) h.set(k, v);
  return new Response(res.body, { status: res.status, headers: h });
}

function json(data: unknown, status = 200, cors: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function jsonError(status: number, message: string, cors: Record<string, string> = {}): Response {
  return json({ error: message }, status, cors);
}
