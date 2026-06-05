/**
 * Firestore PATCH 방식 임포트 (batchWrite 우회)
 * 20개씩 병렬 처리 → 약 3~5분
 */

const fs   = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "../.env.local");
fs.readFileSync(envPath, "utf-8").split("\n").forEach((line) => {
  const m = line.match(/^([^#=]+)=(.*)/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
});

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const API_KEY    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const FS_BASE    = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const DATA_FILE  = path.join(__dirname, "../k-lokal_all-spots_2026-06-04.json");

function toFsVal(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "string")  return { stringValue: val };
  if (typeof val === "number")  return { doubleValue: val };
  if (typeof val === "boolean") return { booleanValue: val };
  if (Array.isArray(val))       return { arrayValue: { values: val.map(toFsVal) } };
  return { nullValue: null };
}

function transform(p) {
  const attr = p.attributes ?? {};
  const slug = (p.place_name ?? p.place_id).trim().replace(/\s+/g, "-").replace(/[^\w가-힣ㄱ-ㅎ-]/g, "");
  return {
    place_id: p.place_id ?? "",
    place_name: p.place_name ?? "",
    slug,
    description: p.description ?? "",
    expert_tip: p.expert_tip_raw ?? "",
    region: p.region ?? "",
    address: p.address ?? "",
    status: p.status ?? "draft",
    data_completeness: p.data_completeness ?? "basic",
    lat: p.location?.latitude ?? 0,
    lng: p.location?.longitude ?? 0,
    categories: (p.categories ?? []).map(String),
    categories_kr: (p.categories_kr ?? []).map(String),
    tags: (p.tags ?? []).map(t => String(t).trim()).filter(Boolean),
    withPets: attr.withPets === "가능",
    withKids: attr.withKids === "가능",
    admissionFee: attr.admissionFee ?? "",
    parkingDifficulty: attr.parkingDifficulty ?? "",
    recommendedSeasons: (attr.recommendedSeasons ?? []).map(String),
    targetAudience: (attr.targetAudience ?? []).map(String),
    phone: p.public_info?.phone_number ?? "",
    website: p.public_info?.website_url ?? "",
    hours: p.public_info?.operating_hours ?? "",
    imageUrl: p.images?.[0]?.url ?? "",
    updatedAt: p.updated_at ?? p.created_at ?? "",
  };
}

async function patchDoc(id, data) {
  const fields = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, toFsVal(v)]));
  const res = await fetch(`${FS_BASE}/places/${encodeURIComponent(id)}?key=${API_KEY}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${res.status}: ${err.slice(0, 100)}`);
  }
}

async function main() {
  console.log("📂 JSON 로드 중...");
  const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  console.log(`✅ ${data.length}개 레코드\n`);

  const PARALLEL = 20; // 동시 20개 처리
  let success = 0, failed = 0;
  const errors = [];

  for (let i = 0; i < data.length; i += PARALLEL) {
    const chunk = data.slice(i, i + PARALLEL);
    await Promise.all(chunk.map(async (p) => {
      try {
        await patchDoc(p.place_id, transform(p));
        success++;
      } catch (e) {
        failed++;
        if (errors.length < 5) errors.push(`${p.place_id}: ${e.message}`);
      }
    }));

    const done = Math.min(i + PARALLEL, data.length);
    const pct  = Math.round((done / data.length) * 100);
    process.stdout.write(`\r  진행: ${done}/${data.length} (${pct}%) ✅${success} ❌${failed}`);
  }

  console.log(`\n\n🎉 완료!`);
  console.log(`   ✅ 성공: ${success}개`);
  if (failed > 0) {
    console.log(`   ❌ 실패: ${failed}개`);
    errors.forEach(e => console.log("   -", e));
  }
  console.log(`\n🔗 https://console.firebase.google.com/project/${PROJECT_ID}/firestore/data/places`);
  console.log(`\n⚠️  완료 후 Firestore 규칙에서 places write를 if false로 변경하세요.`);
}

main().catch(e => { console.error(e); process.exit(1); });
