/**
 * Firestore 규칙이 열릴 때까지 5초마다 확인 → 자동으로 임포트 실행
 * 실행: node scripts/wait-and-import.js
 */

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const envPath = path.join(__dirname, "../.env.local");
fs.readFileSync(envPath, "utf-8").split("\n").forEach((line) => {
  const m = line.match(/^([^#=]+)=(.*)/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
});

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const API_KEY    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

async function checkReady() {
  try {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/places?key=${API_KEY}&pageSize=1`,
      { signal: AbortSignal.timeout(5000) }
    );
    return res.status !== 403;
  } catch { return false; }
}

async function main() {
  console.log("⏳ Firestore 규칙 열릴 때까지 대기 중... (5초마다 확인)");
  console.log("   지금 Firebase 콘솔에서 규칙을 업데이트하세요:\n");
  console.log(`   👉 https://console.firebase.google.com/project/${PROJECT_ID}/firestore/rules\n`);
  console.log("─".repeat(60));
  console.log(`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /places/{doc}  { allow read, write: if true; }
    match /cctvs/{doc}   { allow read, write: if true; }
    match /feeds/{doc}   { allow read: if true; allow write: if request.auth != null; }
    match /users/{doc}   { allow read: if true; allow write: if request.auth != null; }
  }
}`);
  console.log("─".repeat(60));
  console.log("\n저장 후 [게시] 버튼을 누르면 자동으로 임포트가 시작됩니다.\n");

  let attempt = 0;
  while (true) {
    attempt++;
    process.stdout.write(`\r확인 중... (${attempt}회)`);
    const ready = await checkReady();
    if (ready) {
      console.log("\n\n✅ 권한 확인! 임포트를 시작합니다...\n");
      try {
        execSync(`node ${path.join(__dirname, "import-places-rest.js")}`, { stdio: "inherit" });
      } catch (e) {
        console.error("임포트 실패:", e.message);
      }
      break;
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
}

main();
