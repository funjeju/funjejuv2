// scripts/probe-cctv.mjs
//
// cctv-streams.json 의 m3u8들을 두 번(간격 두고) 찍어
// "나옴/안나옴" + "계속 틀어놔도 되는지(안정/끊김)" 를 분류한다.
//
// 판정:
//   stable  : 두 번 다 응답 + 재생목록이 전진(시퀀스/마지막조각 변함) → 계속 재생 OK
//   flaky   : 응답은 하나 전진이 없음(멈춤) 또는 한 번만 응답 → 끊김 잦음
//   down    : 두 번 다 응답 없음 → 안 나옴(또는 이 PC에서 차단)
//
// 사용: node scripts/probe-cctv.mjs [--in cctv-streams.json] [--gap 12000] [--conc 8]

import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36";

const a = Object.fromEntries(
  process.argv.slice(2).reduce((acc, t, i, arr) => {
    if (t.startsWith("--")) acc.push([t.slice(2), arr[i + 1]]);
    return acc;
  }, [])
);
const IN = resolve(__dirname, "output", a.in || "cctv-streams.json");
const OUT = resolve(__dirname, "output", a.out || "cctv-status.json");
const GAP = Number(a.gap || 12000);
const CONC = Number(a.conc || 8);
const TIMEOUT = 8000;

// 미디어 재생목록을 받아 { seq, segs, lastSeg } 추출 (마스터면 variant 1개 따라감)
async function snapshot(m3u8) {
  let text = await get(m3u8);
  if (!/#EXTINF/i.test(text) && /\.m3u8/i.test(text)) {
    const v = (text.match(/^[^#\s].*\.m3u8[^\s]*/im) || [])[0];
    if (v) text = await get(new URL(v.trim(), m3u8).href);
  }
  const seq = (text.match(/#EXT-X-MEDIA-SEQUENCE:(\d+)/i) || [])[1] ?? null;
  const segs = [...text.matchAll(/^[^#\s].*\.ts[^\s]*/gim)].map((m) => m[0].trim());
  return { seq, segCount: segs.length, lastSeg: segs.at(-1) ?? null };
}

async function get(url) {
  const r = await fetch(url, {
    headers: { "User-Agent": UA, Referer: "http://cctv.trendworld.kr/" },
    redirect: "follow",
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return await r.text();
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx], idx);
      }
    })
  );
  return out;
}

(async () => {
  const list = JSON.parse(await readFile(IN, "utf8")).filter((d) => d.m3u8);
  console.log(`프로브 시작: ${list.length}개, 간격 ${GAP / 1000}s 두고 2회 측정\n`);

  console.log("1차 측정...");
  const A = await mapLimit(list, CONC, async (d) => {
    try { return await snapshot(d.m3u8); } catch (e) { return { error: e.message }; }
  });

  console.log(`${GAP / 1000}초 대기...`);
  await new Promise((r) => setTimeout(r, GAP));

  console.log("2차 측정...");
  const B = await mapLimit(list, CONC, async (d) => {
    try { return await snapshot(d.m3u8); } catch (e) { return { error: e.message }; }
  });

  const result = list.map((d, i) => {
    const x = A[i], y = B[i];
    const okA = x && !x.error, okB = y && !y.error;
    let status;
    if (!okA && !okB) status = "down";
    else if (okA && okB) {
      // 두 번 다 응답 → 전진했는지 확인
      const advanced =
        (x.seq != null && y.seq != null && x.seq !== y.seq) ||
        (x.lastSeg && y.lastSeg && x.lastSeg !== y.lastSeg);
      status = advanced ? "stable" : "flaky";
    } else status = "flaky"; // 한 번만 응답
    return { name: d.name, slug: d.slug, host: new URL(d.m3u8).host, m3u8: d.m3u8, status };
  });

  const by = (s) => result.filter((r) => r.status === s);
  console.log(`\n=== 결과 ===`);
  console.log(`stable(계속재생OK) ${by("stable").length} / flaky(끊김잦음) ${by("flaky").length} / down(안나옴) ${by("down").length}`);

  await writeFile(OUT, JSON.stringify(result, null, 2), "utf8");
  console.log(`저장: ${OUT}`);
})().catch((e) => { console.error(e); process.exit(1); });
