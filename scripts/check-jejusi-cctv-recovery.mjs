/** 제주시권 CCTV 복구 점검 (읽기 전용 — 매일 예약 작업용)
 * - 실행: node scripts/check-jejusi-cctv-recovery.mjs
 * - 1) funjeju.com 재생 경로(CF Worker → Vultr → 원본)로 제주시권 카메라 실제 재생 확인
 * - 2) funjeju.com 이 안 되면 외부 사이트(trendworld 곽지)가 재생되는지 확인 — 같은 원본을 쓰므로 원본 복구 신호
 * - 장애 팝업은 사이트가 스스로 Worker status로 판단해 안 띄우므로, 이 스크립트는 상태 보고만 한다
 * - 마지막 줄에 RESULT {...} JSON 출력
 */
const WORKER = "https://cctv.tuberecipe.co.kr/cctv";
const CHECK_IDS = ["gwakji", "gimnyeong", "woljeong", "hyeopjae"];
const EXTERNAL_PAGE = "http://cctv.trendworld.kr/cctv/gwakji.php";
const OUR_GWAKJI_ORIGIN = "http://211.114.96.121:1935/jejusi6/11-16.stream/playlist.m3u8";

const funjejuHeaders = { Origin: "https://funjeju.com", Referer: "https://funjeju.com/" };

async function getText(url, headers, timeoutMs = 20000) {
  try {
    const r = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
    return { status: r.status, text: r.ok ? await r.text() : "" };
  } catch (e) {
    return { status: 0, text: "", error: String(e?.name || e) };
  }
}

// 마스터 m3u8 → 첫 하위 m3u8(chunklist)까지 따라가서 #EXTINF(세그먼트)가 있으면 "재생 중"
async function isPlaying(url, headers) {
  const master = await getText(url, headers);
  if (!master.text.includes("#EXTM3U")) return { ok: false, status: master.status, error: master.error };
  if (master.text.includes("#EXTINF")) return { ok: true, status: master.status };
  const sub = master.text.split(/\r?\n/).find((l) => l && !l.startsWith("#"));
  if (!sub) return { ok: false, status: master.status, error: "no variant" };
  const chunk = await getText(new URL(sub, url).toString(), headers);
  return { ok: chunk.text.includes("#EXTINF"), status: chunk.status, error: chunk.error };
}

async function checkFunjeju() {
  const results = {};
  for (const id of CHECK_IDS) results[id] = await isPlaying(`${WORKER}/${id}`, funjejuHeaders);
  const okCount = Object.values(results).filter((r) => r.ok).length;
  return { ok: okCount > 0, okCount, total: CHECK_IDS.length, results };
}

async function checkExternal() {
  const page = await getText(EXTERNAL_PAGE);
  const m3u8 = page.text.match(/https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*/)?.[0];
  if (!m3u8) return { ok: false, error: `page ${page.status}, m3u8 not found` };
  const play = await isPlaying(m3u8);
  return { ok: play.ok, m3u8, sameAsOurs: m3u8 === OUR_GWAKJI_ORIGIN, status: play.status, error: play.error };
}

const result = { at: new Date().toISOString() };
result.funjeju = await checkFunjeju();

if (result.funjeju.ok) {
  result.verdict = "recovered — funjeju.com 재생 중 (팝업은 사이트에서 자동으로 안 뜸)";
} else {
  result.external = await checkExternal();
  if (result.external.ok && result.external.sameAsOurs) {
    result.verdict = "origin-up-funjeju-down — 원본은 재생되는데 funjeju.com 경로(Worker/Vultr)가 실패";
  } else if (result.external.ok) {
    result.verdict = `url-changed — 외부 사이트는 새 주소로 재생 중: ${result.external.m3u8}`;
  } else {
    result.verdict = "still-down — 원본 미복구";
  }
}

console.log("RESULT " + JSON.stringify(result));
