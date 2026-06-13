// scripts/crawl-cctv.mjs
//
// trendworld.kr 제주 CCTV 스트림(m3u8) 크롤러 + 라이브 체크
//
// 구조:
//   cctv.trendworld.kr/jeju_cctv            (게시판 목록, ?page=N)
//      -> /jeju_cctv/{id}                   (게시물, <title>=CCTV 이름)
//         -> http://cctv.trendworld.kr/cctv/{slug}.php   (플레이어 페이지)
//            -> <source src="...playlist.m3u8">          (실제 HLS 스트림)
//
// ── 다른 프로젝트에서 크론으로 쓰는 법 ──────────────────────────
//   import { crawlCctv } from "./crawl-cctv.mjs";
//   const list = await crawlCctv({ check: true });   // 라이브 여부까지 포함
//   // list -> [{ name, slug, m3u8, live, ... }] 를 원하는 DB/파일에 저장
//
// ── CLI ────────────────────────────────────────────────────────
//   node scripts/crawl-cctv.mjs                 # 수집만
//   node scripts/crawl-cctv.mjs --check         # 수집 + 라이브 체크
//   node scripts/crawl-cctv.mjs --check --diff  # 이전 결과와 비교(바뀐 주소 표시)
//   옵션: --max-pages 50 --concurrency 6 --delay 300 --out cctv-streams.json

import { writeFile, readFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── 설정(기본값) ─────────────────────────────────────────────────
const BASE = "http://cctv.trendworld.kr";
const BOARD = "/jeju_cctv";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const DEFAULTS = {
  maxPages: 50,
  concurrency: 6,
  delay: 300, // 요청 간 최소 간격(ms) — 서버 배려
  retries: 2,
  check: false, // m3u8 라이브 체크 여부
};

// ════════════════════════════════════════════════════════════════
//  공개 API
// ════════════════════════════════════════════════════════════════

/**
 * 전체 CCTV 목록을 수집해 배열로 반환한다.
 * @param {object} opts maxPages/concurrency/delay/retries/check
 * @returns {Promise<Array<{postId,name,slug,postUrl,playerUrl,m3u8,live?}>>}
 */
export async function crawlCctv(opts = {}) {
  const cfg = { ...DEFAULTS, ...opts };

  const ids = await collectPostIds(cfg);
  const players = await mapLimit(ids, cfg.concurrency, cfg.delay, (id) =>
    extractPlayer(id, cfg)
  );

  const withPlayer = players.filter((p) => p && p.playerUrl);
  const results = await mapLimit(
    withPlayer,
    cfg.concurrency,
    cfg.delay,
    async (p) => {
      const m3u8 = await safe(() => extractStream(p.playerUrl, cfg));
      const slug = (p.playerUrl.match(/\/cctv\/([A-Za-z0-9_-]+)\.php/) || [])[1];
      const row = {
        postId: p.postId,
        name: p.name,
        slug: slug || null,
        postUrl: p.postUrl,
        playerUrl: p.playerUrl,
        m3u8: m3u8 || null,
      };
      if (cfg.check && m3u8) row.live = await checkLive(m3u8);
      return row;
    }
  );

  return results;
}

/**
 * m3u8 한 개가 지금 송출 중인지 확인한다.
 * @returns {Promise<"live"|"empty"|"dead">}
 *   live  : 재생목록에 실제 영상 조각(.ts/#EXTINF)이 있음 → 재생 가능
 *   empty : 서버는 응답하나 조각이 없음 → 일시적으로 끊김 가능
 *   dead  : 응답 없음/에러 → 주소가 죽음(주소 변경 의심)
 */
export async function checkLive(m3u8, { timeoutMs = 8000 } = {}) {
  try {
    let text = await fetchPlaylist(m3u8, timeoutMs);
    if (!text.includes("#EXTM3U")) return "dead";

    // 마스터 재생목록이면 하위 variant 한 개를 따라가 본다.
    if (!/#EXTINF/i.test(text) && /\.m3u8/i.test(text)) {
      const variant = (text.match(/^[^#\s].*\.m3u8[^\s]*/im) || [])[0];
      if (variant) {
        const variantUrl = new URL(variant.trim(), m3u8).href;
        text = await fetchPlaylist(variantUrl, timeoutMs);
      }
    }
    return /#EXTINF|\.ts/i.test(text) ? "live" : "empty";
  } catch {
    return "dead";
  }
}

/**
 * 이전 결과(prev)와 현재 결과(curr)를 slug 기준으로 비교한다.
 * @returns {{added:[], removed:[], changed:[], same:number}}
 */
export function diffResults(prev, curr) {
  const prevMap = new Map(prev.map((d) => [d.slug, d]));
  const currMap = new Map(curr.map((d) => [d.slug, d]));
  const added = [];
  const changed = [];
  let same = 0;
  for (const [slug, c] of currMap) {
    const p = prevMap.get(slug);
    if (!p) added.push(c);
    else if (p.m3u8 !== c.m3u8)
      changed.push({ slug, name: c.name, from: p.m3u8, to: c.m3u8 });
    else same++;
  }
  const removed = prev.filter((p) => !currMap.has(p.slug));
  return { added, removed, changed, same };
}

// ════════════════════════════════════════════════════════════════
//  내부 단계
// ════════════════════════════════════════════════════════════════

// 1) 게시판 목록 -> 글 ID 수집
async function collectPostIds(cfg) {
  const ids = new Set();
  for (let page = 1; page <= cfg.maxPages; page++) {
    let html;
    try {
      html = await fetchText(`${BASE}${BOARD}?page=${page}`, cfg);
    } catch {
      break;
    }
    const before = ids.size;
    for (const m of html.matchAll(/\/jeju_cctv\/(\d+)\b/g)) ids.add(Number(m[1]));
    if (ids.size === before) break; // 새 글 없으면 마지막 페이지
    await sleep(cfg.delay);
  }
  return [...ids].sort((a, b) => a - b);
}

// 2) 글 -> 이름 + 플레이어(.php) URL
async function extractPlayer(postId, cfg) {
  const url = `${BASE}${BOARD}/${postId}`;
  const html = await fetchText(url, cfg);
  const rawTitle = (html.match(/<title>([^<]*)<\/title>/i) || [])[1] || "";
  const name = decodeEntities(rawTitle).replace(/-CCTV\s*$/i, "").trim();
  const playerUrl = (html.match(
    /https?:\/\/[^"'\s<>]*\/cctv\/[A-Za-z0-9_-]+\.php/i
  ) || [])[0];
  return { postId, postUrl: url, name, playerUrl: playerUrl || null };
}

// 3) 플레이어 .php -> m3u8
async function extractStream(playerUrl, cfg) {
  const html = await fetchText(playerUrl, cfg);
  const fromSource = (html.match(
    /<source[^>]*\bsrc=["']([^"']+\.m3u8[^"']*)["']/i
  ) || [])[1];
  const anyM3u8 = (html.match(/[a-z]+:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*/i) || [])[0];
  return fromSource || anyM3u8 || null;
}

// ════════════════════════════════════════════════════════════════
//  HTTP / 유틸
// ════════════════════════════════════════════════════════════════
async function fetchText(url, cfg) {
  const retries = cfg.retries ?? DEFAULTS.retries;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Referer: BASE + "/" },
        redirect: "follow",
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      if (attempt === retries) throw new Error(`fetch 실패 ${url}: ${err.message}`);
      await sleep(500 * (attempt + 1));
    }
  }
}

async function fetchPlaylist(url, timeoutMs) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

// 동시성 제한 실행 (워커마다 delay 간격 유지)
async function mapLimit(items, limit, delay, worker) {
  const results = new Array(items.length);
  let i = 0;
  async function run() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await safe(() => worker(items[idx], idx));
      if (delay) await sleep(delay);
    }
  }
  await Promise.all(Array.from({ length: limit }, run));
  return results;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function safe(fn) {
  try {
    return await fn();
  } catch (e) {
    return { error: e.message };
  }
}
function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) continue;
    const key = argv[i].slice(2);
    const val = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
    out[key] = val;
  }
  return out;
}

// ════════════════════════════════════════════════════════════════
//  CLI 진입점 (import 시에는 실행되지 않음)
// ════════════════════════════════════════════════════════════════
const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const a = parseArgs(process.argv.slice(2));
  const cfg = {
    maxPages: Number(a["max-pages"] ?? DEFAULTS.maxPages),
    concurrency: Number(a["concurrency"] ?? DEFAULTS.concurrency),
    delay: Number(a["delay"] ?? DEFAULTS.delay),
    retries: Number(a["retries"] ?? DEFAULTS.retries),
    check: Boolean(a["check"]),
  };
  const OUT = resolve(__dirname, "output", String(a["out"] ?? "cctv-streams.json"));

  (async () => {
    console.log(`수집 시작 (check=${cfg.check}, diff=${Boolean(a.diff)})...`);
    const curr = await crawlCctv(cfg);
    const ok = curr.filter((x) => x.m3u8);
    console.log(`수집 완료: 총 ${curr.length}건, m3u8 ${ok.length}건`);

    if (cfg.check) {
      const live = curr.filter((x) => x.live === "live").length;
      const empty = curr.filter((x) => x.live === "empty").length;
      const dead = curr.filter((x) => x.live === "dead").length;
      console.log(`라이브 체크: 정상 ${live} / 빈목록 ${empty} / 죽음 ${dead}`);
      curr
        .filter((x) => x.live && x.live !== "live")
        .forEach((x) => console.log(`  [${x.live}] ${x.name} -> ${x.m3u8}`));
    }

    if (a.diff) {
      const prev = await readFile(OUT, "utf8")
        .then((t) => JSON.parse(t))
        .catch(() => []);
      const d = diffResults(prev, curr);
      console.log(
        `\n변경 비교: 신규 ${d.added.length} / 삭제 ${d.removed.length} / 주소변경 ${d.changed.length} / 동일 ${d.same}`
      );
      d.changed.forEach((c) =>
        console.log(`  [주소변경] ${c.name}\n     ${c.from}\n  -> ${c.to}`)
      );
      d.added.forEach((c) => console.log(`  [신규] ${c.name} -> ${c.m3u8}`));
      d.removed.forEach((c) => console.log(`  [삭제] ${c.name}`));
    }

    await mkdir(dirname(OUT), { recursive: true });
    await writeFile(OUT, JSON.stringify(curr, null, 2), "utf8");
    console.log(`\n저장: ${OUT}`);
  })().catch((e) => {
    console.error("크롤러 오류:", e);
    process.exit(1);
  });
}
