// FunJeju CCTV Proxy — AWS Lightsail용 Node.js 서버
// Node 20+ 내장 fetch 사용. Web ReadableStream → Node Stream 변환으로 .ts 세그먼트 안정 전달.
// CCTVS는 /api/proxy-config 엔드포인트에서 주기적으로 갱신됨 (Firestore 기반)
const express = require("express");
const { Readable } = require("stream");
const app = express();
const PORT = 80;

// Firestore 기반 동적 CCTVS — 시작 시 즉시 + 5분마다 갱신
const NEXT_APP_URL = process.env.NEXT_APP_URL || "https://funjeju.com";
const PROXY_CONFIG_SECRET = process.env.ADMIN_SECRET || "";

// 하드코딩 fallback (Firestore 갱신 전 또는 실패 시 사용)
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
    if (!res.ok) { console.warn("[refresh] proxy-config responded", res.status); return; }
    const fresh = await res.json();
    if (fresh && typeof fresh === "object" && Object.keys(fresh).length > 0) {
      CCTVS = fresh;
      console.log(`[refresh] CCTVS updated — ${Object.keys(CCTVS).length} entries`);
    }
  } catch (e) {
    console.error("[refresh] failed:", e.message);
  }
}

// 시작 즉시 + 5분마다 갱신
refreshCctvs();
setInterval(refreshCctvs, 5 * 60 * 1000);

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
  // Cloudflare/nginx 프록시 통해 들어올 때 원래 프로토콜 보존
  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.get("host");
  return `${proto}://${host}`;
}

// 메인 m3u8 (재생목록)
app.get("/cctv/:id", async (req, res) => {
  const origin = CCTVS[req.params.id];
  if (!origin) return res.status(404).json({ error: "not found" });

  // 클라이언트 끊김 + timeout 둘 다 처리
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

    const rewritten = text
      .split("\n")
      .map((line) => {
        const t = line.trim();
        if (!t || t.startsWith("#")) return line;
        return proxyBase + encodeURIComponent(resolveUrl(t, origin));
      })
      .join("\n");

    if (!res.headersSent) {
      res.set("Content-Type", "application/vnd.apple.mpegurl");
      res.set("Cache-Control", "no-cache");
      res.send(rewritten);
    }
  } catch (e) {
    if (e.name === "AbortError") return; // 클라이언트 끊김 또는 timeout — 정상
    console.error("[m3u8]", e.message);
    if (!res.headersSent) res.status(502).json({ error: String(e) });
  } finally {
    clearTimeout(timeoutId);
  }
});

// 세그먼트 (.ts) 또는 서브 m3u8
app.get("/cctv/:id/seg", async (req, res) => {
  const segUrl = req.query.path;
  if (!segUrl) return res.status(400).json({ error: "missing path" });

  // 클라이언트 끊김 감지 + 8초 timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  let nodeStream = null;
  res.on("close", () => {
    controller.abort();
    if (nodeStream) nodeStream.destroy();
  });

  try {
    const headers = { "User-Agent": "Mozilla/5.0 FunJeju/1.0" };
    if (req.headers.range) headers.Range = req.headers.range;

    const r = await fetch(segUrl, { headers, signal: controller.signal });

    // 서브 m3u8(chunklist) — 재귀 재작성
    if (segUrl.includes(".m3u8")) {
      const text = await r.text();
      const proxyBase = `${publicHost(req)}/cctv/${req.params.id}/seg?path=`;
      const rewritten = text
        .split("\n")
        .map((line) => {
          const t = line.trim();
          if (!t || t.startsWith("#")) return line;
          return proxyBase + encodeURIComponent(resolveUrl(t, segUrl));
        })
        .join("\n");
      if (!res.headersSent) {
        res.set("Content-Type", "application/vnd.apple.mpegurl");
        res.set("Cache-Control", "no-cache");
        return res.send(rewritten);
      }
      return;
    }

    // .ts 세그먼트
    if (!r.ok && r.status !== 206) {
      if (!res.headersSent) res.status(r.status).json({ error: `seg ${r.status}` });
      return;
    }

    if (res.headersSent || res.destroyed) return; // 이미 끊긴 상태
    res.status(r.status);
    res.set("Content-Type", r.headers.get("content-type") || "video/MP2T");
    res.set("Cache-Control", "public, max-age=10");
    const cl = r.headers.get("content-length");
    if (cl) res.set("Content-Length", cl);
    const cr = r.headers.get("content-range");
    if (cr) res.set("Content-Range", cr);

    // ★ Web ReadableStream → Node Stream + cleanup
    if (r.body) {
      nodeStream = Readable.fromWeb(r.body);
      nodeStream.on("error", (err) => {
        if (err.name === "AbortError") return; // 정상 종료
        console.error("[seg stream]", err.message);
        if (!res.headersSent) res.status(502).end();
        else res.destroy();
      });
      // ts 다운로드 자체에도 timeout (15초 — ts는 좀 더 큼)
      const tsTimeoutId = setTimeout(() => {
        if (nodeStream) nodeStream.destroy();
        controller.abort();
      }, 15000);
      nodeStream.on("end", () => clearTimeout(tsTimeoutId));
      nodeStream.on("close", () => clearTimeout(tsTimeoutId));
      nodeStream.pipe(res);
    } else {
      // fallback
      const buf = Buffer.from(await r.arrayBuffer());
      if (!res.headersSent) res.send(buf);
    }
  } catch (e) {
    if (e.name === "AbortError") return; // 클라이언트 끊김 또는 timeout — 정상
    console.error("[seg]", e.message);
    if (!res.headersSent) res.status(502).json({ error: String(e) });
    else if (!res.destroyed) res.destroy();
  } finally {
    clearTimeout(timeoutId);
  }
});

// uncaught exception 안전망 (프로세스 죽지 않게)
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err.message);
});
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", String(reason).slice(0, 200));
});

app.get("/", (req, res) => res.send("FunJeju CCTV Proxy"));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Proxy listening on port ${PORT}`);
});
