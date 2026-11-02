// FunJeju CCTV Proxy v4 — 자가치료 (circuit breaker + in-flight dedup + 짧은 timeout)
// Node 20+ 내장 fetch 사용
const express = require("express");
const { Readable } = require("stream");
const app = express();
const PORT = Number(process.env.PORT) || 8080; // Caddy(443/80) → 8080 리버스프록시

const NEXT_APP_URL = process.env.NEXT_APP_URL || "https://funjeju.com";
const PROXY_CONFIG_SECRET = process.env.ADMIN_SECRET || "";

const LEGACY_CCTVS = {
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

// Config-managed mode fails closed until its first valid snapshot.
// No-secret deployments retain the existing explicit static/manual configuration.
let CCTVS = PROXY_CONFIG_SECRET ? Object.create(null) : LEGACY_CCTVS;
const allowedSegments = new Map(); // id -> recent media URL -> last use/advertisement
const playlistReferences = new Map(); // id -> active playlist URL -> last use/advertisement
const AUTHORIZATION_IDLE_TTL = 60_000;
function pruneIdle(urls, now) {
  for (const [url, usedAt] of urls) if (now - usedAt >= AUTHORIZATION_IDLE_TTL) urls.delete(url);
}
function isSegmentAllowed(id, url) {
  const now = Date.now();
  for (const urls of [playlistReferences.get(id), allowedSegments.get(id)]) {
    if (!urls) continue;
    pruneIdle(urls, now);
    if (urls.has(url)) { urls.delete(url); urls.set(url, now); return true; }
  }
  return false;
}
function rememberSegments(id, urls) {
  const now = Date.now();
  const media = new Map(allowedSegments.get(id) || []);
  const playlists = new Map(playlistReferences.get(id) || []);
  pruneIdle(media, now); pruneIdle(playlists, now);
  for (const url of urls) {
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) continue;
      const target = url.includes(".m3u8") ? playlists : media;
      target.delete(url); target.set(url, now);
    } catch { /* malformed manifest entries are not relay authority */ }
  }
  // Origin sessions can rotate on every root fetch. Keep already-advertised
  // sessions while viewers use them, rather than replacing viewer A with B.
  // Never evict an active playlist silently to admit a new session at capacity.
  if (playlists.size > 256) throw new Error("active playlist authorization limit exceeded");
  while (media.size > 1000) media.delete(media.keys().next().value);
  playlistReferences.set(id, playlists);
  allowedSegments.set(id, media);
}

// Versions also revoke in-flight responses across disable -> re-enable of the same URL.
const sourceVersions = new Map();
let refreshing = false;
function cameraOrigin(id) {
  return Object.hasOwn(CCTVS, id) ? CCTVS[id] : undefined;
}
function sourceCurrent(id, origin, version) {
  return cameraOrigin(id) === origin && (sourceVersions.get(id) || 0) === version;
}
function validConfig(config) {
  if (!config || typeof config !== "object" || Array.isArray(config)) return false;
  return Object.entries(config).every(([id, value]) => {
    if (!/^[a-zA-Z0-9_-]+$/.test(id) || ["__proto__", "constructor", "prototype", "error", "ok", "status", "hint"].includes(id)) return false;
    if (typeof value !== "string" || value !== value.trim()) return false;
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol) && !!url.hostname && !url.username && !url.password;
    } catch { return false; }
  });
}
function applyConfig(fresh) {
  for (const id of new Set([...Object.keys(CCTVS), ...Object.keys(fresh)])) {
    if (cameraOrigin(id) === fresh[id]) continue;
    sourceVersions.set(id, (sourceVersions.get(id) || 0) + 1);
    m3u8Cache.delete(id);
    m3u8Cache.delete(`chunklist:${id}`);
    for (const key of m3u8Cache.keys()) if (key.startsWith(`chunklist:${id}:`)) m3u8Cache.delete(key);
    for (const key of tsCache.keys()) if (key.startsWith(`ts:${id}:`)) tsCache.delete(key);
    for (const key of inflight.keys()) {
      if (key === `m3u8:${id}` || key === `chunklist:${id}` || key.startsWith(`chunklist:${id}:`) || key.startsWith(`ts:${id}:`)) inflight.delete(key);
    }
    allowedSegments.delete(id);
    playlistReferences.delete(id);
    delete relays[id];
    delete circuit[id];
  }
  // An authenticated successful {} is authoritative, never a fallback trigger.
  CCTVS = Object.assign(Object.create(null), fresh);
}
async function refreshCctvs() {
  if (!PROXY_CONFIG_SECRET || refreshing) return;
  refreshing = true;
  try {
    const res = await fetch(
      `${NEXT_APP_URL}/api/proxy-config?secret=${encodeURIComponent(PROXY_CONFIG_SECRET)}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return;
    const fresh = await res.json();
    if (validConfig(fresh)) {
      applyConfig(fresh);
      console.log(`[refresh] CCTVS updated — ${Object.keys(CCTVS).length} entries`);
    }
  } catch (e) {
    console.error("[refresh] failed:", e.message);
  } finally { refreshing = false; }
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
  const o = cameraOrigin(id);
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

function cbAllow(_cctvId) {
  // ★ circuit breaker 비활성화 — 부하 때 한 카메라의 일시 실패가 전체를 503으로 막아
  // cascade 블랙아웃을 일으켜서 제거. 실패한 fetch는 그냥 502로 떨어지고 다음 요청은 정상 시도.
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
  const promise = fetchFn().finally(() => {
    if (inflight.get(cacheKey) === promise) inflight.delete(cacheKey);
  });
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

// ════════════════════════════════════════════════════════════════
// ★ vurix 인제스트 릴레이 — vurix(보관 ~3초)를 Vultr가 0.8초마다 미리 당겨
// 15초 버퍼로 재포장. 클라는 우리 버퍼만 보므로 vurix 타이밍에서 분리 → 끊김 해소.
// (rtmp 카메라는 이 경로를 절대 타지 않음 — isVurix만)
// ════════════════════════════════════════════════════════════════
const RELAY_WINDOW = 15;          // 클라 노출 세그먼트 수(약 15초)
const RELAY_PULL_INTERVAL = 500;  // vurix 폴링 주기(ms) — 1초 세그먼트를 만료 전 포착
const RELAY_IDLE_STOP = 30000;    // 시청자 없으면 30초 후 정지
const relays = {};                // id -> { segments:[{seq,dur,data}], lastSeq, seen:Set, lastAccess }

function ensureRelay(id) {
  let rel = relays[id];
  if (!rel) {
    rel = relays[id] = { segments: [], lastSeq: 0, seen: new Set(), lastAccess: Date.now() };
    relayLoop(id);
  }
  rel.lastAccess = Date.now();
  return rel;
}

async function relayPullOnce(id) {
  const origin = cameraOrigin(id);
  const rel = relays[id];
  const version = sourceVersions.get(id) || 0;
  if (!origin || !rel) return;
  let text;
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 6000);
  try {
    const r = await fetch(origin, { headers: { "User-Agent": "Mozilla/5.0 FunJeju/1.0" }, signal: ctrl.signal });
    if (!r.ok) { cbFail(id); return; }
    text = await r.text();
    cbSuccess(id);
  } finally { clearTimeout(to); }

  if (!sourceCurrent(id, origin, version) || relays[id] !== rel) return;
  // 새 세그먼트 목록 추출(재생목록 순서 유지)
  const lines = text.split("\n");
  const fresh = [];
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t.startsWith("#EXTINF")) continue;
    const dur = parseFloat(t.split(":")[1]) || 1;
    const urlLine = (lines[i + 1] || "").trim();
    if (!urlLine || urlLine.startsWith("#")) continue;
    const segUrl = resolveUrl(urlLine, origin);
    if (rel.seen.has(segUrl)) continue;
    rel.seen.add(segUrl);
    fresh.push({ segUrl, dur });
  }
  // ★ 새 조각들을 병렬로 받음(한 조각이 늦어도 루프 안 막힘) → 순서 유지하며 버퍼에 추가
  const fetched = await Promise.all(fresh.map(async ({ segUrl, dur }) => {
    const sc = new AbortController();
    const sto = setTimeout(() => sc.abort(), 3000);
    try {
      const sr = await fetch(segUrl, { headers: { "User-Agent": "Mozilla/5.0 FunJeju/1.0" }, signal: sc.signal });
      if (!sr.ok) { rel.seen.delete(segUrl); return null; }
      return { dur, data: Buffer.from(await sr.arrayBuffer()) };
    } catch { rel.seen.delete(segUrl); return null; }
    finally { clearTimeout(sto); }
  }));
  if (!sourceCurrent(id, origin, version) || relays[id] !== rel) return;
  for (const f of fetched) {
    if (!f) continue;
    rel.lastSeq++;
    rel.segments.push({ seq: rel.lastSeq, dur: f.dur, data: f.data });
    while (rel.segments.length > RELAY_WINDOW) rel.segments.shift();
  }
  if (rel.seen.size > 80) rel.seen = new Set([...rel.seen].slice(-40)); // 무한증가 방지
}

function relayLoop(id) {
  const tick = async () => {
    const rel = relays[id];
    if (!rel) return;
    if (Date.now() - rel.lastAccess > RELAY_IDLE_STOP) { delete relays[id]; return; } // 시청자 없음→정지
    try { await relayPullOnce(id); } catch { /* 다음 틱 */ }
    if (relays[id] === rel) setTimeout(tick, RELAY_PULL_INTERVAL);
  };
  tick();
}

function buildRelayPlaylist(id, host) {
  const rel = relays[id];
  if (!rel || rel.segments.length === 0) return null;
  let out = `#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:2\n#EXT-X-MEDIA-SEQUENCE:${rel.segments[0].seq}\n`;
  for (const s of rel.segments) out += `#EXTINF:${s.dur.toFixed(3)},\n${host}/cctv/${id}/relayseg/${s.seq}.ts\n`;
  return out;
}

async function serveVurixPlaylist(id, req, res) {
  const origin = cameraOrigin(id);
  const version = sourceVersions.get(id) || 0;
  if (!origin) return res.status(404).json({ error: "not found" });
  ensureRelay(id);
  const deadline = Date.now() + 7000; // 콜드스타트: 버퍼 채워질 때까지 최대 7초 대기
  while ((relays[id]?.segments.length ?? 0) < 3 && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 400));
  }
  if (!sourceCurrent(id, origin, version)) return res.status(404).json({ error: "camera configuration changed" });
  const body = buildRelayPlaylist(id, publicHost(req));
  if (!body) { logEvent(req, id, "m3u8", "relay-cold"); return res.status(503).json({ error: "relay warming up" }); }
  logEvent(req, id, "m3u8", "relay");
  res.set("Content-Type", "application/vnd.apple.mpegurl");
  res.set("Cache-Control", "no-cache");
  res.send(body);
}

// 메인 m3u8 — vurix는 릴레이, 그 외는 6초 캐시 + circuit breaker + dedup
app.get("/cctv/:id", async (req, res) => {
  const origin = cameraOrigin(req.params.id);
  const version = sourceVersions.get(req.params.id) || 0;
  if (!origin) return res.status(404).json({ error: "not found" });

  // vurix는 새창(/watch) 직접재생으로 전환됨 → 릴레이 백그라운드 루프 비활성화(CPU 부하 제거).
  // (만약 체인으로 들어와도 아래 일반 프록시 경로를 그대로 탐)

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
        const advertised = [];
        const out = text.split("\n").map((line) => {
          const t = line.trim();
          if (!t || t.startsWith("#")) return line;
          const resolved = resolveUrl(t, origin);
          advertised.push(resolved);
          return proxyBase + encodeURIComponent(resolved);
        }).join("\n");
        cbSuccess(req.params.id);
        if (!sourceCurrent(req.params.id, origin, version)) return null;
        rememberSegments(req.params.id, advertised);
        setCache(m3u8Cache, cacheKey, out, 512);
        return out;
      } finally {
        clearTimeout(timeoutId);
      }
    });

    if (!sourceCurrent(req.params.id, origin, version)) return res.status(404).json({ error: "camera configuration changed" });
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
  const origin = cameraOrigin(req.params.id);
  const version = sourceVersions.get(req.params.id) || 0;
  if (!origin) return res.status(404).json({ error: "not found" });
  const segUrl = req.query.path;
  if (typeof segUrl !== "string" || !segUrl) return res.status(400).json({ error: "missing path" });
  // Only URLs advertised by the current approved playlist revision may be relayed.
  // This allows genuine cross-CDN manifests without guessing same-directory rules.
  if (!isSegmentAllowed(req.params.id, segUrl)) {
    return res.status(400).json({ error: "path not in current camera playlist" });
  }
  const isM3u8 = segUrl.includes(".m3u8");

  // Session/variant URLs are not interchangeable, even for the same camera.
  const cacheKey = `${isM3u8 ? "chunklist" : "ts"}:${req.params.id}:${segUrl}`;

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
          const advertised = [];
          const rewritten = text.split("\n").map((line) => {
            const t = line.trim();
            if (!t || t.startsWith("#")) return line;
            const resolved = resolveUrl(t, segUrl);
            advertised.push(resolved);
            return proxyBase + encodeURIComponent(resolved);
          }).join("\n");
          cbSuccess(req.params.id);
          if (!sourceCurrent(req.params.id, origin, version)) return null;
          rememberSegments(req.params.id, advertised);
          setCache(m3u8Cache, cacheKey, rewritten, 512);
          return { type: "m3u8", body: rewritten };
        }

        // ts
        if (!r.ok && r.status !== 206) {
          cbFail(req.params.id);
          throw new Error(`ts ${r.status}`);
        }
        const buf = Buffer.from(await r.arrayBuffer());
        cbSuccess(req.params.id);
        if (!sourceCurrent(req.params.id, origin, version)) return null;
        if (buf.length < 5 * 1024 * 1024) {
          setCache(tsCache, cacheKey, buf, TS_MAX);
        }
        return { type: "ts", body: buf, status: r.status, contentType: r.headers.get("content-type") };
      } finally {
        clearTimeout(timeoutId);
      }
    });

    if (res.headersSent || res.destroyed) return;
    if (!sourceCurrent(req.params.id, origin, version)) return res.status(404).json({ error: "camera configuration changed" });

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
// ★ vurix 원본 직접재생 뷰어 (평문 HTTP) — HTTP 스트림을 새 창에서 부드럽게.
// CCTV 모니터 프레임 느낌. id=카메라, name=표시이름(쿼리)
app.get("/watch", (req, res) => {
  const id = String(req.query.id || "");
  const stream = cameraOrigin(id);
  if (!stream) return res.status(404).send("<h1 style='font-family:sans-serif'>카메라를 찾을 수 없어요</h1>");
  res.set("Content-Type", "text/html; charset=utf-8");
  res.send(`<!doctype html><html lang="ko"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>FunJeju · 라이브</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;background:#070708;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Malgun Gothic','Apple SD Gothic Neo',sans-serif;color:#eee}
.stage{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:min(3vmin,22px);background:radial-gradient(ellipse at 50% 35%,#15161b 0%,#060607 75%)}
.monitor{position:relative;width:100%;height:100%;background:#000;border:clamp(8px,1.4vmin,16px) solid #15171c;border-radius:16px;box-shadow:0 0 0 2px #2b2f37,inset 0 0 70px rgba(0,0,0,.95),0 26px 70px rgba(0,0,0,.65);overflow:hidden}
video{width:100%;height:100%;object-fit:contain;background:#000;display:block}
.fx{pointer-events:none;position:absolute;inset:0;background:repeating-linear-gradient(180deg,rgba(255,255,255,.022) 0 1px,transparent 1px 3px);mix-blend-mode:overlay}
.vig{pointer-events:none;position:absolute;inset:0;box-shadow:inset 0 0 170px rgba(0,0,0,.72);border-radius:10px}
.osd{position:absolute;inset:0;pointer-events:none;font-variant-numeric:tabular-nums}
.live{position:absolute;top:14px;left:16px;display:flex;align-items:center;gap:7px;font-weight:800;font-size:13px;letter-spacing:.6px;color:#fff;text-shadow:0 1px 4px #000}
.dot{width:9px;height:9px;border-radius:50%;background:#ff3b30;box-shadow:0 0 9px #ff3b30;animation:bl 1.2s infinite}
@keyframes bl{0%,100%{opacity:1}50%{opacity:.2}}
.clk{position:absolute;top:14px;right:16px;font-size:13px;font-weight:700;color:#d2d5d9;text-shadow:0 1px 4px #000}
.nm{position:absolute;bottom:13px;left:16px;font-size:15px;font-weight:800;color:#fff;text-shadow:0 1px 5px #000}
.br{position:absolute;bottom:13px;right:16px;font-size:12px;font-weight:800;color:#ff8a3d;text-shadow:0 1px 4px #000}
.ld{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:13px;color:#9aa0a6;font-size:13px}
.sp{width:38px;height:38px;border:3px solid #2a2d34;border-top-color:#ff8a3d;border-radius:50%;animation:rt 1s linear infinite}
@keyframes rt{to{transform:rotate(360deg)}}
.x{position:absolute;top:10px;right:54px;pointer-events:auto;cursor:pointer;color:#aaa;font-size:18px;font-weight:700;opacity:.5;text-shadow:0 1px 4px #000}
.x:hover{opacity:1}
</style></head><body>
<div class="stage"><div class="monitor">
<video id="v" autoplay muted playsinline></video>
<div class="fx"></div><div class="vig"></div>
<div class="osd">
<div class="live" id="playback-status">연결 확인 중</div>
<div class="clk" id="clk" title="내 기기 시간 · 영상 촬영 시간이 아닙니다"></div>
<div class="x" onclick="window.close()" title="닫기">✕</div>
<div class="nm" id="nm"></div>
<div class="br">FunJeju</div>
</div>
<div class="ld" id="ld" role="status"><div id="playback-message">원본 연결 중…</div><button id="retry" type="button" hidden style="padding:10px 18px;border:0;border-radius:20px;cursor:pointer">다시 재생</button></div>
</div></div>
<script src="https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js"></script>
<script>
var STREAM=${JSON.stringify(stream).replace(/</g, "\\u003c")};
var nm=new URLSearchParams(location.search).get('name')||'제주 CCTV';
document.getElementById('nm').textContent=nm;document.title='FunJeju · '+nm;
function tk(){var d=new Date(),p=function(n){return String(n).padStart(2,'0')};
document.getElementById('clk').textContent=d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'  '+p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds())}
tk();var clockTimer=setInterval(tk,1000);
var v=document.getElementById('v'),ld=document.getElementById('ld');
var label=document.getElementById('playback-status'),message=document.getElementById('playback-message'),retry=document.getElementById('retry');
var hls=null,failed=false,disposed=false,lastTime=0,lastProgress=Date.now();
function stopMedia(){if(hls){hls.destroy();hls=null}v.pause();v.removeAttribute('src');v.load()}
function unavailable(text){if(failed||disposed)return;failed=true;label.textContent='임시 오류';message.textContent=text||'영상을 확인할 수 없어요. 잠시 후 다시 시도해 주세요.';ld.style.display='flex';retry.hidden=false;stopMedia()}
function play(){var result=v.play();if(result&&result.catch)result.catch(function(){if(!disposed&&!failed){label.textContent='재생 대기';message.textContent='다시 재생 버튼을 눌러 영상을 시작해 주세요.';retry.hidden=false}})}
function start(){
if(disposed)return;failed=true;stopMedia();failed=false;lastTime=0;lastProgress=Date.now();
label.textContent='연결 확인 중';message.textContent='원본 연결 중…';ld.style.display='flex';retry.hidden=true;
if(window.Hls&&Hls.isSupported()){
hls=new Hls({lowLatencyMode:false,liveSyncDurationCount:2,maxBufferLength:30,fragLoadingMaxRetry:2,fragLoadingRetryDelay:500});
var session=hls;
hls.on(Hls.Events.MANIFEST_PARSED,function(){if(hls===session)play()});
hls.on(Hls.Events.ERROR,function(_e,d){if(hls===session&&d.fatal)unavailable()});
hls.loadSource(STREAM);hls.attachMedia(v);
}else if(v.canPlayType('application/vnd.apple.mpegurl')){v.src=STREAM;play()}
else unavailable('이 브라우저에서는 원본 영상을 재생할 수 없어요.');
}
retry.addEventListener('click',start);
v.addEventListener('error',function(){unavailable()});
var playbackTimer=setInterval(function(){
if(disposed||failed)return;
if(document.hidden){lastProgress=Date.now();lastTime=v.currentTime;return}
if(v.readyState>=2&&v.videoWidth>0&&v.videoHeight>0&&!v.paused&&v.currentTime>lastTime+0.05){
lastProgress=Date.now();label.textContent='재생 확인됨';ld.style.display='none';retry.hidden=true;
}else if(Date.now()-lastProgress>=20000){unavailable();return}
lastTime=v.currentTime;
},1000);
function cleanup(){if(disposed)return;disposed=true;clearInterval(clockTimer);clearInterval(playbackTimer);stopMedia()}
window.addEventListener('pagehide',cleanup);window.addEventListener('beforeunload',cleanup);
document.addEventListener('keydown',function(e){if(e.key==='Escape')window.close()});
start();
</script></body></html>`);
});

// ★ vurix 릴레이 세그먼트 — 메모리 버퍼에서 서빙
app.get("/cctv/:id/relayseg/:file", (req, res) => {
  if (!cameraOrigin(req.params.id)) return res.status(404).json({ error: "not found" });
  const rel = relays[req.params.id];
  if (rel) rel.lastAccess = Date.now();
  const seq = parseInt(String(req.params.file).replace(".ts", ""), 10);
  const seg = rel && rel.segments.find((s) => s.seq === seq);
  if (!seg) { logEvent(req, req.params.id, "ts", "relay-miss"); return res.status(404).json({ error: "segment gone" }); }
  logEvent(req, req.params.id, "ts", "relay");
  res.set("Content-Type", "video/MP2T");
  res.set("Cache-Control", "public, max-age=30");
  res.send(seg.data);
});

// ★ CF 엣지 캐시 통계 — 워커가 매 요청의 HIT/MISS를 여기로 보고. 단일 프로세스라 전 isolate 집계가 정확.
const cf = { hit: 0, miss: 0, events: [] };
app.post("/cf-report", express.json({ limit: "2kb" }), (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  if (req.headers["x-proxy-key"] !== PROXY_KEY) return res.status(403).json({ error: "forbidden" });
  const b = req.body || {};
  if (b.result === "hit") cf.hit++; else cf.miss++;
  cf.events.push({ t: Date.now(), cctvId: b.cctvId || "", type: b.type || "", result: b.result === "hit" ? "cf-hit" : "cf-miss" });
  if (cf.events.length > 300) cf.events.shift();
  res.json({ ok: true });
});

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
      cf: {
        hit: cf.hit,
        miss: cf.miss,
        ratio: cf.hit + cf.miss ? cf.hit / (cf.hit + cf.miss) : 0,
        events: cf.events.slice(-100).reverse(),
      },
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

// ── 스냅샷: ffmpeg로 origin에서 1프레임 추출 → JPEG (카드뉴스 실시간 날씨용) ──
// GET /snapshot?cctv=ID&key=PROXY_KEY   (PROXY_KEY로 보호 · 원본은 이미 origin 접근 가능한 이 박스에서만)
const { execFile } = require("child_process");
app.get("/snapshot", (req, res) => {
  const key = req.query.key;
  if (process.env.PROXY_KEY && key !== process.env.PROXY_KEY) return res.status(403).json({ error: "forbidden" });
  const id = String(req.query.cctv || "");
  const origin = cameraOrigin(id);
  const version = sourceVersions.get(id) || 0;
  if (!origin) return res.status(404).json({ error: "unknown cctv" });
  // -frames:v 1 → 첫 키프레임 1장만 mjpeg로 stdout. 짧은 타임아웃으로 멈춘 카메라 방어.
  execFile(
    "ffmpeg",
    ["-y", "-loglevel", "error", "-i", origin, "-frames:v", "1", "-q:v", "3", "-f", "image2", "-vcodec", "mjpeg", "pipe:1"],
    { timeout: 15000, maxBuffer: 12 * 1024 * 1024, encoding: "buffer" },
    (err, stdout) => {
      if (!sourceCurrent(id, origin, version)) return res.status(404).json({ error: "camera configuration changed" });
      if (err || !stdout || !stdout.length) return res.status(502).json({ error: "capture failed" });
      res.setHeader("Content-Type", "image/jpeg");
      res.setHeader("Cache-Control", "no-store");
      res.send(stdout);
    }
  );
});

app.get("/", (req, res) => res.send("FunJeju CCTV Proxy v4 (self-healing)"));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Proxy v3 listening on port ${PORT} — cache + event tracking enabled`);
});
