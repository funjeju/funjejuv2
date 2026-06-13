/**
 * Firestore `cctvs` 컬렉션에 신규 CCTV upsert (일회용)
 * - 신규 5개 + tapdong 주소 교체
 * - 실행: node scripts/seed-firestore-cctvs.mjs
 * - .env.local 의 FIREBASE_SERVICE_ACCOUNT 사용
 */
import { readFileSync } from "node:fs";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// .env.local 에서 FIREBASE_SERVICE_ACCOUNT 한 줄 추출
const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const m = env.match(/^FIREBASE_SERVICE_ACCOUNT=(.*)$/m);
if (!m) { console.error("FIREBASE_SERVICE_ACCOUNT 못 찾음"); process.exit(1); }
const svc = JSON.parse(m[1].replace(/\r$/, ""));

if (!getApps().length) {
  initializeApp({ credential: cert(svc), projectId: svc.project_id });
}
const db = getFirestore();

const ROWS = [
  { id:"tapdong",     name:"탑동서부두", region:"제주시 탑동",    category:"관광지", description:"제주시 탑동 서부두 해안가 일대입니다.", lat:33.514, lng:126.521, originUrl:"http://211.114.96.121:1935/jejusi6/11-11.stream/playlist.m3u8" },
  { id:"donghandugi", name:"동한두기",   region:"제주시 용담동",  category:"포구",   description:"용연·한두기 인근 동한두기 해안입니다.", lat:33.514, lng:126.508, originUrl:"http://211.114.96.121:1935/jejusi6/11-12.stream/playlist.m3u8" },
  { id:"iho",         name:"이호해변",   region:"제주시 이호동",  category:"해변",   description:"제주시 도심에서 가까운 이호테우 해변입니다.", lat:33.498, lng:126.453, originUrl:"http://211.114.96.121:1935/jejusi7/11-30T.stream/playlist.m3u8" },
  { id:"sechon",      name:"세천포구",   region:"제주시 이호동",  category:"포구",   description:"이호 서쪽 세천 해안 포구입니다.", lat:33.499, lng:126.444, originUrl:"http://211.34.191.215:1935/live/1-149.stream/playlist.m3u8" },
  { id:"pyoseon",     name:"표선항",     region:"서귀포시 표선면", category:"항구",  description:"서귀포 동부 표선 해안의 항구입니다.", lat:33.324, lng:126.838, originUrl:"http://211.34.191.215:1935/live/1-77.stream/playlist.m3u8" },
  { id:"daepo",       name:"대포포구",   region:"서귀포시 중문동", category:"포구",  description:"중문 인근 대포동 주상절리 해안 포구입니다.", lat:33.234, lng:126.428, originUrl:"http://211.34.191.215:1935/live/1-115.stream/playlist.m3u8" },
];

const batch = db.batch();
for (const r of ROWS) {
  const { id, ...rest } = r;
  batch.set(db.collection("cctvs").doc(id), { ...rest, active: true, updatedAt: new Date().toISOString() }, { merge: true });
}
await batch.commit();
console.log(`✅ Firestore cctvs upsert 완료: ${ROWS.map(r=>r.id).join(", ")}`);
process.exit(0);
