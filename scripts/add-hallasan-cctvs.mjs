/** Firestore `cctvs`에 한라산 CCTV 5종 upsert (일회용)
 * - 실행: node scripts/add-hallasan-cctvs.mjs
 * - 추가 후 어드민(/admin/cctv)에서 수정·삭제 가능, /api/proxy-config로 프록시 자동 동기화
 */
import { readFileSync } from "node:fs";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const m = env.match(/^FIREBASE_SERVICE_ACCOUNT=(.*)$/m);
if (!m) { console.error("FIREBASE_SERVICE_ACCOUNT 못 찾음"); process.exit(1); }
const svc = JSON.parse(m[1].replace(/\r$/, ""));
if (!getApps().length) initializeApp({ credential: cert(svc), projectId: svc.project_id });
const db = getFirestore();

const ROWS = [
  { id:"halla_baengnokdam", name:"한라산 백록담",  region:"한라산", category:"한라산", direction:"남", description:"한라산 정상 백록담 실시간 영상입니다.", lat:33.3617, lng:126.5333, originUrl:"http://119.65.216.155:1935/live/cctv01.stream_360p/playlist.m3u8" },
  { id:"halla_wanggwanneung", name:"한라산 왕관릉", region:"한라산", category:"한라산", direction:"남", description:"한라산 왕관릉 실시간 영상입니다.",       lat:33.3700, lng:126.5430, originUrl:"http://119.65.216.155:1935/live/cctv02.stream_360p/playlist.m3u8" },
  { id:"halla_witse",       name:"한라산 윗세오름", region:"한라산", category:"한라산", direction:"남", description:"한라산 윗세오름 실시간 영상입니다.",     lat:33.3556, lng:126.4869, originUrl:"http://119.65.216.155:1935/live/cctv03.stream_360p/playlist.m3u8" },
  { id:"halla_eoseungsaeng",name:"한라산 어승생악", region:"한라산", category:"한라산", direction:"북", description:"한라산 어승생악 실시간 영상입니다.",     lat:33.3897, lng:126.4836, originUrl:"http://119.65.216.155:1935/live/cctv04.stream_360p/playlist.m3u8" },
  { id:"halla_1100",        name:"한라산 1100도로", region:"한라산", category:"한라산", direction:"남", description:"한라산 1100도로(1100고지) 실시간 영상입니다.", lat:33.3592, lng:126.4639, originUrl:"http://119.65.216.155:1935/live/cctv05.stream_360p/playlist.m3u8" },
];

const now = new Date().toISOString();
const batch = db.batch();
for (const r of ROWS) {
  const { id, ...rest } = r;
  batch.set(db.collection("cctvs").doc(id), { ...rest, active: true, addedAt: now, updatedAt: now }, { merge: true });
}
await batch.commit();
console.log(`✅ Firestore upsert: ${ROWS.map(r => r.id).join(", ")}`);

// ── 중요: Worker는 Cloudflare KV(CCTV_ORIGINS)에서 origin을 읽는다.
//    Firestore에만 쓰면 Worker가 404 → 영상이 안 나온다. KV에도 반드시 동기화.
const get = (k) => { const mm = env.match(new RegExp("^" + k + "=(.*)$", "m")); return mm ? mm[1].replace(/\r$/, "").replace(/^"|"$/g, "") : ""; };
const ACCOUNT_ID = get("CLOUDFLARE_ACCOUNT_ID"), KV_NS_ID = get("CLOUDFLARE_KV_NAMESPACE_ID"), API_TOKEN = get("CLOUDFLARE_API_TOKEN");
if (ACCOUNT_ID && KV_NS_ID && API_TOKEN) {
  const KV = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${KV_NS_ID}/values`;
  for (const r of ROWS) {
    const { id, name, region, category, originUrl } = r;
    const res = await fetch(`${KV}/${id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name, region, category, originUrl, active: true, addedAt: now }),
    });
    console.log(res.ok ? `✅ KV ${id}` : `❌ KV ${id} ${res.status}`);
  }
} else {
  console.warn("⚠️ Cloudflare KV 환경변수 누락 — KV 동기화 스킵 (Worker가 404 날 수 있음)");
}
process.exit(0);
