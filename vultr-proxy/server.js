// FunJeju CCTV Proxy v4 — 자가치료 (circuit breaker + in-flight dedup + 짧은 timeout)
// Node 20+ 내장 fetch 사용
const express = require("express");
const { Readable } = require("stream");
const app = express();
const PORT = Number(process.env.PORT) || 8080; // Caddy(443/80) → 8080 리버스프록시

const NEXT_APP_URL = process.env.NEXT_APP_URL || "https://funjeju.com";
const PROXY_CONFIG_SECRET = process.env.ADMIN_SECRET || "";

let CCTVS = {
  gimnyeong:       "http://211.114.96.121:1935/jejusi6/11-20.stream/playlist.m3u8",
  woljeong:        "http://211.114.96.121:1935/jejusi7/11-21.stream/playlist.m3u8",
  pyeongdae:       "http://211.114.96.121:1935/jejusi7/11-22.stream/playlist.m3u8",
  hamdeok:         "http://211.114.96.121:1935/jejusi6/11-19.stream/playlist.m3u8",
  hagwi:           "http://211.114.96.121:1935/jejusi6/11-15.stream/playlist.m3u8",
  gwakji:          "http://211.114.96.121:1935/jejusi6/11-16.stream/playlist.m3u8",
  hyeopjae:        "http://211.114.96.121:1935/jejusi6/11-17.stream/playlist.m3u8",
  ongpo:           "http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100005/0/1/1.m3u8",
  sinchang:        "http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100004/0/1/1.m3u8",
  beophwan_po:     "http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100007/0/1/1.m3u8",
  beophwan_eo:     "http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100008/0/1/1.m3u8",
  onpyeong:        "http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100011/0/1/1.m3u8",
  panpo:           "http://211.114.96.121:1935/jejusi6/11-18.stream/playlist.m3u8",
  udo_cheonjin:    "http://211.114.96.121:1935/jejusi7/11-24.stream/playlist.m3u8",
  udo_haumoktong:  "http://211.114.96.121:1935/jejusi7/11-23.stream/playlist.m3u8",
  samyang:         "http://211.114.96.121:1935/jejusi6/11-14.stream/playlist.m3u8",
  jeju_airport:    "http://123.140.197.51/stream/33/play.m3u8",
  tapdong:         "http://211.114.96.121:1935/jejusi6/11-11.stream/playlist.m3u8",
  donghandugi:     "http://211.114.96.121:1935/jejusi6/11-12.stream/playlist.m3u8",
  iho:             "http://211.114.96.121:1935/jejusi7/11-30T.stream/playlist.m3u8",
  sechon:          "http://211.34.191.215:1935/live/1-149.stream/playlist.m3u8",
  pyoseon:         "http://211.34.191.215:1935/live/1-77.stream/playlist.m3u8",
  daepo:           "http://211.34.191.215:1935/live/1-115.stream/playlist.m3u8",
  dodu:            "http://211.114.96.121:1935/jejusi6/11-13.stream/playlist.m3u8",
  chuja_daeseo:    "http://211.114.96.121:1935/jejusi7/11-26.stream/playlist.m3u8",
  chuja_sinyang:   "http://211.114.96.121:1935/jejusi7/11-28.stream/playlist.m3u8",
  chuja_mukri:     "http://211.114.96.121:1935/jejusi7/11-27.stream/playlist.m3u8",
  chuja_yecho:     "http://211.114.96.121:1935/jejusi7/11-29.stream/playlist.m3u8",
  seongsan:        "http://123.140.197.51/stream/34/play.m3u8",
  seongsan_hang:   "http://211.34.191.215:1935/live/1-140.stream/playlist.m3u8",
  seongsan_suma:   "http://211.34.191.215:1935/live/1-76.stream/playlist.m3u8",
  seopjikoji:      "http://211.34.191.215:1935/live/1-116.stream/playlist.m3u8",
  sinsan:          "http://211.34.191.215:1935/live/1-143.stream/playlist.m3u8",
  namwon_deokdol:  "http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100006/0/1/1.m3u8",
  namwon_taeheung: "http://211.34.191.215:1935/live/1-146.stream/playlist.m3u8",
  hwasun:          "http://211.34.191.215:1935/live/11-25.stream/playlist.m3u8",
  sanbangsan:      "http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100012/0/1/1.m3u8",
  sindo:           "http://211.34.191.215:1935/live/1-71.stream/playlist.m3u8",
  mosulpo:         "http://211.34.191.215:1935/live/1-155.stream/playlist.m3u8",
  hamo_beach:      "http://211.34.191.215:1935/live/11-24.stream/playlist.m3u8",
  daejeong_hamo:   "http://211.34.191.215:1935/live/1-73.stream/playlist.m3u8",
  jungmun:         "http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100010/0/1/1.m3u8",
  bomok:           "http://211.34.191.215:1935/live/1-152.stream/playlist.m3u8",
  cheonjiyeon:     "http://211.34.191.215:1935/live/1-72.stream/playlist.m3u8",
  saeyeongyo:      "http://123.140.197.51/stream/35/play.m3u8",
  nonjitmul:       "http://211.34.191.215:1935/live/1-193.stream/playlist.m3u8",
  seogwipo_hang1:  "http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100009/0/1/1.m3u8",
  seogwipo_hang2:  "http://211.34.191.215:1935/live/1-34.stream/playlist.m3u8",
};

async function refreshCctvs() {
  if (!PROXY_CONFIG_SECRET) return;
  try {
    const res = await fetch(
      `${NEXT_APP_URL}/api/proxy-config?secret=${encodeURIComponent(PROXY_CONFIG_SECRET)}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return;
    const fresh = await res.json();
    if (fresh && typeof fresh === "object" && Object.keys(fresh).length > 0) {
      CCTVS = fresh;
      console.log(`[refresh] CCTVS updated — ${Object.keys(CCTVS).length} entries`);
    }
  } catch (e) {
    console.error("[refresh] failed:", e.message);
  }
}
refreshCctvs();
setInterval(refreshCctvs, 5 * 60 * 1000);

// ★ 메모리 캐시
const m3u8Cache = new Map();
const tsCache = new Map();
const M3U8_TTL = 6000;
const TS_TTL = 30000;
const TS_MAX = 200;

// ★ vurix(59.8.86.94)는 1초 세그먼트 + 보관 ~3초라 묵은 재생목록이면 404.
// origin이 /vurix/ 면: m3u8 캐시를 1초로 줄여 거의 실시간 + 콜드스타트(4.5s) 대비 타임아웃 확대.
function isVurix(id) {
  const o = CCTVS[id];
  return !!o && o.includes("/vurix/");
}
function m3u8TtlFor(id) {
  return isVurix(id) ? 1000 : M3U8_TTL;
}
function fetchTimeoutFor(id, isM3u8) {
  if (isVurix(id)) return 6000;            // vurix 세션 콜드스타트(~4.5s) 흡수
  return isM3u8 ? 2500 : 3500;
}

function getCache(map, key, ttl) {
  const v = map.get(key);
  if (!v) return null;
  if (Date.now() - v.ts > ttl) { map.delete(key); return null; }
  return v.data;
}
function setCache(map, key, data, maxSize) {
  if (maxSize && map.size >= maxSize) {
    const oldest = map.keys().next().value;
    map.delete(oldest);
  }
  map.set(key, { data, ts: Date.now() });
}

// ★ 이벤트 로그 + 카운터
const startedAt = Date.now();
const events = [];
const EVENT_MAX = 500;
const counters = {}; // cctvId -> { origin, hit, lastAccess, lastIPs:Set }

// ★ Circuit Breaker — cctv별 origin 실패 추적
// 연속 N회 실패 시 일정 시간 origin 호출 차단 (소켓 누적 방지)
const circuit = {}; // cctvId -> { failures, openUntil }
const CB_FAILURE_THRESHOLD = 5;     // 5회 연속 실패 시 차단 (vurix 간헐 실패에 덜 민감)
const CB_OPEN_DURATION = 8000;      // 8초간 차단 (30s→8s, 빠른 자가복구)

function cbAllow(cctvId) {
  const c = circuit[cctvId];
  if (!c) return true;
  if (c.openUntil > Date.now()) return false;
  return true;
}
function cbSuccess(cctvId) {
  if (circuit[cctvId]) circuit[cctvId].failures = 0;
}
function cbFail(cctvId) {
  if (!circuit[cctvId]) circuit[cctvId] = { failures: 0, openUntil: 0 };
  circuit[cctvId].failures++;
  if (circuit[cctvId].failures >= CB_FAILURE_THRESHOLD) {
    circuit[cctvId].openUntil = Date.now() + CB_OPEN_DURATION;
    console.warn(`[circuit] ${cctvId} OPEN for ${CB_OPEN_DURATION / 1000}s after ${circuit[cctvId].failures} failures`);
  }
}

// ★ In-flight dedup — 같은 캐시 키에 대한 동시 fetch는 1개로 합침
// 100명이 동시에 같은 ts 요청해도 origin fetch는 1번만
const inflight = new Map(); // cacheKey -> Promise

async function dedupedFetch(cacheKey, fetchFn) {
  if (inflight.has(cacheKey)) {
    return inflight.get(cacheKey);
  }
  const promise = fetchFn().finally(() => inflight.delete(cacheKey));
  inflight.set(cacheKey, promise);
  return promise;
}

function shortIp(ipRaw) {
  if (!ipRaw) return "????";
  const ip = String(ipRaw).split(",")[0].trim();
  let h = 0;
  for (let i = 0; i < ip.length; i++) h = ((h << 5) - h + ip.charCodeAt(i)) | 0;
  return (Math.abs(h) % 10000).toString().padStart(4, "0");
}

function getIp(req) {
  return req.headers["cf-connecting-ip"]
    || req.headers["x-forwarded-for"]
    || req.ip
    || req.socket?.remoteAddress
    || "?";
}

function logEvent(req, cctvId, type, result) {
  const ip = shortIp(getIp(req));
  const ev = { t: Date.now(), ip, cctvId, type, result };
  events.push(ev);
  if (events.length > EVENT_MAX) events.shift();

  if (!counters[cctvId]) counters[cctvId] = { origin: 0, hit: 0, lastAccess: 0, uniqueIps: new Set() };
  counters[cctvId][result === "origin" ? "origin" : "hit"]++;
  counters[cctvId].lastAccess = ev.t;
  counters[cctvId].uniqueIps.add(ip);
}

// 허용 도메인 (ALLOWED_ORIGIN 콤마 구분, 미설정 시 기본값)
const ALLOWED_HOSTS = (process.env.ALLOWED_ORIGIN || "https://funjeju.com,https://www.funjeju.com")
  .split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean);

// 체인 모드: Cloudflare 워커가 이 키를 헤더로 보내면 출처 검증 통과.
// (워커는 서버사이드 fetch라 Origin/Referer가 없어 일반 가드에 막히기 때문)
const PROXY_KEY = process.env.PROXY_KEY || "";

// 출처 검증 — 워커(프록시 키) 또는 우리 도메인에서 온 요청만
function isAllowed(req) {
  // 1) 체인: 워커가 보낸 프록시 키
  if (PROXY_KEY && req.headers["x-proxy-key"] === PROXY_KEY) return true;
  // 2) 브라우저 직접 접근 (Origin/Referer)
  const origin = req.headers["origin"];
  if (origin) return ALLOWED_HOSTS.includes(origin.replace(/\/$/, ""));
  const referer = req.headers["referer"];
  if (referer) return ALLOWED_HOSTS.some((h) => referer.startsWith(h));
  return false;
}

app.use((req, res, next) => {
  res.set({
    "Access-Control-Allow-Origin": ALLOWED_HOSTS[0],
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Range",
    "Access-Control-Expose-Headers": "Content-Length, Content-Range",
    "Vary": "Origin",
  });
  if (req.method === "OPTIONS") return res.sendStatus(204);
  // /stats, "/" 등 비스트림 경로는 통과, /cctv/* 스트림만 가드
  if (req.path.startsWith("/cctv/") && !isAllowed(req)) {
    console.log("[guard 403]", req.path,
      "recvKey=", JSON.stringify(req.headers["x-proxy-key"]),
      "expectKey=", JSON.stringify(PROXY_KEY),
      "origin=", JSON.stringify(req.headers["origin"]));
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
});

function resolveUrl(p, base) {
  if (/^https?:\/\//.test(p)) return p;
  return new URL(p, base).href;
}
function publicHost(req) {
  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.get("host");
  return `${proto}://${host}`;
}

// 메인 m3u8 — 6초 캐시 + circuit breaker + dedup
app.get("/cctv/:id", async (req, res) => {
  const origin = CCTVS[req.params.id];
  if (!origin) return res.status(404).json({ error: "not found" });

  const cacheKey = req.params.id;
  const cached = getCache(m3u8Cache, cacheKey, m3u8TtlFor(req.params.id));
  if (cached) {
    logEvent(req, req.params.id, "m3u8", "hit");
    res.set("Content-Type", "application/vnd.apple.mpegurl");
    res.set("Cache-Control", "no-cache");
    return res.send(cached);
  }

  // ★ Circuit breaker — origin 호출 차단 중이면 즉시 503
  if (!cbAllow(req.params.id)) {
    logEvent(req, req.params.id, "m3u8", "circuit-open");
    return res.status(503).json({ error: "origin temporarily blocked (circuit open)" });
  }

  try {
    // ★ Dedup — 같은 cctv 동시 origin fetch 1개로
    const rewritten = await dedupedFetch(`m3u8:${req.params.id}`, async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), fetchTimeoutFor(req.params.id, true));
      try {
        const r = await fetch(origin, {
          headers: { "User-Agent": "Mozilla/5.0 FunJeju/1.0" },
          signal: controller.signal,
        });
        if (!r.ok) {
          cbFail(req.params.id);
          throw new Error(`origin ${r.status}`);
        }
        const text = await r.text();
        const proxyBase = `${publicHost(req)}/cctv/${req.params.id}/seg?path=`;
        const out = text.split("\n").map((line) => {
          const t = line.trim();
          if (!t || t.startsWith("#")) return line;
          return proxyBase + encodeURIComponent(resolveUrl(t, origin));
        }).join("\n");
        cbSuccess(req.params.id);
        setCache(m3u8Cache, cacheKey, out);
        return out;
      } finally {
        clearTimeout(timeoutId);
      }
    });

    logEvent(req, req.params.id, "m3u8", "origin");
    if (!res.headersSent) {
      res.set("Content-Type", "application/vnd.apple.mpegurl");
      res.set("Cache-Control", "no-cache");
      res.send(rewritten);
    }
  } catch (e) {
    cbFail(req.params.id);
    if (e.name === "AbortError") return;
    console.error("[m3u8]", e.message);
    if (!res.headersSent) res.status(502).json({ error: String(e).slice(0, 100) });
  }
});

app.get("/cctv/:id/seg", async (req, res) => {
  const segUrl = req.query.path;
  if (!segUrl) return res.status(400).json({ error: "missing path" });
  const isM3u8 = segUrl.includes(".m3u8");

  // ★ 캐시 키 정규화
  // chunklist: cctv id 기반 (origin이 매번 새 timestamp 박아도 같은 cctv면 같은 키)
  // ts: chunk 번호만 추출 (사용자/세션별 prefix 무시)
  const cacheKey = isM3u8
    ? `chunklist:${req.params.id}`
    : (() => {
        // ts URL에서 chunk 번호 추출 (예: media_w123_140284.ts → 140284)
        const m = String(segUrl).match(/_(\d+)\.ts/);
        return m ? `ts:${req.params.id}:${m[1]}` : `ts:${segUrl}`;
      })();

  if (isM3u8) {
    const cached = getCache(m3u8Cache, cacheKey, m3u8TtlFor(req.params.id));
    if (cached) {
      logEvent(req, req.params.id, "chunklist", "hit");
      res.set("Content-Type", "application/vnd.apple.mpegurl");
      res.set("Cache-Control", "no-cache");
      return res.send(cached);
    }
  } else {
    const cached = getCache(tsCache, cacheKey, TS_TTL);
    if (cached) {
      logEvent(req, req.params.id, "ts", "hit");
      res.set("Content-Type", "video/MP2T");
      res.set("Cache-Control", "public, max-age=10");
      return res.send(cached);
    }
  }

  // ★ Circuit breaker — 차단 중이면 즉시 503
  if (!cbAllow(req.params.id)) {
    logEvent(req, req.params.id, isM3u8 ? "chunklist" : "ts", "circuit-open");
    return res.status(503).json({ error: "origin blocked (circuit open)" });
  }

  res.on("close", () => { /* abort는 fetch 내부에서 */ });

  try {
    // ★ Dedup — 같은 cacheKey 동시 origin fetch 1개로
    const result = await dedupedFetch(cacheKey, async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), fetchTimeoutFor(req.params.id, isM3u8));
      try {
        const headers = { "User-Agent": "Mozilla/5.0 FunJeju/1.0" };
        if (req.headers.range) headers.Range = req.headers.range;
        const r = await fetch(segUrl, { headers, signal: controller.signal });

        if (isM3u8) {
          if (!r.ok) {
            cbFail(req.params.id);
            throw new Error(`chunklist ${r.status}`);
          }
          const text = await r.text();
          const proxyBase = `${publicHost(req)}/cctv/${req.params.id}/seg?path=`;
          const rewritten = text.split("\n").map((line) => {
            const t = line.trim();
            if (!t || t.startsWith("#")) return line;
            return proxyBase + encodeURIComponent(resolveUrl(t, segUrl));
          }).join("\n");
          cbSuccess(req.params.id);
          setCache(m3u8Cache, cacheKey, rewritten);
          return { type: "m3u8", body: rewritten };
        }

        // ts
        if (!r.ok && r.status !== 206) {
          cbFail(req.params.id);
          throw new Error(`ts ${r.status}`);
        }
        const buf = Buffer.from(await r.arrayBuffer());
        cbSuccess(req.params.id);
        if (buf.length < 5 * 1024 * 1024) {
          setCache(tsCache, cacheKey, buf, TS_MAX);
        }
        return { type: "ts", body: buf, status: r.status, contentType: r.headers.get("content-type") };
      } finally {
        clearTimeout(timeoutId);
      }
    });

    if (res.headersSent || res.destroyed) return;

    if (result.type === "m3u8") {
      logEvent(req, req.params.id, "chunklist", "origin");
      res.set("Content-Type", "application/vnd.apple.mpegurl");
      res.set("Cache-Control", "no-cache");
      return res.send(result.body);
    }

    logEvent(req, req.params.id, "ts", "origin");
    res.status(result.status);
    res.set("Content-Type", result.contentType || "video/MP2T");
    res.set("Cache-Control", "public, max-age=10");
    res.send(result.body);
  } catch (e) {
    cbFail(req.params.id);
    if (e.name === "AbortError") return;
    console.error("[seg]", e.message);
    if (!res.headersSent) res.status(502).json({ error: String(e).slice(0, 100) });
    else if (!res.destroyed) res.destroy();
  }
});

// ★ 통계 엔드포인트 — 어드민이 fetch (절대 throw 안 함)
app.get("/stats", (req, res) => {
  try {
    const now = Date.now();
    const oneMinAgo = now - 60000;

    // 영상별 최근 1분 통계 — events 한 번만 순회
    const recentByCctv = new Map();
    for (const e of events) {
      if (e.t < oneMinAgo) continue;
      if (!recentByCctv.has(e.cctvId)) recentByCctv.set(e.cctvId, { origin: 0, hit: 0 });
      const bucket = recentByCctv.get(e.cctvId);
      if (e.result === "origin") bucket.origin++;
      else if (e.result === "hit") bucket.hit++;
    }

    const perCctv = {};
    for (const [cctvId, c] of Object.entries(counters)) {
      const recent = recentByCctv.get(cctvId) || { origin: 0, hit: 0 };
      perCctv[cctvId] = {
        totalOrigin: c.origin || 0,
        totalHit: c.hit || 0,
        uniqueIps: c.uniqueIps?.size || 0,
        recent1min: recent,
        lastAccess: c.lastAccess || 0,
      };
    }

    // CORS 헤더 명시적으로 한 번 더 (CF 에러 시에도 보존)
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Cache-Control", "no-store");
    res.json({
      uptime: now - startedAt,
      memory: process.memoryUsage().rss,
      m3u8CacheSize: m3u8Cache.size,
      tsCacheSize: tsCache.size,
      eventCount: events.length,
      events: events.slice(-200).reverse(),
      perCctv,
    });
  } catch (e) {
    console.error("[stats]", e.message);
    res.set("Access-Control-Allow-Origin", "*");
    res.status(200).json({
      uptime: 0, memory: 0, m3u8CacheSize: 0, tsCacheSize: 0,
      eventCount: 0, events: [], perCctv: {},
      _error: e.message,
    });
  }
});

// uncaught exception 안전망
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err.message);
});
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", String(reason).slice(0, 200));
});

// ★ 클라이언트 라이프사이클 이벤트 (sendBeacon 호환 — text/plain POST)
// /event?cctv=xxx&action=start|stop|leave
app.post("/event", express.text({ type: "*/*" }), (req, res) => {
  const cctvId = String(req.query.cctv || "").trim();
  const action = String(req.query.action || "").trim();
  if (!cctvId || !["start", "stop", "leave"].includes(action)) {
    return res.status(400).end();
  }
  const ip = shortIp(getIp(req));
  events.push({ t: Date.now(), ip, cctvId, type: action, result: "client" });
  if (events.length > EVENT_MAX) events.shift();
  res.status(204).end();
});

// ★ Health check — Vercel Cron이 ping
app.get("/health", (req, res) => {
  const openCircuits = Object.entries(circuit).filter(([, c]) => c.openUntil > Date.now()).map(([id]) => id);
  res.json({
    ok: true,
    uptime: Date.now() - startedAt,
    memory: process.memoryUsage().rss,
    inflightCount: inflight.size,
    openCircuits, // origin 차단 중인 cctv 목록
  });
});

app.get("/", (req, res) => res.send("FunJeju CCTV Proxy v4 (self-healing)"));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Proxy v3 listening on port ${PORT} — cache + event tracking enabled`);
});
