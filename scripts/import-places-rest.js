/**
 * Firebase Admin SDK 없이 REST API만으로 Firestore에 places 데이터 임포트
 * 필요 조건: Firestore 규칙에서 places 쓰기 허용
 *
 * 실행: node scripts/import-places-rest.js
 */

const fs   = require("fs");
const path = require("path");

// .env.local 파싱
const envPath = path.join(__dirname, "../.env.local");
fs.readFileSync(envPath, "utf-8").split("\n").forEach((line) => {
  const m = line.match(/^([^#=]+)=(.*)/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
});

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const API_KEY    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const FS_BASE    = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const DATA_FILE  = path.join(__dirname, "../k-lokal_all-spots_2026-06-04.json");

if (!PROJECT_ID || !API_KEY) { console.error("❌ Firebase 환경변수 없음"); process.exit(1); }
if (!fs.existsSync(DATA_FILE)) { console.error("❌ JSON 파일 없음:", DATA_FILE); process.exit(1); }

// ── 권한 사전 체크 ────────────────────────────────────────────
async function checkPermission() {
  const res = await fetch(
    `${FS_BASE}/places?key=${API_KEY}&pageSize=1`,
    { signal: AbortSignal.timeout(5000) }
  );
  if (res.status === 403) {
    console.error(`
❌ Firestore 쓰기 권한 없음

Firebase 콘솔에서 규칙을 아래와 같이 변경하고 [게시] 후 다시 실행하세요:
https://console.firebase.google.com/project/${PROJECT_ID}/firestore/rules

────────────────────────────────────────
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /places/{doc}  { allow read, write: if true; }
    match /cctvs/{doc}   { allow read, write: if true; }
    match /feeds/{doc}   { allow read: if true; allow write: if request.auth != null; }
    match /users/{doc}   { allow read: if true; allow write: if request.auth != null; }
  }
}
────────────────────────────────────────
`);
    process.exit(1);
  }
  return res.ok || res.status === 404; // 404 = collection empty, OK to proceed
}

// ── Firestore 타입 변환 ───────────────────────────────────────
function toFsVal(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "string")  return { stringValue: val };
  if (typeof val === "number")  return { doubleValue: val };
  if (typeof val === "boolean") return { booleanValue: val };
  if (Array.isArray(val))       return { arrayValue: { values: val.map(toFsVal) } };
  return { nullValue: null };
}

function buildWrite(id, fields) {
  return {
    update: {
      name: `projects/${PROJECT_ID}/databases/(default)/documents/places/${id}`,
      fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, toFsVal(v)])),
    },
  };
}

// ── 장소 데이터 변환 ─────────────────────────────────────────
function transform(p) {
  const attr = p.attributes ?? {};
  const slug = (p.place_name ?? p.place_id).trim().replace(/\s+/g, "-").replace(/[^\w가-힣ㄱ-ㅎ-]/g, "");
  return {
    place_id:          p.place_id ?? "",
    place_name:        p.place_name ?? "",
    slug,
    description:       p.description ?? "",
    expert_tip:        p.expert_tip_raw ?? "",
    region:            p.region ?? "",
    address:           p.address ?? "",
    status:            p.status ?? "draft",
    data_completeness: p.data_completeness ?? "basic",
    lat:               p.location?.latitude  ?? 0,
    lng:               p.location?.longitude ?? 0,
    categories:        (p.categories    ?? []).map(String),
    categories_kr:     (p.categories_kr ?? []).map(String),
    tags:              (p.tags ?? []).map((t) => String(t).trim()).filter(Boolean),
    withPets:          attr.withPets === "가능",
    withKids:          attr.withKids === "가능",
    admissionFee:      attr.admissionFee     ?? "",
    parkingDifficulty: attr.parkingDifficulty ?? "",
    recommendedSeasons:(attr.recommendedSeasons ?? []).map(String),
    targetAudience:    (attr.targetAudience     ?? []).map(String),
    phone:             p.public_info?.phone_number    ?? "",
    website:           p.public_info?.website_url     ?? "",
    hours:             p.public_info?.operating_hours ?? "",
    imageUrl:          p.images?.[0]?.url ?? "",
    updatedAt:         p.updated_at ?? p.created_at ?? "",
  };
}

// ── 배치 쓰기 (최대 500건) ────────────────────────────────────
async function batchWrite(writes) {
  const url = `${FS_BASE}:batchWrite?key=${API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ writes }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const err = await res.text();
    if (res.status === 403) throw new Error("PERMISSION_DENIED");
    throw new Error(`batchWrite ${res.status}: ${err.slice(0, 200)}`);
  }
}

// ── 메인 ─────────────────────────────────────────────────────
async function main() {
  console.log("🔍 Firestore 권한 확인 중...");
  await checkPermission();
  console.log("✅ 권한 확인 완료\n");

  console.log("📂 JSON 파일 로드 중...");
  const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  console.log(`✅ ${data.length}개 레코드 로드\n`);

  const BATCH = 500;
  let success = 0, failed = 0;

  for (let i = 0; i < data.length; i += BATCH) {
    const chunk = data.slice(i, i + BATCH);
    const writes = chunk.map((p) => buildWrite(p.place_id, transform(p)));

    try {
      await batchWrite(writes);
      success += chunk.length;
    } catch (e) {
      if (e.message === "PERMISSION_DENIED") {
        console.error("\n❌ 규칙 미변경 — 위 안내대로 Firestore 규칙을 먼저 업데이트하세요.");
        process.exit(1);
      }
      console.error(`\n❌ 배치 오류 (${i}~${i + BATCH}):`, e.message);
      failed += chunk.length;
    }

    const done = Math.min(i + BATCH, data.length);
    const pct  = Math.round((done / data.length) * 100);
    process.stdout.write(`\r  진행: ${done}/${data.length} (${pct}%) ✅${success} ❌${failed}`);
  }

  console.log(`\n\n🎉 임포트 완료!`);
  console.log(`   ✅ 성공: ${success}개`);
  if (failed > 0) console.log(`   ❌ 실패: ${failed}개`);
  console.log(`\n🔗 https://console.firebase.google.com/project/${PROJECT_ID}/firestore/data/places`);
  console.log(`\n⚠️  완료 후 places 규칙을 "allow write: if false"로 되돌리세요.`);
}

main().catch((e) => { console.error("\n❌", e.message); process.exit(1); });
