/**
 * 제주 관광지 Knowledge Graph → Firestore 임포트
 *
 * 실행 방법:
 *   1. Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성
 *      → 다운로드한 JSON을 scripts/serviceAccount.json 으로 저장
 *   2. node scripts/import-places.js
 *
 * 또는 환경변수로:
 *   GOOGLE_APPLICATION_CREDENTIALS=scripts/serviceAccount.json node scripts/import-places.js
 */

const fs    = require("fs");
const path  = require("path");
const admin = require("firebase-admin");

// ── 환경변수 로드 ─────────────────────────────────────────────
const envPath = path.join(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf-8").split("\n").forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  });
}

const PROJECT_ID  = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const SA_PATH     = path.join(__dirname, "serviceAccount.json");
const DATA_FILE   = path.join(__dirname, "../k-lokal_all-spots_2026-06-04.json");

if (!PROJECT_ID) {
  console.error("❌ NEXT_PUBLIC_FIREBASE_PROJECT_ID 환경변수 없음");
  process.exit(1);
}
if (!fs.existsSync(SA_PATH)) {
  console.error(`
❌ 서비스 계정 키 파일이 없습니다.

해결 방법:
  1. Firebase 콘솔 열기: https://console.firebase.google.com/project/${PROJECT_ID}/settings/serviceaccounts/adminsdk
  2. "새 비공개 키 생성" 클릭 → JSON 다운로드
  3. 다운로드한 파일을 이 경로로 복사:
     ${SA_PATH}
  4. 다시 실행: node scripts/import-places.js
`);
  process.exit(1);
}
if (!fs.existsSync(DATA_FILE)) {
  console.error(`❌ 데이터 파일 없음: ${DATA_FILE}`);
  process.exit(1);
}

// ── Firebase Admin 초기화 ─────────────────────────────────────
admin.initializeApp({
  credential: admin.credential.cert(require(SA_PATH)),
  projectId: PROJECT_ID,
});
const db = admin.firestore();

// ── 변환 함수 ─────────────────────────────────────────────────
function slugify(name) {
  return name.trim().replace(/\s+/g, "-").replace(/[^\w가-힣ㄱ-ㅎㅏ-ㅣ-]/g, "");
}

function transform(p) {
  const attr = p.attributes ?? {};
  return {
    place_id:          p.place_id ?? "",
    place_name:        p.place_name ?? "",
    slug:              slugify(p.place_name ?? p.place_id),
    description:       p.description ?? "",
    expert_tip:        p.expert_tip_raw ?? "",
    region:            p.region ?? "",
    address:           p.address ?? "",
    status:            p.status ?? "draft",
    data_completeness: p.data_completeness ?? "basic",

    lat: p.location?.latitude  ?? 0,
    lng: p.location?.longitude ?? 0,

    categories:    (p.categories    ?? []).map(String),
    categories_kr: (p.categories_kr ?? []).map(String),
    tags:          (p.tags ?? []).map((t) => String(t).trim()).filter(Boolean),

    withPets:            attr.withPets === "가능",
    withKids:            attr.withKids === "가능",
    admissionFee:        attr.admissionFee     ?? "",
    parkingDifficulty:   attr.parkingDifficulty ?? "",
    recommendedSeasons:  (attr.recommendedSeasons ?? []).map(String),
    targetAudience:      (attr.targetAudience     ?? []).map(String),

    phone:    p.public_info?.phone_number    ?? "",
    website:  p.public_info?.website_url     ?? "",
    hours:    p.public_info?.operating_hours ?? "",

    imageUrl: p.images?.[0]?.url ?? "",
    images:   (p.images ?? []).slice(0, 5).map((img) => ({
      url:     img.url     ?? "",
      caption: img.caption ?? "",
    })),

    updatedAt: p.updated_at ?? p.created_at ?? "",
  };
}

// ── 메인 ─────────────────────────────────────────────────────
async function main() {
  console.log("📂 JSON 파일 로드 중...");
  const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  console.log(`✅ ${data.length}개 레코드\n`);

  const BATCH_SIZE = 500;  // Firestore 배치 최대 500
  let success = 0, failed = 0;

  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const chunk = data.slice(i, i + BATCH_SIZE);
    const batch = db.batch();

    for (const place of chunk) {
      const docRef = db.collection("places").doc(place.place_id);
      batch.set(docRef, transform(place), { merge: true });
    }

    try {
      await batch.commit();
      success += chunk.length;
    } catch (e) {
      console.error(`\n❌ 배치 오류 (${i}~${i + BATCH_SIZE}):`, e.message);
      failed += chunk.length;
    }

    const pct = Math.round(((i + BATCH_SIZE) / data.length) * 100);
    process.stdout.write(
      `\r진행: ${Math.min(i + BATCH_SIZE, data.length)}/${data.length} (${Math.min(pct, 100)}%) ✅${success} ❌${failed}`
    );
  }

  console.log(`\n\n🎉 임포트 완료!`);
  console.log(`   ✅ 성공: ${success}개`);
  console.log(`   ❌ 실패: ${failed}개`);
  console.log(`\nFirestore: https://console.firebase.google.com/project/${PROJECT_ID}/firestore/data/places`);

  process.exit(0);
}

main().catch((e) => {
  console.error("\n❌ 치명적 오류:", e);
  process.exit(1);
});
