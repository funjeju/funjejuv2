// FunJeju CCTV Proxy v3 — m3u8/ts 메모리 캐시 + 이벤트 로그
// Node 20+ 내장 fetch 사용
const express = require("express");
const { Readable } = require("stream");
const app = express();
const PORT = 80;

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
  panpo:           "http://211.114.96.121:1935/jejusi6/11-18.stream/playlist.m3u8",
  udo_cheonjin:    "http://211.114.96.121:1935/jejusi7/11-24.stream/playlist.m3u8",
  udo_haumoktong:  "http://211.114.96.121:1935/jejusi7/11-23.stream/playlist.m3u8",
  samyang:         "http://211.114.96.121:1935/jejusi6/11-14.stream/playlist.m3u8",
  jeju_airport:    "http://123.140.197.51/stream/33/play.m3u8",
  tapdong:         "http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100001/0/1/1.m3u8",
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

app.use((req, res, next) => {
  res.set({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Range",
    "Access-Control-Expose-Headers": "Content-Length, Content-Range",
  });
  if (req.method === "OPTIONS") return res.sendStatus(204);
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

// 메인 m3u8 — 6초 캐시
app.get("/cctv/:id", async (req, res) => {
  const origin = CCTVS[req.params.id];
  if (!origin) return res.status(404).json({ error: "not found" });

  const cacheKey = req.params.id;
  const cached = getCache(m3u8Cache, cacheKey, M3U8_TTL);
  if (cached) {
    logEvent(req, req.params.id, "m3u8", "hit");
    res.set("Content-Type", "application/vnd.apple.mpegurl");
    res.set("Cache-Control", "no-cache");
    return res.send(cached);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  res.on("close", () => controller.abort());

  try {
    const r = await fetch(origin, {
      headers: { "User-Agent": "Mozilla/5.0 FunJeju/1.0" },
      signal: controller.signal,
    });
    if (!r.ok) {
      if (!res.headersSent) res.status(r.status).json({ error: `origin ${r.status}` });
      return;
    }
    const text = await r.text();
    const proxyBase = `${publicHost(req)}/cctv/${req.params.id}/seg?path=`;
    const rewritten = text.split("\n").map((line) => {
      const t = line.trim();
      if (!t || t.startsWith("#")) return line;
      return proxyBase + encodeURIComponent(resolveUrl(t, origin));
    }).join("\n");

    setCache(m3u8Cache, cacheKey, rewritten);
    logEvent(req, req.params.id, "m3u8", "origin");

    if (!res.headersSent) {
      res.set("Content-Type", "application/vnd.apple.mpegurl");
      res.set("Cache-Control", "no-cache");
      res.send(rewritten);
    }
  } catch (e) {
    if (e.name === "AbortError") return;
    console.error("[m3u8]", e.message);
    if (!res.headersSent) res.status(502).json({ error: String(e) });
  } finally {
    clearTimeout(timeoutId);
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
    const cached = getCache(m3u8Cache, cacheKey, M3U8_TTL);
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), isM3u8 ? 5000 : 8000);
  let nodeStream = null;
  res.on("close", () => {
    controller.abort();
    if (nodeStream) nodeStream.destroy();
  });

  try {
    const headers = { "User-Agent": "Mozilla/5.0 FunJeju/1.0" };
    if (req.headers.range) headers.Range = req.headers.range;
    const r = await fetch(segUrl, { headers, signal: controller.signal });

    if (isM3u8) {
      const text = await r.text();
      const proxyBase = `${publicHost(req)}/cctv/${req.params.id}/seg?path=`;
      const rewritten = text.split("\n").map((line) => {
        const t = line.trim();
        if (!t || t.startsWith("#")) return line;
        return proxyBase + encodeURIComponent(resolveUrl(t, segUrl));
      }).join("\n");
      setCache(m3u8Cache, cacheKey, rewritten); // ← cacheKey 사용
      logEvent(req, req.params.id, "chunklist", "origin");
      if (!res.headersSent) {
        res.set("Content-Type", "application/vnd.apple.mpegurl");
        res.set("Cache-Control", "no-cache");
        return res.send(rewritten);
      }
      return;
    }

    if (!r.ok && r.status !== 206) {
      if (!res.headersSent) res.status(r.status).json({ error: `seg ${r.status}` });
      return;
    }
    if (res.headersSent || res.destroyed) return;

    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 5 * 1024 * 1024) {
      setCache(tsCache, cacheKey, buf, TS_MAX); // ← cacheKey 사용 (정규화된 ts:cctvId:chunkNum)
    }
    logEvent(req, req.params.id, "ts", "origin");

    res.status(r.status);
    res.set("Content-Type", r.headers.get("content-type") || "video/MP2T");
    res.set("Cache-Control", "public, max-age=10");
    res.send(buf);
  } catch (e) {
    if (e.name === "AbortError") return;
    console.error("[seg]", e.message);
    if (!res.headersSent) res.status(502).json({ error: String(e) });
    else if (!res.destroyed) res.destroy();
  } finally {
    clearTimeout(timeoutId);
  }
});

// ★ 통계 엔드포인트 — 어드민이 fetch
app.get("/stats", (req, res) => {
  const now = Date.now();
  const oneMinAgo = now - 60000;

  // 영상별 최근 1분 통계
  const perCctv = {};
  for (const [cctvId, c] of Object.entries(counters)) {
    const recentEvents = events.filter((e) => e.cctvId === cctvId && e.t >= oneMinAgo);
    perCctv[cctvId] = {
      totalOrigin: c.origin,
      totalHit: c.hit,
      uniqueIps: c.uniqueIps.size,
      recent1min: {
        origin: recentEvents.filter((e) => e.result === "origin").length,
        hit: recentEvents.filter((e) => e.result === "hit").length,
      },
      lastAccess: c.lastAccess,
    };
  }

  res.json({
    uptime: now - startedAt,
    memory: process.memoryUsage().rss,
    m3u8CacheSize: m3u8Cache.size,
    tsCacheSize: tsCache.size,
    eventCount: events.length,
    events: events.slice(-200).reverse(), // 최근 200개 (최신순)
    perCctv,
  });
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

app.get("/", (req, res) => res.send("FunJeju CCTV Proxy v3.1 (cache fix + leave events)"));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Proxy v3 listening on port ${PORT} — cache + event tracking enabled`);
});
