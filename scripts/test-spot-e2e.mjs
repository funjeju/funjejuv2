/** 틀린그림 파이프라인 E2E: 테스트 장면 생성 → /api/admin/spot/variant 호출 → 결과 저장 */
import sharp from "sharp";
import fs from "node:fs";

const BASE = process.argv[2] || "http://localhost:49463";
const OUT = "C:/tmp/spot-test";
fs.mkdirSync(OUT, { recursive: true });

// 제주 해변 느낌의 테스트 장면 (객체가 또렷해서 출제하기 좋음)
const svg = `<svg width="1024" height="683" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8ecae6"/><stop offset="1" stop-color="#cdeefd"/>
    </linearGradient>
    <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#219ebc"/><stop offset="1" stop-color="#126782"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="420" fill="url(#sky)"/>
  <circle cx="850" cy="100" r="55" fill="#ffb703"/>
  <ellipse cx="220" cy="110" rx="70" ry="24" fill="#ffffff" opacity="0.9"/>
  <ellipse cx="300" cy="130" rx="50" ry="18" fill="#ffffff" opacity="0.85"/>
  <ellipse cx="560" cy="80" rx="60" ry="20" fill="#ffffff" opacity="0.9"/>
  <path d="M390 150 q15 -14 30 0 q15 -14 30 0" stroke="#333" stroke-width="4" fill="none"/>
  <path d="M460 120 q12 -11 24 0 q12 -11 24 0" stroke="#333" stroke-width="3.5" fill="none"/>
  <rect y="420" width="1024" height="160" fill="url(#sea)"/>
  <path d="M640 470 l60 0 l-12 26 l-36 0 z" fill="#e63946"/>
  <rect x="668" y="430" width="5" height="40" fill="#6b4226"/>
  <path d="M673 432 l32 16 l-32 8 z" fill="#f1faee"/>
  <rect y="580" width="1024" height="103" fill="#f4e8c1"/>
  <circle cx="140" cy="620" r="16" fill="#9b9b9b"/>
  <circle cx="180" cy="635" r="11" fill="#7d7d7d"/>
  <circle cx="450" cy="640" r="20" fill="#e76f51" stroke="#c1554b" stroke-width="3"/>
  <circle cx="450" cy="640" r="8" fill="#f9c74f"/>
  <rect x="820" y="540" width="10" height="80" fill="#6b4226"/>
  <path d="M825 545 q-50 -30 -85 -8 q45 5 85 12 z" fill="#2a9d8f"/>
  <path d="M825 545 q50 -30 85 -8 q-45 5 -85 12 z" fill="#2a9d8f"/>
  <path d="M825 545 q-15 -45 -50 -52 q25 25 48 54 z" fill="#43aa8b"/>
  <path d="M825 545 q15 -45 50 -52 q-25 25 -48 54 z" fill="#43aa8b"/>
</svg>`;

const origPng = await sharp(Buffer.from(svg)).png().toBuffer();
fs.writeFileSync(`${OUT}/input.png`, origPng);
console.log("테스트 이미지 생성:", origPng.length, "bytes");

// 로그인 → 쿠키
const auth = await fetch(`${BASE}/api/admin/auth`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ password: "funjeju_admin_2025" }),
});
if (!auth.ok) throw new Error("로그인 실패 " + auth.status);
const cookie = auth.headers.get("set-cookie")?.split(";")[0];
console.log("로그인 OK");

// 변형 생성
console.log("변형 생성 호출 중… (1~3분)");
const t0 = Date.now();
const res = await fetch(`${BASE}/api/admin/spot/variant`, {
  method: "POST",
  headers: { "Content-Type": "application/json", cookie },
  body: JSON.stringify({ origBase64: origPng.toString("base64"), mimeType: "image/png", count: 4, level: "medium" }),
});
const d = await res.json();
console.log("응답:", res.status, "소요", ((Date.now() - t0) / 1000).toFixed(0) + "s");
if (!res.ok) { console.error("실패:", d.error); process.exit(1); }

fs.writeFileSync(`${OUT}/orig.png`, Buffer.from(d.origBase64, "base64"));
fs.writeFileSync(`${OUT}/variant.png`, Buffer.from(d.variantBase64, "base64"));
console.log("markers:", JSON.stringify(d.markers));
console.log("notes:");
d.notes.forEach((n, i) => console.log(`  ${i + 1}. ${n}`));

// 픽셀 검증: 마커 영역 밖이 원본과 동일한지
const a = await sharp(`${OUT}/orig.png`).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const b = await sharp(`${OUT}/variant.png`).removeAlpha().raw().toBuffer({ resolveWithObject: true });
let diffPx = 0, total = a.data.length / 3;
const diffMap = [];
for (let i = 0; i + 2 < a.data.length; i += 3) {
  const dd = Math.max(Math.abs(a.data[i] - b.data[i]), Math.abs(a.data[i+1] - b.data[i+1]), Math.abs(a.data[i+2] - b.data[i+2]));
  if (dd > 14) { diffPx++; diffMap.push(i / 3); }
}
console.log(`달라진 픽셀: ${diffPx}/${total} (${(100 * diffPx / total).toFixed(2)}%)`);

// 달라진 픽셀들이 마커 주변에 모여있는지 (마커에서 12% 반경 밖 변경 = 드리프트)
const W = a.info.width, H = a.info.height;
let outside = 0;
for (const p of diffMap) {
  const x = ((p % W) / W) * 100, y = (Math.floor(p / W) / H) * 100;
  const near = d.markers.some((m) => Math.abs(m.x - x) < 14 && Math.abs(m.y - y) < 14);
  if (!near) outside++;
}
console.log(`마커 반경 밖 변경 픽셀: ${outside} (0 기대 — 드리프트 없음 검증)`);
