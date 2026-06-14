/** Firestore `cctvs` 컬렉션에 신규 CCTV upsert (일회용)
 * - 실행: node scripts/seed-firestore-cctvs.mjs
 * - .env.local 의 FIREBASE_SERVICE_ACCOUNT 사용
 */
import { readFileSync } from "node:fs";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const m = env.match(/^FIREBASE_SERVICE_ACCOUNT=(.*)$/m);
if (!m) { console.error("FIREBASE_SERVICE_ACCOUNT 못 찾음"); process.exit(1); }
const svc = JSON.parse(m[1].replace(/\r$/, ""));

if (!getApps().length) {
  initializeApp({ credential: cert(svc), projectId: svc.project_id });
}
const db = getFirestore();

const ROWS = [
  { id:"beophwan_po", name:"법환포구",   region:"서귀포시 법환동", category:"포구", description:"서귀포 법환동 해안 포구입니다.", lat:33.2447, lng:126.5305, originUrl:"http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100007/0/1/1.m3u8" },
  { id:"beophwan_eo", name:"법환어촌계", region:"서귀포시 법환동", category:"포구", description:"법환 어촌계 앞 해안입니다.", lat:33.2440, lng:126.5285, originUrl:"http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100008/0/1/1.m3u8" },
  { id:"onpyeong",    name:"온평어촌계", region:"서귀포시 성산읍", category:"포구", description:"성산읍 온평리 어촌계 해안입니다.", lat:33.3920, lng:126.9010, originUrl:"http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100011/0/1/1.m3u8" },
];

const batch = db.batch();
for (const r of ROWS) {
  const { id, ...rest } = r;
  batch.set(db.collection("cctvs").doc(id), { ...rest, active: true, updatedAt: new Date().toISOString() }, { merge: true });
}
await batch.commit();
console.log(`✅ Firestore cctvs upsert: ${ROWS.map(r=>r.id).join(", ")}`);
process.exit(0);
