// 미니미 스프라이트 시트 슬라이스
// 입력:  public/minihompy/sprite-sheet.png  (5열 × 2행, 상=FRONT 하=SIDE, 배경 이미 투명)
// 출력:  public/minihompy/sprites/{kind}-{pose}.png  (트림된 투명 PNG)
//
// 이 시트는 배경이 이미 투명(alpha=0)이라 배경제거 불필요.
// "알파 픽셀 투영"으로 행(밴드 2개)·열(밴드당 5개)을 자동 검출 → 셀 추출 → 트림.
//
// 실행: node scripts/slice-minimi.mjs

import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const SRC = "public/minihompy/sprite-sheet.png";
const OUT = "public/minihompy/sprites";
const COLS = ["haenyeo", "dolharbang", "hallabong", "baram", "gemeunmorae"];
const ROWS = ["front", "side"];
const A = 16;     // alpha 이 값 초과면 내용(불투명) 픽셀
const PAD = 8;    // 셀 bbox 여유

function clusters(counts, minCount, mergeGap, minSize) {
  const runs = [];
  let start = -1;
  for (let i = 0; i < counts.length; i++) {
    const on = counts[i] >= minCount;
    if (on && start < 0) start = i;
    if (!on && start >= 0) { runs.push([start, i - 1]); start = -1; }
  }
  if (start >= 0) runs.push([start, counts.length - 1]);
  const merged = [];
  for (const r of runs) {
    if (merged.length && r[0] - merged[merged.length - 1][1] <= mergeGap) {
      merged[merged.length - 1][1] = r[1];
    } else merged.push([...r]);
  }
  return merged.filter(([a, b]) => b - a + 1 >= minSize);
}

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
const opaque = (x, y) => data[(y * W + x) * 4 + 3] > A;

const rowCounts = new Array(H).fill(0);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (opaque(x, y)) rowCounts[y]++;
const bands = clusters(rowCounts, 12, 28, 60).slice(0, ROWS.length);
console.log("bands(y):", bands);
if (bands.length < ROWS.length) { console.error("행 검출 실패"); process.exit(1); }

await mkdir(OUT, { recursive: true });

for (let r = 0; r < bands.length; r++) {
  const [by0, by1] = bands[r];
  const colCounts = new Array(W).fill(0);
  for (let x = 0; x < W; x++) for (let y = by0; y <= by1; y++) if (opaque(x, y)) colCounts[x]++;
  const cols = clusters(colCounts, 4, 28, 30).slice(0, COLS.length);
  if (cols.length < COLS.length) { console.error(`행 ${ROWS[r]} 열 ${cols.length}/${COLS.length}`); process.exit(1); }

  for (let c = 0; c < cols.length; c++) {
    // 셀 영역 안에서 정확한 알파 바운딩박스 직접 계산 (sharp trim 회피)
    let minX = W, maxX = 0, minY = H, maxY = 0;
    for (let y = by0; y <= by1; y++) {
      for (let x = cols[c][0]; x <= cols[c][1]; x++) {
        if (opaque(x, y)) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
    }
    const left = Math.max(0, minX - PAD);
    const top = Math.max(0, minY - PAD);
    const width = Math.min(maxX - minX + 1 + PAD * 2, W - left);
    const height = Math.min(maxY - minY + 1 + PAD * 2, H - top);

    const name = `${COLS[c]}-${ROWS[r]}.png`;
    await sharp(SRC).extract({ left, top, width, height }).toFile(`${OUT}/${name}`);
    console.log(`  ✓ ${name}  (${width}x${height})`);
  }
}
console.log("done.");
