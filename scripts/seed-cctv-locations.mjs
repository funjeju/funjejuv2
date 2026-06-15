/** locations.json → Firestore `cctv_locations` 시드 + 가드레일 검증
 * 실행: node scripts/seed-cctv-locations.mjs
 *  - G5: nearby id가 실제 cctvs에 존재하는지 검증(없으면 경고·제거)
 *  - G2: weatherNote+faq 본문 ≥ 400자 점검(미달 경고)
 *  - updatedAt: 실제 콘텐츠 주입 시각(ISO) 기록 (sitemap lastmod용)
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
db.settings({ ignoreUndefinedProperties: true });

const locs = JSON.parse(readFileSync(new URL("../locations.json", import.meta.url), "utf8"));

// 실제 cctv id 집합 (G5 검증용) + 메타(category·region — viewType 추론용)
const cctvSnap = await db.collection("cctvs").get();
const realIds = new Set(cctvSnap.docs.map((d) => d.id));
const cctvMeta = new Map(cctvSnap.docs.map((d) => [d.id, d.data()]));

// category·id → viewType 추론 (json에 명시 없으면)
function inferViewType(id, cat) {
  if (id.startsWith("udo_") || id.startsWith("chuja_")) return "island";
  if (id.startsWith("halla") || cat === "한라산") return "mountain";
  if (cat === "공항") return "airport";
  if (cat === "해변") return "beach";
  if (cat === "항구" || cat === "포구") return "port";
  if (cat === "관광지") return "landmark";
  return "city";
}

const now = new Date().toISOString();
let ok = 0;
const warnings = [];

const batch = db.batch();
for (const l of locs) {
  if (!realIds.has(l.id)) { warnings.push(`❌ ${l.id}: 실제 cctv에 없는 id — 스킵`); continue; }
  // G5: nearby 유효성
  const validNearby = (l.nearby || []).filter((n) => realIds.has(n));
  const dropped = (l.nearby || []).filter((n) => !realIds.has(n));
  if (dropped.length) warnings.push(`⚠️ ${l.id}: nearby 무효 id 제거 → ${dropped.join(", ")}`);
  // G2: 분량
  const bodyLen = (l.about || "").length + (l.weatherNote || "").length + (l.faq || []).reduce((s, f) => s + (f.a || "").length, 0);
  if (bodyLen < 400) warnings.push(`⚠️ ${l.id}: 본문 ${bodyLen}자 (<400, 보완 권장)`);

  const meta = cctvMeta.get(l.id) || {};
  const viewType = l.viewType || inferViewType(l.id, meta.category);
  const region = l.region || meta.region || "";
  const doc = { ...l, viewType, region, nearby: validNearby, updatedAt: now };
  batch.set(db.collection("cctv_locations").doc(l.id), doc, { merge: true });
  ok++;
}
await batch.commit();

console.log(`✅ 시드 완료: ${ok}개 → cctv_locations`);
if (warnings.length) { console.log("\n— 가드레일 경고 —"); warnings.forEach((w) => console.log(w)); }
const needsReview = locs.filter((l) => l.needsReview).map((l) => l.id);
console.log(`\nNEEDS_REVIEW (검수 필요): ${needsReview.length}개 — ${needsReview.join(", ")}`);
process.exit(0);
