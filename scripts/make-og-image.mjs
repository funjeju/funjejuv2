/** funjeju.com OG 썸네일(1200x630) 생성 — 로컬(윈도우 한글폰트)에서 1회 렌더 후 커밋 */
import sharp from "sharp";
import { readFileSync } from "node:fs";

const W = 1200, H = 630;
const FONT = "Malgun Gothic, Apple SD Gothic Neo, sans-serif";

const svg = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#5EEAD4"/>
      <stop offset="0.55" stop-color="#38BDF8"/>
      <stop offset="1" stop-color="#2563EB"/>
    </linearGradient>
    <filter id="sh" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#0b3b6b" flood-opacity="0.35"/>
    </filter>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="1040" cy="120" r="220" fill="#ffffff" opacity="0.10"/>
  <circle cx="160" cy="560" r="180" fill="#ffffff" opacity="0.08"/>

  <text x="90" y="200" font-family="${FONT}" font-size="96" font-weight="900" fill="#ffffff" filter="url(#sh)">펀제주</text>
  <text x="92" y="270" font-family="${FONT}" font-size="40" font-weight="800" fill="#FFE08A">제주가 더 FUN해지는 여행</text>

  <text x="92" y="360" font-family="${FONT}" font-size="34" font-weight="600" fill="#ffffff" opacity="0.95">실시간 제주 CCTV · 도민맛집 589곳</text>
  <text x="92" y="408" font-family="${FONT}" font-size="34" font-weight="600" fill="#ffffff" opacity="0.95">AI 도슨트 챗봇 · 여행 일정까지</text>

  <g filter="url(#sh)">
    <rect x="92"  y="470" width="190" height="64" rx="32" fill="#ffffff"/>
    <rect x="300" y="470" width="210" height="64" rx="32" fill="#ffffff"/>
    <rect x="528" y="470" width="170" height="64" rx="32" fill="#ffffff"/>
  </g>
  <text x="187" y="511" font-family="${FONT}" font-size="28" font-weight="800" fill="#2563EB" text-anchor="middle">실시간 CCTV</text>
  <text x="405" y="511" font-family="${FONT}" font-size="28" font-weight="800" fill="#F97316" text-anchor="middle">도민맛집</text>
  <text x="613" y="511" font-family="${FONT}" font-size="28" font-weight="800" fill="#7C3AED" text-anchor="middle">제주tube</text>

  <text x="92" y="586" font-family="${FONT}" font-size="30" font-weight="700" fill="#ffffff" opacity="0.9">funjeju.com</text>
</svg>`;

const base = await sharp(Buffer.from(svg)).png().toBuffer();

// 마스코트 우측 하단 합성
const mascot = await sharp(readFileSync("public/dolmangyi.png"))
  .resize({ height: 520 })
  .toBuffer();
const mMeta = await sharp(mascot).metadata();

await sharp(base)
  .composite([{ input: mascot, left: W - (mMeta.width ?? 380) - 40, top: H - (mMeta.height ?? 520) + 10 }])
  .png()
  .toFile("public/og-image.png");

console.log("✅ public/og-image.png 생성 완료 (1200x630)");
