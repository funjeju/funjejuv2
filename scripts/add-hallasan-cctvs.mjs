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
console.log(`✅ 한라산 CCTV upsert: ${ROWS.map(r => r.id).join(", ")}`);
process.exit(0);
