// 유채꽃 미니미 스프라이트(front+side) — gpt-image-2(low) 흰배경 생성 → 플러드필 투명화 → 트림.
// 실행: node --env-file=.env.local scripts/gen-yuchae.mjs

import OpenAI from "openai";
import sharp from "sharp";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
if (!process.env.OPENAI_API_KEY) { console.error("OPENAI_API_KEY 없음"); process.exit(1); }

const WHITE = 238;
const base = "Cute chibi girl character with canola/rapeseed flower theme, wearing a bright yellow sundress, long brown hair with a small yellow flower hairpin, big round head small body, friendly smile, soft cel-shaded cartoon with thick clean dark outline, Korean minihompy avatar style. Centered full body with margin. Plain solid pure white background (#ffffff), no shadow, no text, no extra objects.";
const JOBS = [
  { file: "public/minihompy/sprites/yuchae-front.png", prompt: "Standing front view. " + base },
  { file: "public/minihompy/sprites/yuchae-side.png", prompt: "Standing side profile view facing left. " + base },
];

function floodFill(data, w, h) {
  const visited = new Uint8Array(w * h); const stack = [];
  const bg = (i) => data[i] >= WHITE && data[i + 1] >= WHITE && data[i + 2] >= WHITE;
  const push = (x, y) => { if (x < 0 || y < 0 || x >= w || y >= h) return; const p = y * w + x; if (visited[p]) return; visited[p] = 1; if (bg(p * 4)) stack.push(p); };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (stack.length) { const p = stack.pop(); data[p * 4 + 3] = 0; const x = p % w, y = (p / w) | 0; push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1); }
}

for (const j of JOBS) {
  process.stdout.write(`generating ${j.file} ... `);
  try {
    const res = await client.images.generate({ model: "gpt-image-2", prompt: j.prompt, n: 1, size: "1024x1536", quality: "low", background: "opaque" });
    const b64 = res.data?.[0]?.b64_json; if (!b64) throw new Error("no image");
    const { data, info } = await sharp(Buffer.from(b64, "base64")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    floodFill(data, info.width, info.height);
    await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().trim({ threshold: 1 }).toFile(j.file);
    console.log("✓");
  } catch (e) { console.log("FAILED:", e?.message || e); }
}
console.log("done.");
